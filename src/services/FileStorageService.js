import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import localforage from 'localforage';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// IndexedDB stores for resilient local & offline fallback
const uploadStore = localforage.createInstance({
  name: 'BaseOps',
  storeName: 'flight_uploads'
});

const receiptStore = localforage.createInstance({
  name: 'BaseOps',
  storeName: 'receipts_store'
});

function sanitizeFileName(name) {
  return `${Date.now()}_${(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const FileStorageService = {
  // ── Flight Documents ──────────────────────────────────────

  async saveFile(flightId, file) {
    if (!file) throw new Error('No file provided for upload.');
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" exceeds the 15MB size limit.`);
    }

    const safeName = sanitizeFileName(file.name);
    const storagePath = `flights/${flightId || 'general'}/${safeName}`;
    let cloudUrl = null;
    let isCloud = false;

    // 1. Try uploading to Firebase Storage
    if (storage) {
      try {
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file);
        cloudUrl = await getDownloadURL(fileRef);
        isCloud = true;
      } catch (cloudErr) {
        console.warn('Firebase Storage upload failed or not configured, using local storage fallback:', cloudErr);
      }
    }

    // 2. Always store Blob in local IndexedDB for reliability & offline access
    try {
      await uploadStore.setItem(safeName, {
        blob: file,
        name: file.name,
        type: file.type,
        size: file.size,
        flightId: flightId || 'general',
        storagePath,
        cloudUrl,
        uploadedAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Failed to cache file in local IndexedDB:', dbErr);
    }

    // 3. Generate fallback URL if cloud URL was not created
    let localUrl = cloudUrl;
    if (!localUrl) {
      try {
        localUrl = await fileToDataUrl(file);
      } catch {
        localUrl = URL.createObjectURL(file);
      }
    }

    return {
      id: safeName,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      url: localUrl,
      localKey: safeName,
      isCloud,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getFiles(flightId) {
    const combinedFiles = [];
    const seenIds = new Set();

    // 1. Try getting files from Firebase Cloud Storage
    if (storage) {
      try {
        const listRef = ref(storage, `flights/${flightId}`);
        const result = await listAll(listRef);
        const cloudFiles = await Promise.all(
          result.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const name = itemRef.name;
            const parts = name.split('_');
            const originalName = parts.slice(1).join('_') || name;
            seenIds.add(name);
            return {
              id: name,
              name: originalName,
              url,
              storagePath: itemRef.fullPath,
            };
          })
        );
        combinedFiles.push(...cloudFiles);
      } catch (cloudErr) {
        console.warn('Could not list cloud files for flight:', flightId, cloudErr);
      }
    }

    // 2. Also check local IndexedDB for any local uploads for this flight
    try {
      await uploadStore.iterate((value, key) => {
        if (value && (value.flightId === flightId || !flightId) && !seenIds.has(key)) {
          const blobUrl = value.blob ? URL.createObjectURL(value.blob) : (value.cloudUrl || '');
          combinedFiles.push({
            id: key,
            name: value.name || key,
            type: value.type,
            size: value.size,
            url: blobUrl,
            localKey: key,
            storagePath: value.storagePath,
            uploadedAt: value.uploadedAt
          });
        }
      });
    } catch (dbErr) {
      console.warn('Could not read local uploads store:', dbErr);
    }

    return combinedFiles;
  },

  async deleteFile(storagePath, fileObj = null) {
    const key = fileObj?.localKey || fileObj?.id || (storagePath ? storagePath.split('/').pop() : null);
    
    // Delete from IndexedDB
    if (key) {
      try {
        await uploadStore.removeItem(key);
      } catch (e) {
        console.warn('Local delete error:', e);
      }
    }

    // Delete from Firebase Storage
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (cloudErr) {
        console.warn('Cloud delete error:', cloudErr);
      }
    }
  },

  async getFileUrl(storagePath, fileObj = null) {
    const key = fileObj?.localKey || fileObj?.id || (storagePath ? storagePath.split('/').pop() : null);

    // 1. Check local IndexedDB first for fast local retrieval
    if (key) {
      try {
        const localItem = await uploadStore.getItem(key);
        if (localItem && localItem.blob) {
          return URL.createObjectURL(localItem.blob);
        }
      } catch (e) {
        console.warn('IndexedDB retrieval error:', e);
      }
    }

    // 2. If object already has a valid URL
    if (fileObj?.url) {
      return fileObj.url;
    }

    // 3. Try Firebase Storage
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        return await getDownloadURL(fileRef);
      } catch (cloudErr) {
        console.warn('Firebase Storage getFileUrl failed:', cloudErr);
      }
    }

    return '';
  },

  // ── Expense Receipts ──────────────────────────────────────

  async saveReceipt(flightId, expenseId, file) {
    if (!file) throw new Error('No receipt file provided.');
    const fileSize = file.size;
    const fileName = file.name;
    const fileType = file.type || 'application/octet-stream';

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File "${fileName}" exceeds the 15MB size limit.`);
    }

    const safeName = sanitizeFileName(fileName);
    const path = `receipts/${flightId || 'general'}/${expenseId}/${safeName}`;
    let cloudUrl = null;
    let isCloud = false;

    // 1. Try Firebase Storage
    if (storage) {
      try {
        const fileRef = ref(storage, path);
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: fileType });
        await uploadBytes(fileRef, blob);
        cloudUrl = await getDownloadURL(fileRef);
        isCloud = true;
      } catch (cloudErr) {
        console.warn('Firebase Storage receipt upload failed, using local storage fallback:', cloudErr);
      }
    }

    // 2. Save in IndexedDB
    try {
      await receiptStore.setItem(safeName, {
        blob: file,
        name: fileName,
        type: fileType,
        size: fileSize,
        flightId: flightId || 'general',
        expenseId,
        storagePath: path,
        cloudUrl,
        uploadedAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Failed to cache receipt in local IndexedDB:', dbErr);
    }

    // 3. Generate usable URL
    let localUrl = cloudUrl;
    if (!localUrl) {
      try {
        localUrl = await fileToDataUrl(file);
      } catch {
        localUrl = URL.createObjectURL(file);
      }
    }

    return {
      id: safeName,
      name: fileName,
      type: fileType,
      size: fileSize,
      url: localUrl,
      localKey: safeName,
      isCloud,
      storagePath: path,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getReceiptUrl(storagePath, receiptObj = null) {
    const key = receiptObj?.localKey || receiptObj?.id || (storagePath ? storagePath.split('/').pop() : null);

    // 1. Check local IndexedDB
    if (key) {
      try {
        const localItem = await receiptStore.getItem(key);
        if (localItem && localItem.blob) {
          return URL.createObjectURL(localItem.blob);
        }
      } catch (e) {
        console.warn('Receipt IndexedDB retrieval error:', e);
      }
    }

    if (receiptObj?.url) {
      return receiptObj.url;
    }

    // 2. Try Firebase Storage
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        return await getDownloadURL(fileRef);
      } catch (cloudErr) {
        console.warn('Firebase Storage getReceiptUrl failed:', cloudErr);
      }
    }

    return '';
  },

  async deleteReceipt(storagePath, receiptObj = null) {
    const key = receiptObj?.localKey || receiptObj?.id || (storagePath ? storagePath.split('/').pop() : null);
    
    if (key) {
      try {
        await receiptStore.removeItem(key);
      } catch (e) {
        console.warn('Local receipt delete error:', e);
      }
    }

    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (cloudErr) {
        console.warn('Cloud receipt delete error:', cloudErr);
      }
    }
  },

  async getReceipts(flightId, expenseId) {
    const receipts = [];
    const seenIds = new Set();

    if (storage) {
      try {
        const listRef = ref(storage, `receipts/${flightId}/${expenseId}`);
        const result = await listAll(listRef);
        const cloudReceipts = await Promise.all(
          result.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const name = itemRef.name;
            const parts = name.split('_');
            const originalName = parts.slice(1).join('_') || name;
            seenIds.add(name);
            return {
              id: name,
              name: originalName,
              url,
              storagePath: itemRef.fullPath,
            };
          })
        );
        receipts.push(...cloudReceipts);
      } catch {
        // skip cloud list error
      }
    }

    try {
      await receiptStore.iterate((value, key) => {
        if (value && value.flightId === flightId && value.expenseId === expenseId && !seenIds.has(key)) {
          const blobUrl = value.blob ? URL.createObjectURL(value.blob) : (value.cloudUrl || '');
          receipts.push({
            id: key,
            name: value.name || key,
            type: value.type,
            size: value.size,
            url: blobUrl,
            localKey: key,
            storagePath: value.storagePath,
            uploadedAt: value.uploadedAt
          });
        }
      });
    } catch {
      // skip
    }

    return receipts;
  },

  // ── Migration helper: move legacy IndexedDB receipts to Cloud/Unified ────

  async migrateIndexedDBReceipts(flights) {
    let migratedCount = 0;
    try {
      const legacyDb = localforage.createInstance({ name: 'HelicopterScheduler', storeName: 'receipts_store' });

      for (const flight of flights) {
        if (!flight.expenses) continue;
        for (const exp of flight.expenses) {
          if (!exp.receiptFiles || exp.receiptFiles.length === 0) continue;
          for (const receipt of exp.receiptFiles) {
            if (receipt.storagePath && receipt.url) continue;
            if (receipt.fileId) {
              try {
                const fileData = await legacyDb.getItem(receipt.fileId);
                if (fileData && fileData.blob) {
                  const blob = fileData.blob instanceof Blob ? fileData.blob : new Blob([fileData.blob]);
                  const file = new File([blob], receipt.name || 'receipt', { type: receipt.type || blob.type || 'application/octet-stream' });
                  const result = await this.saveReceipt(flight.id, exp.id, file);
                  receipt.storagePath = result.storagePath;
                  receipt.url = result.url;
                  receipt.size = result.size;
                  migratedCount++;
                }
              } catch (e) {
                console.warn(`Failed to migrate receipt ${receipt.fileId}:`, e);
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return migratedCount;
  },

  // ── File Size Validation ──────────────────────────────────

  validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `"${file.name}" is ${sizeMB}MB. Maximum allowed is 15MB.` };
    }
    return { valid: true };
  },

  MAX_FILE_SIZE,
};

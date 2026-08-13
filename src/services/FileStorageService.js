import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeFileName(name) {
  return `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export const FileStorageService = {
  // ── Flight Documents ──────────────────────────────────────

  async saveFile(flightId, file) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" exceeds the 10MB size limit.`);
    }
    const safeName = sanitizeFileName(file.name);
    const fileRef = ref(storage, `flights/${flightId}/${safeName}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return {
      id: safeName,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      storagePath: `flights/${flightId}/${safeName}`,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getFiles(flightId) {
    const listRef = ref(storage, `flights/${flightId}`);
    const result = await listAll(listRef);
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const name = itemRef.name;
        const parts = name.split('_');
        const originalName = parts.slice(1).join('_');
        return {
          id: name,
          name: originalName,
          url,
          storagePath: itemRef.fullPath,
        };
      })
    );
    return files;
  },

  async deleteFile(storagePath) {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  },

  async getFileUrl(storagePath) {
    const fileRef = ref(storage, storagePath);
    return await getDownloadURL(fileRef);
  },

  // ── Expense Receipts ──────────────────────────────────────

  async saveReceipt(flightId, expenseId, file) {
    const fileSize = file.size;
    const fileName = file.name;
    const fileType = file.type;
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File "${fileName}" exceeds the 10MB size limit.`);
    }
    const safeName = sanitizeFileName(fileName);
    const path = `receipts/${flightId}/${expenseId}/${safeName}`;
    const fileRef = ref(storage, path);
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: fileType });
    await uploadBytes(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    return {
      id: safeName,
      name: fileName,
      type: fileType,
      size: fileSize,
      url,
      storagePath: path,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getReceiptUrl(storagePath) {
    const fileRef = ref(storage, storagePath);
    return await getDownloadURL(fileRef);
  },

  async deleteReceipt(storagePath) {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  },

  async getReceipts(flightId, expenseId) {
    const listRef = ref(storage, `receipts/${flightId}/${expenseId}`);
    try {
      const result = await listAll(listRef);
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const name = itemRef.name;
          const parts = name.split('_');
          const originalName = parts.slice(1).join('_');
          return {
            id: name,
            name: originalName,
            url,
            storagePath: itemRef.fullPath,
          };
        })
      );
      return files;
    } catch {
      return [];
    }
  },

  // ── Migration helper: move IndexedDB receipts to Cloud ────

  async migrateIndexedDBReceipts(flights) {
    let migratedCount = 0;
    try {
      const localforage = (await import('localforage')).default;
      const db = localforage.createInstance({ name: 'HelicopterScheduler', storeName: 'receipts_store' });

      for (const flight of flights) {
        if (!flight.expenses) continue;
        for (const exp of flight.expenses) {
          if (!exp.receiptFiles || exp.receiptFiles.length === 0) continue;
          for (const receipt of exp.receiptFiles) {
            // Already migrated (has storagePath)
            if (receipt.storagePath) continue;
            // Try to pull from IndexedDB
            if (receipt.fileId) {
              try {
                const fileData = await db.getItem(receipt.fileId);
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
      // localforage not available, skip migration
    }
    return migratedCount;
  },

  // ── File Size Validation ──────────────────────────────────

  validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `"${file.name}" is ${sizeMB}MB. Maximum allowed is 10MB.` };
    }
    return { valid: true };
  },

  MAX_FILE_SIZE,
};

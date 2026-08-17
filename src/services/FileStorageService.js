import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, getBlob, deleteObject, listAll } from 'firebase/storage';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function sanitizeFileName(name) {
  return `${Date.now()}_${(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export const FileStorageService = {
  // ── Flight Documents ──────────────────────────────────────

  async saveFile(flightId, file) {
    if (!file) throw new Error('No file provided for upload.');
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" exceeds the 15MB size limit.`);
    }
    if (!storage) {
      throw new Error('Firebase Storage is not configured. File upload is not available.');
    }

    const safeName = sanitizeFileName(file.name);
    const storagePath = `flights/${flightId || 'general'}/${safeName}`;

    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    const cloudUrl = await getDownloadURL(fileRef);

    return {
      id: safeName,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      url: cloudUrl,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getFiles(flightId) {
    if (!storage) return [];

    try {
      const listRef = ref(storage, `flights/${flightId}`);
      const result = await listAll(listRef);
      return await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const name = itemRef.name;
          const parts = name.split('_');
          const originalName = parts.slice(1).join('_') || name;
          return {
            id: name,
            name: originalName,
            url,
            storagePath: itemRef.fullPath,
          };
        })
      );
    } catch (cloudErr) {
      console.warn('Could not list cloud files for flight:', flightId, cloudErr);
      return [];
    }
  },

  async deleteFile(storagePath) {
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (cloudErr) {
        console.warn('Cloud delete error:', cloudErr);
      }
    }
  },

  async getFileBlob(storagePath) {
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        const blob = await getBlob(fileRef);
        if (blob) return blob;
      } catch (cloudErr) {
        console.warn('Firebase Storage getBlob failed, trying fetch:', cloudErr);
      }
    }

    if (storage && storagePath) {
      try {
        const url = await getDownloadURL(ref(storage, storagePath));
        const response = await fetch(url);
        if (response.ok) return await response.blob();
      } catch (fetchErr) {
        console.warn('Fetch blob failed:', fetchErr);
      }
    }

    return null;
  },

  async downloadFile(storagePath, fileObj = null, defaultName = 'download') {
    const fileName = fileObj?.name || defaultName;
    const blob = await this.getFileBlob(storagePath);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1500);
      return;
    }

    const url = await this.getFileUrl(storagePath, fileObj);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 1500);
    }
  },

  async getFileUrl(storagePath) {
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
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" exceeds the 15MB size limit.`);
    }
    if (!storage) {
      throw new Error('Firebase Storage is not configured. Receipt upload is not available.');
    }

    const safeName = sanitizeFileName(file.name);
    const path = `receipts/${flightId || 'general'}/${expenseId}/${safeName}`;

    const fileRef = ref(storage, path);
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' });
    await uploadBytes(fileRef, blob);
    const cloudUrl = await getDownloadURL(fileRef);

    return {
      id: safeName,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      url: cloudUrl,
      storagePath: path,
      uploadedAt: new Date().toISOString(),
    };
  },

  async getReceiptUrl(storagePath) {
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

  async deleteReceipt(storagePath) {
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
    if (!storage) return [];

    try {
      const listRef = ref(storage, `receipts/${flightId}/${expenseId}`);
      const result = await listAll(listRef);
      return await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const name = itemRef.name;
          const parts = name.split('_');
          const originalName = parts.slice(1).join('_') || name;
          return {
            id: name,
            name: originalName,
            url,
            storagePath: itemRef.fullPath,
          };
        })
      );
    } catch {
      return [];
    }
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

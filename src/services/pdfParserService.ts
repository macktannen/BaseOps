import type { Vendor } from '../data';

interface PdfjsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
}

interface PdfDocument {
  getPage: (num: number) => Promise<PdfPage>;
}

interface PdfPage {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
}

let pdfjsLib: PdfjsLib | null = null;

async function loadPdfJs(): Promise<PdfjsLib> {
  if (!pdfjsLib) {
    const mod = await import('pdfjs-dist');
    pdfjsLib = mod as unknown as PdfjsLib;
    pdfjsLib!.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  }
  return pdfjsLib!;
}

interface Base64Result {
  base64: string;
  mimeType: string;
}

export async function fileToBase64Image(file: File): Promise<Base64Result> {
  if (!file) throw new Error("No file selected.");

  if (file.type && file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  if ((file.type && file.type === 'application/pdf') || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
    try {
      const lib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      return { base64, mimeType: 'image/png' };
    } catch (pdfErr) {
      console.warn("PDF.js render failed, trying FileReader text fallback", pdfErr);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ base64, mimeType: 'application/pdf' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  throw new Error("Unsupported file format. Please upload a PDF, PNG, JPG, or JPEG.");
}

interface ParsedInvoice {
  vendor: string;
  matchedVendorId: string;
  vendorAddress: string;
  vendorPhone: string;
  vendorEmail: string;
  vendorPoc: string;
  amount: number | string;
  date: string;
  category: string;
  payment: string;
  fuelType: string;
  gallons: number | string;
  invoiceNumber: string;
  description: string;
  autoParsed: boolean;
}

export async function parseInvoiceFile(
  file: File,
  existingVendors: Vendor[] | null = null
): Promise<ParsedInvoice> {
  const { base64, mimeType } = await fileToBase64Image(file);

  const res = await fetch('/api/parse-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType, vendors: existingVendors || [] })
  });

  if (!res.ok) {
    let errorText = 'Failed to parse invoice.';
    try {
      const errData = await res.json();
      errorText = errData.error || errorText;
    } catch {}
    throw new Error(errorText);
  }

  return res.json();
}

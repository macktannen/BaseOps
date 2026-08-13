import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

/**
 * Convert a File object (.pdf, .jpg, .png, .jpeg) into Base64 string and mime type
 */
export async function fileToBase64Image(file) {
  if (!file) throw new Error("No file selected.");

  // Direct image handling
  if (file.type && file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // PDF handling using Canvas rendering via pdfjs-dist
  if ((file.type && file.type === 'application/pdf') || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Render first page of invoice

      const viewport = page.getViewport({ scale: 2.0 }); // High res for OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
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
          const result = reader.result;
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

/**
 * Parses an invoice/receipt file using Google Gemini Vision API and returns structured JSON
 */
export async function parseInvoiceFile(file, customApiKey = null) {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  
  if (!apiKey) {
    throw new Error("Gemini API key is required. Please set VITE_GEMINI_API_KEY in your environment or enter it in Settings.");
  }

  const { base64, mimeType } = await fileToBase64Image(file);

  // Retrieve existing vendors from localStorage or mockVendors to pass to AI prompt for matching
  let existingVendors = [];
  try {
    const rawStored = localStorage.getItem('userVendors');
    if (rawStored !== null) {
      existingVendors = JSON.parse(rawStored);
    } else {
      const { mockVendors } = await import('../data');
      existingVendors = mockVendors;
    }
  } catch {}

  const vendorListContext = existingVendors.map(v => 
    `- [ID: ${v.vendorId || v.id}] Name: "${v.name}" | Category: "${v.category || ''}" | Address: "${v.address || ''}"`
  ).join('\n');

  const promptText = `
Analyze this invoice or receipt image carefully. Be CONSERVATIVE - only fill in fields you are confident about. Leave fields as empty string or null if unsure.

CURRENT VENDOR LIST IN APP:
${vendorListContext}

Extract the expense details into a valid JSON object matching this schema:
{
  "vendor": "String - Match with an existing vendor from the CURRENT VENDOR LIST above if possible (return vendor name or vendor ID). If NO existing vendor matches, provide the full business/company/FBO name, title, or airport FBO name from the receipt so a new vendor can be created.",
  "matchedVendorId": "String or null - If you matched an existing vendor from the list above, return its ID (e.g. SIG, AVF, V-100). Otherwise null.",
  "vendorAddress": "String - Full street address, city, state, zip code, or airport facility location of vendor if visible anywhere on receipt. Be thorough.",
  "vendorPhone": "String - Main telephone or customer service phone number of vendor if visible on receipt.",
  "vendorEmail": "String - Email address or website domain of vendor if visible anywhere on receipt.",
  "vendorPoc": "String - Representative, agent, cashier, customer service contact, manager name, or point of contact listed on receipt.",
  "amount": null or Number - The TOTAL invoice/receipt amount as a number (e.g. 1420.50). Use null if you cannot determine the total.
  "date": "String or null - Transaction date in YYYY-MM-DD format. Use null if not clearly visible.",
  "category": "String - MUST be one of these exact values: Catering, Cleaning / Detailing, Crew Meal, Customs / Border Fees, De-icing, Fuel, GPU / Start Cart, Ground Transportation, Handling, Hangar / Storage, Hotel, Landing Fee, Lavatory Service, Maintenance / Repairs, Navigation / Overflight, Oil / Fluids, Oxygen Service, Ramp Fee, Tie-down / Parking, Wi-Fi / Data, Other. If none match well, you may suggest a new category name.",
  "payment": "String or null - ONLY use one of: Avcard, Avfuel, World Fuel, Direct Bill, Titan, Company Card, Personal Card, Other. Use null if payment method is not clearly shown.",
  "fuelType": "String or null - ONLY if this is a FUEL invoice, use one of: Avfuel, AEG, Atlantic, Everest, EVO, FBO, Phillip66, Signature, Titan, World Fuel, CAA, Other. Use null if this is not a fuel invoice or fuel supplier is not identifiable.",
  "gallons": null or Number - ONLY if this is a fuel invoice, extract the fuel quantity in gallons as a number. Use null if not a fuel invoice or quantity not shown.",
  "invoiceNumber": "String - Receipt or invoice reference number if visible, or empty string",
  "description": "String - Brief summary of line items (e.g. 250 gal Jet-A @ $5.68/gal + Ramp Fee)"
}

IMPORTANT RULES FOR VENDOR IDENTIFICATION:
- Use all available context: look for header titles, company logos/names, airport facility/FBO names, addresses, phone numbers, emails, websites, cashier/POC names anywhere on the document.
- First check if it matches any vendor in CURRENT VENDOR LIST above. If it does, set "vendor" to that vendor's Name and "matchedVendorId" to its ID.
- If it does NOT match any vendor in the list, extract ALL vendor details to the maximum extent:
  * "vendorAddress": Include full street, city, state, zip or airport LZ location visible.
  * "vendorPhone": Extract phone number if shown.
  * "vendorEmail": Extract email address or domain if shown.
  * "vendorPoc": Extract cashier, agent, manager, or point of contact name if shown.

Return ONLY raw JSON, with no markdown formatting.
`;

  const requestBody = {
    contents: [{
      parts: [
        { text: promptText },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64
          }
        }
      ]
    }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1
    }
  };

  const candidateEndpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  ];

  let response = null;
  let lastErrorText = '';

  for (const ep of candidateEndpoints) {
    try {
      const res = await fetch(`${ep}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (res.status === 404 || res.status === 429) {
        const errBody = await res.clone().text().catch(() => '');
        if (res.status === 404 || errBody.includes('limit: 0')) {
          lastErrorText = errBody || `Model unavailable at ${ep}`;
          continue;
        }
      }
      response = res;
      break;
    } catch(fetchErr) {
      lastErrorText = fetchErr.message;
    }
  }

  if (!response || !response.ok) {
    const rawErr = response ? await response.text() : lastErrorText;
    if (rawErr.includes('API_KEY_INVALID') || rawErr.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please generate a new free key at aistudio.google.com.');
    }
    throw new Error(`API Key Connection Error: Please verify your key at aistudio.google.com.`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedJson);

  return {
    vendor: parsed.vendor || '',
    matchedVendorId: parsed.matchedVendorId || '',
    vendorAddress: parsed.vendorAddress || '',
    vendorPhone: parsed.vendorPhone || '',
    vendorEmail: parsed.vendorEmail || '',
    vendorPoc: parsed.vendorPoc || '',
    amount: parsed.amount != null ? (typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount)) : '',
    date: parsed.date || '',
    category: parsed.category || '',
    payment: parsed.payment || '',
    fuelType: parsed.fuelType || '',
    gallons: parsed.gallons != null ? parsed.gallons : '',
    invoiceNumber: parsed.invoiceNumber || '',
    description: parsed.description || '',
    autoParsed: true
  };
}

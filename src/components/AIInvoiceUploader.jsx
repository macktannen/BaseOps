import React, { useState } from 'react';
import { Sparkles, Loader2, Key, X, AlertCircle } from 'lucide-react';
import { parseInvoiceFile } from '../services/pdfParserService';
import { useData } from '../contexts/DataProvider';

const AIInvoiceUploader = ({ onExpenseParsed, buttonStyle = {}, compact = false }) => {
  const { gemini_api_key, updateData, userVendors } = useData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(gemini_api_key || '');
  const [pendingFile, setPendingFile] = useState(null);

  const getActiveApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || gemini_api_key;
  };

  const processFileWithKey = async (file, apiKey) => {
    setIsProcessing(true);
    setError(null);
    try {
      const parsedData = await parseInvoiceFile(file, apiKey, userVendors);
      // Attach the original file so the expense handler can auto-upload it as a receipt
      parsedData._originalFile = file;
      if (onExpenseParsed) {
        onExpenseParsed(parsedData);
      }
    } catch (err) {
      console.error("Invoice parsing failed:", err);
      setError(err.message || "Failed to extract expense details from PDF.");
    } finally {
      setIsProcessing(false);
      setPendingFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = getActiveApiKey();
    if (!key) {
      setPendingFile(file);
      setShowKeyModal(true);
      return;
    }

    processFileWithKey(file, key);
    e.target.value = ''; // Reset input
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    const cleanKey = apiKeyInput.trim();
    updateData('gemini_api_key', cleanKey);
    setShowKeyModal(false);

    if (pendingFile) {
      processFileWithKey(pendingFile, cleanKey);
    }
  };

  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <input
          type="file"
          id={`ai-pdf-input-${compact ? 'compact' : 'full'}`}
          accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
        <label
          htmlFor={`ai-pdf-input-${compact ? 'compact' : 'full'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: compact ? '5px 10px' : '8px 14px',
            borderRadius: '6px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            fontWeight: 'bold',
            fontSize: compact ? '0.75rem' : '0.82rem',
            cursor: isProcessing ? 'wait' : 'pointer',
            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.25)',
            transition: 'all 0.15s ease',
            opacity: isProcessing ? 0.7 : 1,
            userSelect: 'none',
            ...buttonStyle
          }}
          title="Upload receipt or invoice PDF to auto-fill expense fields using AI"
        >
          {isProcessing ? (
            <>
              <Loader2 size={compact ? 14 : 16} className="animate-spin" />
              <span>Reading PDF...</span>
            </>
          ) : (
            <>
              <Sparkles size={compact ? 14 : 16} />
              <span>Auto-Fill Expense</span>
            </>
          )}
        </label>
        {error && (
          <div style={{ fontSize: '0.7rem', color: '#e53e3e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>

      {/* Modal for setting Gemini API Key if missing */}
      {showKeyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '24px',
            width: '100%', maxWidth: '440px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowKeyModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#f3e8ff', padding: '8px', borderRadius: '50%', color: '#8b5cf6' }}>
                <Key size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Gemini AI API Key Required</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4a5568', lineHeight: '1.4', marginBottom: '16px' }}>
              To auto-read PDF invoices and receipts for free, enter your Google Gemini API key.
              You can get a 100% free key at <strong>aistudio.google.com</strong> (no credit card required).
            </p>

            <form onSubmit={handleSaveApiKey}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  style={{
                    width: '100%', padding: '10px', borderRadius: '6px',
                    border: '1px solid var(--border-color)', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save & Process Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIInvoiceUploader;

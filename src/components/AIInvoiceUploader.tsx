import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { parseInvoiceFile } from '../services/pdfParserService';
import { useData } from '../contexts/DataProvider';

const AIInvoiceUploader = ({ onExpenseParsed, onProcessingStart, buttonStyle = {}, compact = false }) => {
  const { userVendors } = useData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const processFile = async (file) => {
    setIsProcessing(true);
    setError(null);
    try {
      const parsedData = await parseInvoiceFile(file, userVendors);
      parsedData._originalFile = file;
      if (onExpenseParsed) {
        onExpenseParsed(parsedData);
      }
    } catch (err) {
      console.error("Invoice parsing failed:", err);
      setError(err.message || "Failed to extract expense details from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onProcessingStart) onProcessingStart();
    processFile(file);
    e.target.value = '';
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
    </>
  );
};

export default AIInvoiceUploader;

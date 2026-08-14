import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Check, Save, X, Upload, FileText, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { FileStorageService } from '../services/FileStorageService';
import AIInvoiceUploader from './AIInvoiceUploader';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';

const ALL_CATEGORIES = [
  'Catering', 'Cleaning / Detailing', 'Crew Meal', 'Customs / Border Fees', 
  'De-icing', 'Fuel', 'GPU / Start Cart', 'Ground Transportation', 'Handling', 
  'Hangar / Storage', 'Hotel', 'Landing Fee', 'Lavatory Service', 'Maintenance / Repairs', 
  'Navigation / Overflight', 'Oil / Fluids', 'Oxygen Service', 'Ramp Fee', 
  'Tie-down / Parking', 'Wi-Fi / Data', 'Other'
];

const CategoryCombobox = ({ value, onChange, options, style, isMobile }) => {
  const [isTyping, setIsTyping] = useState(false);
  const isCustom = value && !options.includes(value);

  if (isTyping || isCustom) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <input 
          autoFocus={isTyping && !value}
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          onFocus={e => e.target.select()}
          placeholder="Type category..."
          style={{ ...style, paddingRight: '24px', boxSizing: 'border-box' }}
        />
        <button 
          onClick={() => { setIsTyping(false); onChange(''); }}
          title="Clear and select from list"
          style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    isMobile ? (
      <MobileDropdownMenu
        value={value || ''}
        onChange={val => {
          if (val === '___CUSTOM___') {
            setIsTyping(true);
            onChange('');
          } else {
            onChange(val);
          }
        }}
        options={[...options.map(opt => ({ value: opt, label: opt })), { value: '___CUSTOM___', label: '+ Custom Category...' }]}
        placeholder="Select a Category"
        style={style}
      />
    ) : (
      <select 
        value={value || ''} 
        onChange={e => {
          if (e.target.value === '___CUSTOM___') {
            setIsTyping(true);
            onChange('');
          } else {
            onChange(e.target.value);
          }
        }} 
        style={{ ...style, cursor: 'pointer' }}
      >
        <option value="" disabled>Select a Category</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="___CUSTOM___" style={{ fontWeight: 'bold', color: '#3182ce' }}>+ Custom Category...</option>
      </select>
    )
  );
};

const ExpensesTab = ({ expenses, setExpenses, legs = [], aircraftId = '', vendorsList = [], flightDate = '', flight = null }) => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef(null);
  const [uploadingExpId, setUploadingExpId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [viewingExpId, setViewingExpId] = useState(null);
  const [loadedReceipts, setLoadedReceipts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const persistExpensesToFlight = (updatedExpenses) => {
    if (!flight) return;
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      if (!Array.isArray(storedFlights) || storedFlights.length === 0) return;

      const targetId = flight.id ? String(flight.id) : null;
      const targetFlightNumber = flight.flightNumber ? String(flight.flightNumber) : null;

      let found = false;
      const updatedFlights = storedFlights.map(f => {
        const isMatch = (targetId && String(f.id) === targetId) ||
                        (targetFlightNumber && String(f.flightNumber) === targetFlightNumber);
        if (isMatch) {
          found = true;
          return { ...f, expenses: updatedExpenses };
        }
        return f;
      });

      if (found) {
        localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error("Failed to persist expenses to localStorage", e);
    }
  };

  const handleHeaderClick = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedExpenses = useMemo(() => {
    if (!sortConfig.key) return expenses;
    const sorted = [...expenses];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * (sortConfig.direction === 'asc' ? 1 : -1);
      }
      return aVal.toString().localeCompare(bVal.toString()) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
    return sorted;
  }, [expenses, sortConfig]);

  useEffect(() => {
    if (viewingExpId && viewingExpId !== 'demo') {
      const exp = expenses.find(x => x.id === viewingExpId);
      if (exp && exp.receiptFiles && exp.receiptFiles.length > 0) {
        const loadFiles = async () => {
          const files = await Promise.all(
            exp.receiptFiles.map(async (f) => {
              if (f.storagePath || f.localKey || f.url) {
                try {
                  const url = await FileStorageService.getReceiptUrl(f.storagePath, f);
                  return { ...f, url: url || f.url };
                } catch {
                  return { ...f, url: f.url || null, error: f.url ? null : 'Failed to load receipt.' };
                }
              }
              if (f.fileId) {
                try {
                  const localforage = (await import('localforage')).default;
                  const db = localforage.createInstance({ name: 'HelicopterScheduler', storeName: 'receipts_store' });
                  const fileData = await db.getItem(f.fileId);
                  if (fileData && fileData.blob) {
                    const blob = fileData.blob instanceof Blob ? fileData.blob : new Blob([fileData.blob]);
                    if (flight && exp.id) {
                      const file = new File([blob], f.name || 'receipt', { type: f.type || 'application/octet-stream' });
                      const result = await FileStorageService.saveReceipt(flight.id, exp.id, file);
                      return { ...f, storagePath: result.storagePath, url: result.url, size: result.size };
                    }
                    return { ...f, url: URL.createObjectURL(blob) };
                  }
                } catch { /* ignore */ }
              }
              return { ...f, url: null, error: 'File not found.' };
            })
          );
          setLoadedReceipts(files);
        };
        loadFiles();
      } else {
        setLoadedReceipts([]);
      }
    }
  }, [viewingExpId, expenses, flight]);

  useEffect(() => {
    if (!viewingExpId) {
      setLoadedReceipts([]);
    }
  }, [viewingExpId]);
  
  const expenseFrequencies = useMemo(() => {
    const freqs = { vendor: {}, category: {}, payer: {}, fuelType: {} };
    let allStoredExpenses = [];
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      storedFlights.forEach(f => {
        if (f.expenses && Array.isArray(f.expenses)) {
          allStoredExpenses.push(...f.expenses);
        }
      });
    } catch {}
    
    const combined = [...allStoredExpenses, ...(expenses || [])];
    combined.forEach(e => {
      if (e.vendor) freqs.vendor[e.vendor] = (freqs.vendor[e.vendor] || 0) + 1;
      if (e.category) freqs.category[e.category] = (freqs.category[e.category] || 0) + 1;
      if (e.payer) freqs.payer[e.payer] = (freqs.payer[e.payer] || 0) + 1;
      if (e.fuelType) freqs.fuelType[e.fuelType] = (freqs.fuelType[e.fuelType] || 0) + 1;
    });
    return freqs;
  }, [expenses]);

  const sortByUsageThenAlpha = (items, freqMap, getName = (item) => item) => {
    return [...items].sort((a, b) => {
      const nameA = getName(a) || '';
      const nameB = getName(b) || '';
      const freqA = freqMap[nameA] || 0;
      const freqB = freqMap[nameB] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return nameA.localeCompare(nameB);
    });
  };

  const sortedCategories = useMemo(() => {
    const allSet = new Set([...ALL_CATEGORIES, ...Object.keys(expenseFrequencies.category)]);
    return sortByUsageThenAlpha(Array.from(allSet), expenseFrequencies.category);
  }, [expenseFrequencies]);

  const sortedVendors = useMemo(() => {
    return sortByUsageThenAlpha(vendorsList || [], expenseFrequencies.vendor, v => v.vendorId || v.name);
  }, [vendorsList, expenseFrequencies]);

  const sortedPayers = useMemo(() => {
    const defaultPayers = ['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'];
    const allSet = new Set([...defaultPayers, ...Object.keys(expenseFrequencies.payer)]);
    return sortByUsageThenAlpha(Array.from(allSet), expenseFrequencies.payer);
  }, [expenseFrequencies]);

  const sortedFuelTypes = useMemo(() => {
    const defaultFuelTypes = ['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'];
    const allSet = new Set([...defaultFuelTypes, ...Object.keys(expenseFrequencies.fuelType)]);
    return sortByUsageThenAlpha(Array.from(allSet), expenseFrequencies.fuelType);
  }, [expenseFrequencies]);

  const flightAirports = useMemo(() => {
    const apts = new Set();
    legs.forEach(leg => {
      if (leg.departure) apts.add(typeof leg.departure === 'string' ? leg.departure : leg.departure.id);
      if (leg.destination) apts.add(typeof leg.destination === 'string' ? leg.destination : leg.destination.id);
    });
    return Array.from(apts).filter(Boolean);
  }, [legs]);
  const defaultDate = flightDate || new Date().toISOString().split('T')[0];

  const handleAdd = () => {
    const newExp = { id: Date.now(), category: '', vendor: '', amount: '', description: '', date: defaultDate, payer: '', location: flightAirports[0] || '', fuelType: '', gallons: '', purchaser: aircraftId, receiptCount: 0, _dirty: true, _saved: false };
    const next = [...expenses, newExp];
    setExpenses(next);
    persistExpensesToFlight(next);
  };

  const handleAutoFillParsedExpense = async (parsedData) => {
    const defaultPayers = ['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'];
    const defaultFuelTypes = ['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'];

    const validCategory = parsedData.category || '';
    const allPayers = new Set([...defaultPayers, ...Object.keys(expenseFrequencies.payer)]);
    const validPayer = parsedData.payment && allPayers.has(parsedData.payment) ? parsedData.payment : '';

    let validFuelType = '';
    let validGallons = '';
    if (validCategory === 'Fuel') {
      const allFuelTypes = new Set([...defaultFuelTypes, ...Object.keys(expenseFrequencies.fuelType)]);
      validFuelType = parsedData.fuelType && allFuelTypes.has(parsedData.fuelType) ? parsedData.fuelType : 'FBO';
      validGallons = parsedData.gallons != null && parsedData.gallons !== '' ? parsedData.gallons : '';
    }

    let finalVendorName = parsedData.vendor || '';
    if (parsedData.vendor && parsedData.vendor.trim()) {
      try {
        const rawStored = localStorage.getItem('userVendors');
        let currentVendors = [];
        if (rawStored !== null) {
          currentVendors = JSON.parse(rawStored);
        } else {
          const { mockVendors } = await import('../data');
          currentVendors = mockVendors;
        }

        const rawVendorInput = parsedData.vendor.trim().toLowerCase();
        const matchedVendorId = (parsedData.matchedVendorId || '').toLowerCase();

        const matchedVendor = currentVendors.find(v => {
          const vId = (v.id || '').toLowerCase();
          const vVendorId = (v.vendorId || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          return (
            (matchedVendorId && (vId === matchedVendorId || vVendorId === matchedVendorId)) ||
            vName === rawVendorInput ||
            (vVendorId && vVendorId === rawVendorInput)
          );
        });

        if (matchedVendor) {
          finalVendorName = matchedVendor.vendorId || matchedVendor.name;
        } else {
          const cleanName = parsedData.vendor.trim();
          const newVendorId = cleanName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10).toUpperCase();
          const newVendorObj = {
            id: `V-${Date.now()}`,
            vendorId: newVendorId,
            name: cleanName,
            category: validCategory || 'Other',
            address: parsedData.vendorAddress || '',
            phone: parsedData.vendorPhone || '',
            email: parsedData.vendorEmail || '',
            poc: parsedData.vendorPoc || ''
          };
          const updatedVendorsList = [...currentVendors, newVendorObj];
          localStorage.setItem('userVendors', JSON.stringify(updatedVendorsList));
          window.dispatchEvent(new Event('storage'));
          finalVendorName = newVendorObj.vendorId || cleanName;
        }
      } catch(e) { console.warn('Vendor matching/creation error:', e); }
    }

    let receiptFiles = [];
    let receiptCount = 0;

    const newExpId = Date.now();
    const flightId = flight?.id || 'flight_' + Date.now();

    if (parsedData._originalFile) {
      try {
        const validation = FileStorageService.validateFileSize(parsedData._originalFile);
        if (!validation.valid) {
          setUploadError(validation.error);
        } else {
          const result = await FileStorageService.saveReceipt(flightId, newExpId, parsedData._originalFile);
          receiptFiles = [{ storagePath: result.storagePath, name: parsedData._originalFile.name, type: parsedData._originalFile.type, size: result.size, url: result.url }];
          receiptCount = 1;
        }
      } catch(e) { console.warn('Receipt upload error:', e); setUploadError(e.message); }
    }

    const newExp = {
      id: newExpId,
      category: validCategory,
      vendor: finalVendorName,
      amount: parsedData.amount !== '' && parsedData.amount != null ? parsedData.amount : '',
      description: parsedData.invoiceNumber ? `[Inv #${parsedData.invoiceNumber}] ${parsedData.description || ''}` : (parsedData.description || ''),
      date: parsedData.date || defaultDate,
      payer: validPayer,
      location: flightAirports[0] || '',
      fuelType: validFuelType,
      gallons: validGallons,
      purchaser: aircraftId,
      receiptFiles,
      receiptCount,
      hasReceipt: receiptCount > 0,
      autoParsed: true,
      _dirty: false,
      _saved: true
    };

    const nextExpenses = [...expenses, newExp];
    setExpenses(nextExpenses);
    persistExpensesToFlight(nextExpenses);
  };

  const handleUpdate = (id, field, value) => {
    const updated = expenses.map(e => e.id === id ? { ...e, [field]: value, _dirty: true } : e);
    setExpenses(updated);
    persistExpensesToFlight(updated);
  };

  const handleSaveRow = (id) => {
    const updatedExpenses = expenses.map(e => e.id === id ? { ...e, _dirty: false, _saved: true } : e);
    setExpenses(updatedExpenses);
    persistExpensesToFlight(updatedExpenses);
  };

  const handleRemove = (id) => {
    const updatedExpenses = expenses.filter(e => e.id !== id);
    setExpenses(updatedExpenses);
    persistExpensesToFlight(updatedExpenses);
  };

  const handleDeleteReceipt = async (expId, fileIndex) => {
    if (expId === 'demo') return;
    const exp = expenses.find(x => x.id === expId);
    if (!exp) return;
    const currentFiles = exp.receiptFiles || [];
    const fileToDelete = currentFiles[fileIndex];
    
    if (fileToDelete) {
      try {
        await FileStorageService.deleteReceipt(fileToDelete.storagePath, fileToDelete);
      } catch (err) {
        console.error("Failed to delete receipt", err);
      }
    }

    const newFiles = currentFiles.filter((_, idx) => idx !== fileIndex);
    
    setExpenses(prev => prev.map(e => e.id === expId ? {
      ...e,
      receiptFiles: newFiles,
      receiptCount: newFiles.length,
      hasReceipt: newFiles.length > 0
    } : e));
    
    if (viewingExpId === expId) {
      setLoadedReceipts(prev => prev.filter((_, idx) => idx !== fileIndex));
      if (newFiles.length === 0) setViewingExpId(null);
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      let url = receipt.url;
      if (!url && receipt.storagePath) {
        url = await FileStorageService.getReceiptUrl(receipt.storagePath, receipt);
      }
      if (!url) return;

      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.name || 'receipt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = receipt.name || 'receipt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = receipt.name || 'receipt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleUploadReceipts = async (files, expId) => {
    if (!expId) return;
    const flightId = flight?.id || 'flight_' + Date.now();
    setUploadError(null);
    setUploadProgress('Uploading...');

    try {
      const newFiles = await Promise.all(
        Array.from(files).map(async (f) => {
          const validation = FileStorageService.validateFileSize(f);
          if (!validation.valid) {
            setUploadError(validation.error);
            return null;
          }
          const result = await FileStorageService.saveReceipt(flightId, expId, f);
          return {
            storagePath: result.storagePath,
            name: f.name,
            type: f.type,
            size: result.size,
            url: result.url
          };
        })
      );

      const validFiles = newFiles.filter(Boolean);
      if (validFiles.length === 0) {
        setUploadProgress(null);
        return;
      }

      const updatedExpenses = expenses.map(e => {
        if (e.id === expId) {
          const currentFiles = e.receiptFiles || [];
          const combined = [...currentFiles, ...validFiles];
          return { ...e, receiptFiles: combined, receiptCount: combined.length, hasReceipt: true };
        }
        return e;
      });

      setExpenses(updatedExpenses);
      persistExpensesToFlight(updatedExpenses);

      setUploadingExpId(null);
      setUploadProgress(null);
      setViewingExpId(expId);
    } catch (err) {
      console.error("Upload error", err);
      setUploadError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(null);
    }
  };

  const isRowFilled = (exp) => {
    return exp.vendor || exp.category || exp.location || exp.amount || exp.description || exp.payer || exp.fuelType || exp.gallons;
  };

  const isRowValid = (exp) => {
    if (!isRowFilled(exp)) return true;
    return exp.vendor && exp.category && exp.location && (exp.amount !== '' && exp.amount != null);
  };

  const getStyle = (exp, field, baseStyle = inputStyle) => {
    if (!isRowFilled(exp)) return baseStyle;
    let isMissing = false;
    if (field === 'vendor') isMissing = !exp.vendor;
    else if (field === 'category') isMissing = !exp.category;
    else if (field === 'location') isMissing = !exp.location;
    else if (field === 'amount') isMissing = (exp.amount === '' || exp.amount == null);
    
    return { ...baseStyle, border: isMissing ? '1px solid #e53e3e' : baseStyle.border, backgroundColor: isMissing ? '#fff5f5' : (baseStyle.backgroundColor || 'transparent') };
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalGallons = expenses.reduce((sum, e) => sum + (parseFloat(e.gallons) || 0), 0);

  const tdStyle = { padding: '4px', verticalAlign: 'middle' };
  const inputStyle = { width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.75rem' };

  return (
    <div style={{ padding: '20px', display: 'block', minHeight: '100%', overflowY: 'auto', backgroundColor: '#fff' }}>
      {uploadError && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c53030', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{uploadError}</span>
          <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c53030' }}><X size={14} /></button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="expense-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1400px' }}>
          <thead>
            <tr>
              <th style={{ width: '30px', padding: '8px' }}></th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('date')}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('vendor')}>Vendor</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('category')}>Category</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('payer')}>Payment</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('location')}>Airport / Location</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('fuelType')}>Fuel</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, width: '60px', cursor: 'pointer' }} onClick={() => handleHeaderClick('gallons')}>Gal</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('purchaser')}>Purchaser</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.75rem', color: '#718096', fontWeight: 500, width: '80px', cursor: 'pointer' }} onClick={() => handleHeaderClick('amount')}>Amount</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: '#718096', fontWeight: 500, cursor: 'pointer' }} onClick={() => handleHeaderClick('description')}>Notes</th>
              <th style={{ width: '60px', padding: '8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(sortedExpenses || []).map(exp => {
              const valid = isRowValid(exp);
              const filled = isRowFilled(exp);
              const hasReceipts = exp.receiptCount > 0 || exp.hasReceipt || (exp.receiptFiles && exp.receiptFiles.length > 0);
              return (
                <tr key={exp.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={() => { 
                          if (hasReceipts) { 
                            setViewingExpId(exp.id); 
                          } else { 
                            setUploadingExpId(exp.id); 
                            fileInputRef.current?.click(); 
                          } 
                        }} 
                        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: hasReceipts ? '#3182ce' : '#e53e3e', padding: '4px', display: 'flex', alignItems: 'center' }} 
                        title="Upload Receipt"
                      >
                        <FileText size={24} />
                        {(exp.receiptCount > 1) && (
                          <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#e53e3e', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {exp.receiptCount}
                          </div>
                        )}
                      </button>
                      <button type="button" onClick={() => handleRemove(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: '4px', display: 'flex', alignItems: 'center' }} title="Remove Expense">
                        <X size={20} />
                      </button>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input type="date" value={exp.date || ''} onChange={e => handleUpdate(exp.id, 'date', e.target.value)} onFocus={e => e.target.select()} style={inputStyle} />
                  </td>
                  <td style={{ padding: '0 4px', width: '12%' }}>
                    {isMobile ? (
                      <MobileDropdownMenu
                        value={exp.vendor || ''}
                        onChange={val => handleUpdate(exp.id, 'vendor', val)}
                        options={[{ value: '', label: 'Vendor' }, ...sortedVendors.map(v => ({ value: v.vendorId || v.name, label: v.vendorId || v.name }))]}
                        placeholder="Vendor"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <select
                        value={exp.vendor || ''}
                        onChange={(e) => handleUpdate(exp.id, 'vendor', e.target.value)}
                        style={getStyle(exp, 'vendor', { width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem' })}
                      >
                        <option value="">Vendor</option>
                        {sortedVendors.map(v => (
                          <option key={v.id} value={v.vendorId || v.name}>{v.vendorId || v.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <CategoryCombobox 
                      value={exp.category} 
                      onChange={val => handleUpdate(exp.id, 'category', val)} 
                      options={sortedCategories}
                      style={getStyle(exp, 'category', inputStyle)} 
                      isMobile={isMobile}
                    />
                  </td>
                  <td style={tdStyle}>
                    {isMobile ? (
                      <MobileDropdownMenu
                        value={exp.payer || ''}
                        onChange={val => handleUpdate(exp.id, 'payer', val)}
                        options={[{ value: '', label: 'Select Payment' }, ...sortedPayers.map(pOpt => ({ value: pOpt, label: pOpt }))]}
                        placeholder="Select Payment"
                      />
                    ) : (
                      <select value={exp.payer || ''} onChange={e => handleUpdate(exp.id, 'payer', e.target.value)} style={{ ...inputStyle, color: exp.payer ? 'inherit' : '#a0aec0' }}>
                        <option value="" disabled>Select Payment</option>
                        {sortedPayers.map(pOpt => (
                          <option key={pOpt} value={pOpt}>{pOpt}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isMobile ? (
                      <MobileDropdownMenu
                        value={exp.location || ''}
                        onChange={val => handleUpdate(exp.id, 'location', val)}
                        options={[{ value: '', label: 'Select Airport' }, ...flightAirports.map(apt => ({ value: apt, label: apt }))]}
                        placeholder="Select Airport"
                      />
                    ) : (
                      <select value={exp.location || ''} onChange={e => handleUpdate(exp.id, 'location', e.target.value)} style={getStyle(exp, 'location', { ...inputStyle, color: exp.location ? 'inherit' : '#a0aec0' })}>
                        <option value="" disabled>Select Airport</option>
                        {flightAirports.map(apt => (
                          <option key={apt} value={apt}>{apt}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isMobile ? (
                      <MobileDropdownMenu
                        value={exp.fuelType || ''}
                        onChange={val => handleUpdate(exp.id, 'fuelType', val)}
                        options={[{ value: '', label: '-- Select Fuel --' }, ...sortedFuelTypes.map(fOpt => ({ value: fOpt, label: fOpt }))]}
                        placeholder="-- Select Fuel --"
                      />
                    ) : (
                      <select value={exp.fuelType || ''} onChange={e => handleUpdate(exp.id, 'fuelType', e.target.value)} style={{ ...inputStyle, color: exp.fuelType ? 'inherit' : '#a0aec0' }}>
                        <option value="">-- Select Fuel --</option>
                        {sortedFuelTypes.map(fOpt => (
                          <option key={fOpt} value={fOpt}>{fOpt}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <input type="number" step="1" value={exp.gallons || ''} onChange={e => handleUpdate(exp.id, 'gallons', e.target.value ? parseInt(e.target.value, 10) : '')} onFocus={e => e.target.select()} style={{ ...inputStyle, textAlign: 'center' }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="text" value={exp.purchaser || ''} onChange={e => handleUpdate(exp.id, 'purchaser', e.target.value)} onFocus={e => e.target.select()} placeholder="Purchaser" style={inputStyle} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" step="0.01" value={exp.amount || ''} onChange={e => handleUpdate(exp.id, 'amount', e.target.value ? parseFloat(e.target.value) : '')} onFocus={e => e.target.select()} style={getStyle(exp, 'amount', { ...inputStyle, textAlign: 'right' })} />
                  </td>
                  <td style={tdStyle}>
                    <input type="text" value={exp.description || ''} onChange={e => handleUpdate(exp.id, 'description', e.target.value)} onFocus={e => e.target.select()} placeholder="Notes" style={inputStyle} />
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    {exp._dirty || (!exp._saved && exp._saved !== undefined) || (!exp.autoParsed && !exp._saved && (exp.vendor || exp.amount || exp.category)) ? (
                      <button 
                        type="button" 
                        onClick={() => handleSaveRow(exp.id)} 
                        style={{ background: '#3182ce', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                        title="Click to Save changes to this expense line"
                      >
                        <Save size={14} />
                      </button>
                    ) : filled && valid ? (
                      <Check size={18} color="#48bb78" title="Expense saved" />
                    ) : (
                      <button type="button" onClick={handleAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} title="Add expense">
                        <Plus size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {(expenses && expenses.length > 0) && (
              <tr>
                <td colSpan="7" style={{ padding: '12px 12px 12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '0.875rem', color: '#2d3748' }}>Total:</td>
                <td style={{ padding: '12px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem', color: '#2d3748' }}>
                  {totalGallons > 0 ? totalGallons : ''}
                </td>
                <td></td>
                <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.875rem', color: '#2d3748' }}>
                  ${totalAmount.toFixed(2)}
                </td>
                <td colSpan="2"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ padding: '15px', borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-start', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          onClick={handleAdd} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <Plus size={16} /> Add Expense
        </button>

        <AIInvoiceUploader onExpenseParsed={handleAutoFillParsedExpense} />
        
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files.length > 0 && uploadingExpId) {
              handleUploadReceipts(e.target.files, uploadingExpId);
            }
            e.target.value = '';
          }}
          multiple
        />
      </div>

      {viewingExpId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #edf2f7', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--primary-color)" /> Receipt Viewer
              </h3>
              <button onClick={() => setViewingExpId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#edf2f7' }}>
              {uploadProgress && (
                <div style={{ padding: '12px', backgroundColor: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#2b6cb0' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}
              {(() => {
                if (loadedReceipts.length === 0 && !uploadProgress) return <div style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No receipts found for this expense.</div>;
                
                return loadedReceipts.map((file, idx) => (
                  <div key={idx} style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '10px 15px', backgroundColor: '#2d3748', color: 'white', fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        {file.size && <span style={{ fontSize: '0.7rem', opacity: 0.7, flexShrink: 0 }}>{(file.size / 1024).toFixed(0)}KB</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleDownloadReceipt(file)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#90cdf4', display: 'flex', alignItems: 'center', padding: '4px' }}
                          title="Download Receipt"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteReceipt(viewingExpId, idx)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fc8181', display: 'flex', alignItems: 'center', padding: '4px' }} 
                          title="Delete Receipt"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', backgroundColor: '#f7fafc', minHeight: '200px' }}>
                      {file.error ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53e3e', padding: '40px', flexDirection: 'column', gap: '8px' }}>
                          <AlertCircle size={24} />
                          <span>{file.error}</span>
                        </div>
                      ) : file.type?.startsWith('image/') && file.url ? (
                        <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
                      ) : file.type === 'application/pdf' && file.url ? (
                        <iframe src={file.url} width="100%" height="500px" style={{ border: 'none' }} title={file.name} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', padding: '40px' }}>
                          Preview not available for this file type.
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            <div style={{ padding: '15px 20px', borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => {
                  setUploadingExpId(viewingExpId);
                  fileInputRef.current?.click();
                }} 
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Upload size={16} /> Upload Additional
              </button>
              <button onClick={() => setViewingExpId(null)} className="btn btn-primary">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesTab;

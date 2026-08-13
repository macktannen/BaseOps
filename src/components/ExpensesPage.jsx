import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Search, Calendar, FileText, Building, Plus, Trash2, Edit2, Check, X, BarChart3, Paperclip, Download } from 'lucide-react';
import { mockVendors, mockAccounts } from '../data';
import EventModal from './EventModal';
import AIInvoiceUploader from './AIInvoiceUploader';
import ExpensesDashboard from './ExpensesDashboard';
import { FileStorageService } from '../services/FileStorageService';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';

const getCategoryColor = (category) => {
  if (!category) return { bg: '#edf2f7', text: '#4a5568' };
  const presets = {
    'FBO': { bg: '#ebf8ff', text: '#2b6cb0' },
    'Fuel Provider': { bg: '#fff5f5', text: '#c53030' },
    'Fuel': { bg: '#fff5f5', text: '#c53030' },
    'Lodging': { bg: '#faf5ff', text: '#6b46c1' },
    'Hotel': { bg: '#faf5ff', text: '#6b46c1' },
    'Catering': { bg: '#f0fff4', text: '#2f855a' },
    'Crew Meal': { bg: '#f0fff4', text: '#2f855a' },
    'Handling': { bg: '#fffff0', text: '#975a16' },
    'Landing Fee': { bg: '#e6fffa', text: '#285e61' },
    'Other': { bg: '#edf2f7', text: '#4a5568' }
  };
  if (presets[category]) return presets[category];
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return { bg: `hsl(${hue}, 85%, 90%)`, text: `hsl(${hue}, 85%, 25%)` };
};

const DEPARTMENT_ID = '__DEPARTMENT__';

const ExpensesPage = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Expenses State
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Modal State for Flight Card
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Receipt Viewer State
  const [viewingExpense, setViewingExpense] = useState(null);
  const [loadedReceipts, setLoadedReceipts] = useState([]);

  // Manual Expense Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [flightsList, setFlightsList] = useState([]);
  const emptyManualForm = {
    flightId: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    category: '',
    payer: '',
    location: '',
    fuelType: '',
    gallons: '',
    purchaser: '',
    amount: '',
    description: ''
  };
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [editingDeptExpenseId, setEditingDeptExpenseId] = useState(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleHeaderClick = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };
  // Vendors State
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editForm, setEditForm] = useState({ vendorId: '', name: '', category: '', address: '', phone: '', email: '', poc: '' });

  const loadExpensesData = () => {
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      setFlightsList(storedFlights);
      let allExpenses = [];
      storedFlights.forEach(flight => {
        if (flight.expenses && flight.expenses.length > 0) {
          flight.expenses.forEach(exp => {
            allExpenses.push({
              ...exp,
              flightId: flight.id,
              flightNumber: flight.flightNumber || 'Unknown',
              flightTitle: flight.title || 'Untitled',
              flightDate: flight.date || exp.date,
              flightAircraft: flight.aircraftId || '',
              flightAccount: flight.accountId || '',
              isPaid: exp.isPaid || false
            });
          });
        }
      });
      try {
        const deptExpenses = JSON.parse(localStorage.getItem('departmentExpenses') || '[]');
        deptExpenses.forEach(exp => {
          allExpenses.push({
            ...exp,
            flightId: DEPARTMENT_ID,
            flightNumber: 'Department',
            flightTitle: '',
            flightDate: exp.date,
            flightAircraft: '',
            flightAccount: '',
            isDepartment: true,
            isPaid: exp.isPaid || false
          });
        });
      } catch { /* ignore */ }
      allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(allExpenses);
    } catch (e) { console.error("Error loading expenses", e); }
  };

  useEffect(() => {
    loadExpensesData();

    // Load Vendors
    try {
      const storedVendors = JSON.parse(localStorage.getItem('userVendors'));
      if (storedVendors && storedVendors.length > 0) setVendors(storedVendors);
      else setVendors(mockVendors);
    } catch { setVendors(mockVendors); }

    // Load Accounts
    try {
      const storedAccounts = JSON.parse(localStorage.getItem('userAccounts'));
      if (storedAccounts && storedAccounts.length > 0) setAccounts(storedAccounts);
      else setAccounts(mockAccounts);
    } catch { setAccounts(mockAccounts); }
  }, []);

  // Listen for storage events to refresh expenses when line-level saves occur
  useEffect(() => {
    const handleStorageSync = () => {
      loadExpensesData();
      try {
        const storedVendors = JSON.parse(localStorage.getItem('userVendors'));
        if (storedVendors && storedVendors.length > 0) setVendors(storedVendors);
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => {
    if (!viewingExpense) {
      setLoadedReceipts([]);
      return;
    }
    const files = viewingExpense.receiptFiles || [];
    if (files.length === 0) {
      setLoadedReceipts([]);
      return;
    }
    const loadFiles = async () => {
      const loaded = await Promise.all(
        files.map(async (f) => {
          if (f.storagePath) {
            try {
              const url = await FileStorageService.getReceiptUrl(f.storagePath);
              return { ...f, url };
            } catch {
              return { ...f, url: null, error: 'Failed to load' };
            }
          }
          if (f.url) return f;
          return { ...f, url: null, error: 'File not found' };
        })
      );
      setLoadedReceipts(loaded);
    };
    loadFiles();
  }, [viewingExpense]);

  const handleDeleteReceipt = async (fileIndex) => {
    if (!viewingExpense) return;
    const files = viewingExpense.receiptFiles || [];
    const fileToDelete = files[fileIndex];
    if (fileToDelete && fileToDelete.storagePath) {
      try { await FileStorageService.deleteReceipt(fileToDelete.storagePath); } catch {}
    }
    const newFiles = files.filter((_, idx) => idx !== fileIndex);
    const updatedExpenses = expenses.map(e => {
      if (e.id === viewingExpense.id && e.flightId === viewingExpense.flightId) {
        return { ...e, receiptFiles: newFiles, receiptCount: newFiles.length, hasReceipt: newFiles.length > 0 };
      }
      return e;
    });
    setExpenses(updatedExpenses);
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      const flightIdx = storedFlights.findIndex(f => String(f.id) === String(viewingExpense.flightId));
      if (flightIdx >= 0) {
        const expIdx = storedFlights[flightIdx].expenses.findIndex(e => e.id === viewingExpense.id);
        if (expIdx >= 0) {
          storedFlights[flightIdx].expenses[expIdx] = { ...storedFlights[flightIdx].expenses[expIdx], receiptFiles: newFiles, receiptCount: newFiles.length, hasReceipt: newFiles.length > 0 };
          localStorage.setItem('userFlights', JSON.stringify(storedFlights));
        }
      }
    } catch {}
    setLoadedReceipts(prev => prev.filter((_, idx) => idx !== fileIndex));
    if (newFiles.length === 0) setViewingExpense(null);
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      let url = receipt.url;
      if (!url && receipt.storagePath) url = await FileStorageService.getReceiptUrl(receipt.storagePath);
      if (!url) return;
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
    } catch (err) { console.error("Download failed:", err); }
  };

  const handleOpenFlightCard = (exp) => {
    if (exp.isDepartment || exp.flightId === DEPARTMENT_ID) {
      handleOpenDepartmentExpense(exp);
      return;
    }
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      const flight = storedFlights.find(f => String(f.id) === String(exp.flightId));
      if (flight) {
        setSelectedFlight(flight);
        setIsModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFlight = (flightData) => {
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      const updatedFlights = storedFlights.map(f => f.id === flightData.id ? flightData : f);
      localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
      loadExpensesData();
    } catch (e) {
      console.error(e);
    }
  };

  const saveVendors = (newVendors) => {
    setVendors(newVendors);
    localStorage.setItem('userVendors', JSON.stringify(newVendors));
  };

  const handleAddVendor = () => {
    const newVendor = { id: `V-${Date.now()}`, vendorId: '', name: '', category: '', address: '', phone: '', email: '', poc: '' };
    saveVendors([...vendors, newVendor]);
    setEditingVendorId(newVendor.id);
    setEditForm({ vendorId: '', name: '', category: '', address: '', phone: '', email: '', poc: '' });
  };

  const handleDeleteVendor = (id) => {
    saveVendors(vendors.filter(v => v.id !== id));
  };

  const vendorRefKey = (v) => ((v?.vendorId || v?.name) || '').trim();

  const remapVendorInExpenses = (oldKey, newKey) => {
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      let flightsChanged = false;
      storedFlights.forEach(flight => {
        if (flight.expenses && flight.expenses.length > 0) {
          flight.expenses.forEach(exp => {
            if ((exp.vendor || '').trim() === oldKey) {
              exp.vendor = newKey;
              flightsChanged = true;
            }
          });
        }
      });
      if (flightsChanged) {
        localStorage.setItem('userFlights', JSON.stringify(storedFlights));
      }

      let deptExpenses = [];
      try { deptExpenses = JSON.parse(localStorage.getItem('departmentExpenses') || '[]'); } catch { deptExpenses = []; }
      let deptChanged = false;
      deptExpenses.forEach(exp => {
        if ((exp.vendor || '').trim() === oldKey) {
          exp.vendor = newKey;
          deptChanged = true;
        }
      });
      if (deptChanged) {
        localStorage.setItem('departmentExpenses', JSON.stringify(deptExpenses));
      }

      if (flightsChanged || deptChanged) {
        window.dispatchEvent(new Event('storage'));
        loadExpensesData();
      }
    } catch (err) {
      console.error('Failed to remap vendor in expenses:', err);
    }
  };

  const handleSaveVendor = () => {
    const originalVendor = vendors.find(v => v.id === editingVendorId);
    if (!originalVendor) {
      setEditingVendorId(null);
      return;
    }

    const oldKey = vendorRefKey(originalVendor);
    const updatedVendor = { ...originalVendor, ...editForm };
    const newKey = vendorRefKey(updatedVendor);

    saveVendors(vendors.map(v => v.id === editingVendorId ? updatedVendor : v));

    if (oldKey && newKey && oldKey !== newKey) {
      remapVendorInExpenses(oldKey, newKey);
    } else {
      window.dispatchEvent(new Event('storage'));
      loadExpensesData();
    }

    setEditingVendorId(null);
  };

  const filteredExpenses = expenses.filter(e => {
    const searchLower = search.toLowerCase();
    // Combine searchable fields into one string
    const searchable = `${e.description || ''} ${e.flightNumber || ''} ${e.flightTitle || ''} ${e.vendor || ''} ${e.category || ''} ${e.location || ''} ${e.payer || ''} ${e.amount || ''} ${e.date || ''} ${e.flightDate || ''}`.toLowerCase();
    const matchesSearch =
      searchable.includes(searchLower) ||
      (searchLower.includes('paid') && e.isPaid) ||
      (searchLower.includes('unpaid') && !e.isPaid);
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Sorted expenses based on column
  const sortedExpenses = useMemo(() => {
    if (!sortConfig.key) return filteredExpenses;
    const sorted = [...filteredExpenses];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === undefined) aVal = '';
      if (bVal === undefined) bVal = '';
      if (sortConfig.key === 'amount') {
        return (parseFloat(aVal) - parseFloat(bVal)) * (sortConfig.direction === 'asc' ? 1 : -1);
      }
      if (sortConfig.key === 'date') {
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
      return aVal.toString().localeCompare(bVal.toString()) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
    return sorted;
  }, [filteredExpenses, sortConfig]);

  const handleTogglePaid = (expId, flightId, newPaidStatus) => {
    setExpenses(prev => prev.map(e => (e.id === expId && e.flightId === flightId) ? { ...e, isPaid: newPaidStatus } : e));
    try {
      if (flightId === DEPARTMENT_ID) {
        const deptExpenses = JSON.parse(localStorage.getItem('departmentExpenses') || '[]');
        const deptIndex = deptExpenses.findIndex(e => e.id === expId);
        if (deptIndex >= 0) {
          deptExpenses[deptIndex].isPaid = newPaidStatus;
          localStorage.setItem('departmentExpenses', JSON.stringify(deptExpenses));
        }
        return;
      }
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      const flightIndex = storedFlights.findIndex(f => f.id === flightId);
      if (flightIndex >= 0) {
        const flight = storedFlights[flightIndex];
        const expIndex = flight.expenses.findIndex(e => e.id === expId);
        if (expIndex >= 0) {
          flight.expenses[expIndex].isPaid = newPaidStatus;
          localStorage.setItem('userFlights', JSON.stringify(storedFlights));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPaid = filteredExpenses.reduce((sum, e) => sum + (e.isPaid ? parseFloat(e.amount || 0) : 0), 0);
  const totalUnpaid = filteredExpenses.reduce((sum, e) => sum + (!e.isPaid ? parseFloat(e.amount || 0) : 0), 0);
  const totalReceipts = filteredExpenses.reduce((sum, e) => sum + (e.receiptCount || (e.receiptFiles && e.receiptFiles.length) || 0), 0);
  const categories = [
    'All', 'Catering', 'Cleaning / Detailing', 'Crew Meal', 'Customs / Border Fees', 
    'De-icing', 'Fuel', 'GPU / Start Cart', 'Ground Transportation', 'Handling', 
    'Hangar / Storage', 'Hotel', 'Landing Fee', 'Lavatory Service', 'Maintenance / Repairs', 
    'Navigation / Overflight', 'Oil / Fluids', 'Oxygen Service', 'Ramp Fee', 
    'Tie-down / Parking', 'Wi-Fi / Data', 'Other'
  ];

  const handleGlobalAutoFillParsedExpense = async (parsedData) => {
    try {
      const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
      if (storedFlights.length === 0) {
        alert(`Parsed Expense: ${parsedData.vendor} - $${parsedData.amount}\n(No flights found to attach expense to. Please create a flight first).`);
        return;
      }
      
      const defaultPayers = ['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'];
      const defaultFuelTypes = ['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'];

      // Validate payment against known payers
      const validPayer = parsedData.payment && defaultPayers.includes(parsedData.payment) ? parsedData.payment : '';

      // Fuel logic
      let validFuelType = '';
      let validGallons = '';
      const validCategory = parsedData.category || '';
      if (validCategory === 'Fuel') {
        validFuelType = parsedData.fuelType && defaultFuelTypes.includes(parsedData.fuelType) ? parsedData.fuelType : 'FBO';
        validGallons = parsedData.gallons != null && parsedData.gallons !== '' ? parsedData.gallons : '';
      }

      // Intelligent Vendor Matching & Creation
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

          // 1. Try to find exact match among existing vendors (by ID, vendorId, or exact name)
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
            // 2. Create a new vendor if no existing match was found
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
        } catch(e) { console.warn('Vendor creation error:', e); }
      }

      const targetFlight = storedFlights[0];

      // Auto-upload document as receipt
      let receiptFiles = [];
      let receiptCount = 0;
      if (parsedData._originalFile && targetFlight) {
        try {
          const { FileStorageService } = await import('../services/FileStorageService');
          const newExpId = Date.now();
          const result = await FileStorageService.saveReceipt(targetFlight.id, newExpId, parsedData._originalFile);
          receiptFiles = [{ storagePath: result.storagePath, name: parsedData._originalFile.name, type: parsedData._originalFile.type, size: result.size, url: result.url }];
          receiptCount = 1;
        } catch(e) { console.warn('Receipt upload error:', e); }
      }

      const newExp = {
        id: newExpId,
        category: validCategory,
        vendor: finalVendorName,
        amount: parsedData.amount !== '' && parsedData.amount != null ? parsedData.amount : '',
        description: parsedData.invoiceNumber ? `[Inv #${parsedData.invoiceNumber}] ${parsedData.description || ''}` : (parsedData.description || ''),
        date: parsedData.date || targetFlight.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        payer: validPayer,
        location: '',
        fuelType: validFuelType,
        gallons: validGallons,
        purchaser: targetFlight.aircraftId || '',
        receiptFiles,
        receiptCount,
        hasReceipt: receiptCount > 0,
        isPaid: false,
        autoParsed: true
      };

      if (!targetFlight.expenses) targetFlight.expenses = [];
      targetFlight.expenses.unshift(newExp);

      localStorage.setItem('userFlights', JSON.stringify(storedFlights));
      window.dispatchEvent(new Event('storage'));
      loadExpensesData();

      alert(`✨ Successfully parsed invoice!\nAdded ${parsedData.amount ? '$' + parsedData.amount : 'expense'} (${parsedData.vendor || 'Unknown'}) to Flight #${targetFlight.flightNumber || targetFlight.id}.`);
    } catch(err) {
      console.error("Global auto-fill error:", err);
    }
  };

  const handleOpenManualModal = () => {
    setEditingDeptExpenseId(null);
    setManualForm({ ...emptyManualForm, flightId: '' });
    setIsManualModalOpen(true);
  };

  const handleOpenDepartmentExpense = (exp) => {
    setEditingDeptExpenseId(exp.id);
    setManualForm({
      flightId: '',
      date: exp.date || '',
      vendor: exp.vendor || '',
      category: exp.category || '',
      payer: exp.payer || '',
      location: exp.location || '',
      fuelType: exp.fuelType || '',
      gallons: exp.gallons != null ? exp.gallons : '',
      purchaser: exp.purchaser || '',
      amount: exp.amount != null ? exp.amount : '',
      description: exp.description || ''
    });
    setIsManualModalOpen(true);
  };

  const handleManualFieldChange = (field, value) => {
    setManualForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveManualExpense = async () => {
    try {
      const isDepartment = !manualForm.flightId;

      let targetFlight = null;
      let storedFlights = [];
      if (!isDepartment) {
        storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
        targetFlight = storedFlights.find(f => String(f.id) === String(manualForm.flightId));
        if (!targetFlight) {
          alert('Selected flight could not be found.');
          return;
        }
      }

      const validCategory = manualForm.category || '';
      let validFuelType = '';
      let validGallons = '';
      if (validCategory === 'Fuel') {
        validFuelType = manualForm.fuelType || '';
        validGallons = manualForm.gallons != null && manualForm.gallons !== '' ? manualForm.gallons : '';
      }

      let finalVendorName = manualForm.vendor || '';
      if (manualForm.vendor && manualForm.vendor.trim()) {
        try {
          const rawStored = localStorage.getItem('userVendors');
          let currentVendors = [];
          if (rawStored !== null) {
            currentVendors = JSON.parse(rawStored);
          } else {
            const { mockVendors } = await import('../data');
            currentVendors = mockVendors;
          }

          const rawVendorInput = manualForm.vendor.trim().toLowerCase();
          const matchedVendor = currentVendors.find(v => {
            const vVendorId = (v.vendorId || '').toLowerCase();
            const vName = (v.name || '').toLowerCase();
            return vName === rawVendorInput || (vVendorId && vVendorId === rawVendorInput);
          });

          if (matchedVendor) {
            finalVendorName = matchedVendor.vendorId || matchedVendor.name;
          } else {
            const cleanName = manualForm.vendor.trim();
            const newVendorId = cleanName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10).toUpperCase();
            const newVendorObj = {
              id: `V-${Date.now()}`,
              vendorId: newVendorId,
              name: cleanName,
              category: validCategory || 'Other',
              address: '',
              phone: '',
              email: '',
              poc: ''
            };
            const updatedVendorsList = [...currentVendors, newVendorObj];
            localStorage.setItem('userVendors', JSON.stringify(updatedVendorsList));
            window.dispatchEvent(new Event('storage'));
            finalVendorName = newVendorObj.vendorId || cleanName;
          }
        } catch (e) { console.warn('Vendor creation error:', e); }
      }

      const isEditing = editingDeptExpenseId != null;
      let deptExpenses = [];
      try { deptExpenses = JSON.parse(localStorage.getItem('departmentExpenses') || '[]'); } catch { deptExpenses = []; }

      const formAmount = manualForm.amount !== '' && manualForm.amount != null ? manualForm.amount : '';

      if (isEditing) {
        const existing = deptExpenses.find(e => e.id === editingDeptExpenseId);
        if (!existing) {
          alert('This expense could not be found. It may have been deleted.');
          return;
        }

        const updatedFields = {
          category: validCategory,
          vendor: finalVendorName,
          amount: formAmount,
          description: manualForm.description || '',
          date: manualForm.date || existing.date || new Date().toISOString().split('T')[0],
          payer: manualForm.payer || '',
          location: manualForm.location || '',
          fuelType: validFuelType,
          gallons: validGallons,
          purchaser: manualForm.purchaser || (targetFlight ? targetFlight.aircraftId : '') || ''
        };

        if (isDepartment) {
          const updatedDept = deptExpenses.map(e => e.id === editingDeptExpenseId ? { ...e, ...updatedFields } : e);
          localStorage.setItem('departmentExpenses', JSON.stringify(updatedDept));
        } else {
          const remainingDept = deptExpenses.filter(e => e.id !== editingDeptExpenseId);
          localStorage.setItem('departmentExpenses', JSON.stringify(remainingDept));
          const movedExp = { ...existing, ...updatedFields };
          if (!targetFlight.expenses) targetFlight.expenses = [];
          targetFlight.expenses.unshift(movedExp);
          localStorage.setItem('userFlights', JSON.stringify(storedFlights));
        }
      } else {
        const newExp = {
          id: Date.now(),
          category: validCategory,
          vendor: finalVendorName,
          amount: formAmount,
          description: manualForm.description || '',
          date: manualForm.date || (targetFlight ? targetFlight.date?.split('T')[0] : null) || new Date().toISOString().split('T')[0],
          payer: manualForm.payer || '',
          location: manualForm.location || '',
          fuelType: validFuelType,
          gallons: validGallons,
          purchaser: manualForm.purchaser || (targetFlight ? targetFlight.aircraftId : '') || '',
          receiptFiles: [],
          receiptCount: 0,
          hasReceipt: false,
          isPaid: false
        };

        if (isDepartment) {
          deptExpenses.unshift(newExp);
          localStorage.setItem('departmentExpenses', JSON.stringify(deptExpenses));
        } else {
          if (!targetFlight.expenses) targetFlight.expenses = [];
          targetFlight.expenses.unshift(newExp);
          localStorage.setItem('userFlights', JSON.stringify(storedFlights));
        }
      }

      window.dispatchEvent(new Event('storage'));
      loadExpensesData();

      setIsManualModalOpen(false);
      setEditingDeptExpenseId(null);
      setManualForm(emptyManualForm);
    } catch (err) {
      console.error("Manual expense save error:", err);
    }
  };

  const handleDeleteDepartmentExpense = () => {
    if (editingDeptExpenseId == null) return;
    if (!window.confirm('Delete this department expense? This cannot be undone.')) return;
    try {
      let deptExpenses = [];
      try { deptExpenses = JSON.parse(localStorage.getItem('departmentExpenses') || '[]'); } catch { deptExpenses = []; }
      const remaining = deptExpenses.filter(e => e.id !== editingDeptExpenseId);
      localStorage.setItem('departmentExpenses', JSON.stringify(remaining));
      window.dispatchEvent(new Event('storage'));
      loadExpensesData();
      setIsManualModalOpen(false);
      setEditingDeptExpenseId(null);
      setManualForm(emptyManualForm);
    } catch (err) {
      console.error("Delete department expense error:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <DollarSign size={16} /> Expenses Overview
          </button>
          <button 
            className={`btn ${activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('vendors')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Building size={16} /> Vendor Management
          </button>
          <button 
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <BarChart3 size={16} /> Expenses Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AIInvoiceUploader onExpenseParsed={handleGlobalAutoFillParsedExpense} />
          <button
            type="button"
            onClick={handleOpenManualModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3182ce',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(49, 130, 206, 0.25)',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
            title="Manually add an expense to a flight"
          >
            <Plus size={16} />
            <span>Manual Expense</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#e6fffa', borderRadius: '50%', color: '#319795' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Expenses</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totalAmount.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f0fff4', borderRadius: '50%', color: '#38a169' }}>
                <Check size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Paid</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38a169' }}>${totalPaid.toFixed(2)}</div>
              </div>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#fff5f5', borderRadius: '50%', color: '#e53e3e' }}>
                <X size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Unpaid</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53e3e' }}>${totalUnpaid.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#edf2f7', borderRadius: '50%', color: 'var(--primary-color)' }}>
                <Paperclip size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Receipts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalReceipts}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <input 
                  type="text" 
                  placeholder="Search by flight, vendor, notes..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Category:</span>
                {isMobile ? (
                  <MobileDropdownMenu
                    value={filterCategory}
                    onChange={val => setFilterCategory(val)}
                    options={categories.map(c => ({ value: c, label: c }))}
                    placeholder="Category"
                  />
                ) : (
                  <select 
                    value={filterCategory} 
                    onChange={e => setFilterCategory(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', minWidth: '150px' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="data-table expenses-table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('date')}>Date</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('flightNumber')}>Trip</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('flightAircraft')}>Aircraft</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('flightAccount')}>Account</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('vendor')}>Vendor</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('category')}>Category</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('payer')}>Payment</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('fuelType')}>Fuel Provider</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('purchaser')}>Purchaser</th>
                    <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleHeaderClick('description')}>Notes</th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleHeaderClick('receiptCount')}>Receipt</th>
                    <th style={{ padding: '12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleHeaderClick('isPaid')}>Paid</th>
                    <th style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleHeaderClick('amount')}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="13" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No expenses found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedExpenses.map((exp, i) => (
                      <tr key={`${exp.id}-${i}`} onClick={() => handleOpenFlightCard(exp)} style={{ cursor: 'pointer' }}>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="var(--text-muted)" />
                            {exp.date}
                          </div>
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{exp.flightNumber}</span>
                          {exp.flightTitle ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{exp.flightTitle}</span>
                          ) : null}
                        </td>
                        <td style={{ padding: '12px' }}>{exp.flightAircraft || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          {(() => {
                            if (!exp.flightAccount) return '-';
                            const act = accounts.find(a => a.id === exp.flightAccount || a.name === exp.flightAccount);
                            return act ? act.name : exp.flightAccount;
                          })()}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 500 }}>
                          {(() => {
                            const foundVendor = vendors.find(v => v.vendorId === exp.vendor || v.name === exp.vendor);
                            return foundVendor?.name || exp.vendor || '-';
                          })()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, 
                            backgroundColor: getCategoryColor(exp.category).bg, 
                            color: getCategoryColor(exp.category).text 
                          }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{exp.payer || '-'}</td>
                        <td style={{ padding: '12px' }}>{exp.fuelType || '-'}</td>
                        <td style={{ padding: '12px' }}>{exp.purchaser || '-'}</td>
                        <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                          {exp.description || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {(exp.receiptCount > 0 || exp.hasReceipt || (exp.receiptFiles && exp.receiptFiles.length > 0)) ? (
                            <button
                              onClick={() => setViewingExpense(exp)}
                              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#3182ce', padding: '4px', display: 'inline-flex', alignItems: 'center' }}
                              title={`${exp.receiptCount || (exp.receiptFiles && exp.receiptFiles.length) || 1} receipt(s) — click to view`}
                            >
                              <Paperclip size={16} />
                              {(exp.receiptCount > 1 || (exp.receiptFiles && exp.receiptFiles.length > 1)) && (
                                <span style={{ position: 'absolute', top: '-6px', right: '-8px', backgroundColor: '#e53e3e', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {exp.receiptCount || exp.receiptFiles.length}
                                </span>
                              )}
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e0' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={exp.isPaid || false} 
                            onChange={(e) => handleTogglePaid(exp.id, exp.flightId, e.target.checked)}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                          ${parseFloat(exp.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vendors' && (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={20} color="var(--primary-color)" /> Manage Vendors
            </h3>
            <button className="btn btn-primary" onClick={handleAddVendor} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Vendor
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '1000px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px' }}>Vendor ID</th>
                  <th style={{ padding: '12px' }}>Vendor Name</th>
                  <th style={{ padding: '12px' }}>Point of Contact</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Address</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="ID (e.g. SIG)"
                          value={editForm.vendorId} 
                          onChange={e => setEditForm({ ...editForm, vendorId: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '4px' }}
                        />
                      ) : (
                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{v.vendorId || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="Vendor Name"
                          value={editForm.name} 
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '4px' }}
                        />
                      ) : (
                        <div style={{ fontWeight: 500 }}>{v.name}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="Point of Contact"
                          value={editForm.poc} 
                          onChange={e => setEditForm({ ...editForm, poc: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{v.poc || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="Phone Number"
                          value={editForm.phone} 
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{v.phone || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="email" 
                          placeholder="Email"
                          value={editForm.email} 
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{v.email || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="Address"
                          value={editForm.address} 
                          onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{v.address || '-'}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <input 
                          type="text" 
                          placeholder="Category"
                          value={editForm.category} 
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                          style={{ padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
                          backgroundColor: getCategoryColor(v.category || 'Other').bg, 
                          color: getCategoryColor(v.category || 'Other').text 
                        }}>
                          {v.category || 'Other'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'top' }}>
                      {editingVendorId === v.id ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button onClick={handleSaveVendor} style={{ background: 'none', border: 'none', color: '#38a169', cursor: 'pointer' }}><Check size={18} /></button>
                          <button onClick={() => setEditingVendorId(null)} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button onClick={() => { setEditingVendorId(v.id); setEditForm({ vendorId: v.vendorId || '', name: v.name, category: v.category, address: v.address || '', phone: v.phone || '', email: v.email || '', poc: v.poc || '' }); }} style={{ background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteVendor(v.id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <ExpensesDashboard expenses={expenses} vendors={vendors} accounts={accounts} />
      )}

      {isModalOpen && selectedFlight && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFlight(null);
          }}
          onSave={handleSaveFlight}
          onDelete={(flightId) => {
            try {
              const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
              const updatedFlights = storedFlights.filter(f => f.id !== flightId);
              localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
              setIsModalOpen(false);
              setSelectedFlight(null);
              loadExpensesData();
            } catch (e) { console.error(e); }
          }}
          flight={selectedFlight}
          defaultActiveView="Expenses"
        />
      )}

      {isManualModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '24px',
            width: '100%', maxWidth: '560px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
            <button
              onClick={() => { setIsManualModalOpen(false); setEditingDeptExpenseId(null); }}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#ebf8ff', padding: '8px', borderRadius: '50%', color: '#3182ce' }}>
                {editingDeptExpenseId != null ? <Edit2 size={20} /> : <Plus size={20} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{editingDeptExpenseId != null ? 'Edit Department Expense' : 'Add Manual Expense'}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Trip</label>
                {isMobile ? (
                  <MobileDropdownMenu
                    value={manualForm.flightId}
                    onChange={val => handleManualFieldChange('flightId', val)}
                    options={[
                      { value: '', label: 'Department (no flight)' },
                      ...flightsList.map(f => ({
                        value: String(f.id),
                        label: `#${f.flightNumber || f.id} — ${f.title || 'Untitled'} (${(f.date || '').split('T')[0]})`
                      }))
                    ]}
                    placeholder="Select trip"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <select
                    value={manualForm.flightId}
                    onChange={(e) => handleManualFieldChange('flightId', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="">Department (no flight)</option>
                    {flightsList.map(f => (
                      <option key={f.id} value={String(f.id)}>
                        #{f.flightNumber || f.id} — {f.title || 'Untitled'} ({(f.date || '').split('T')[0]})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => handleManualFieldChange('date', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualForm.amount}
                  onChange={(e) => handleManualFieldChange('amount', e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Vendor</label>
                <input
                  type="text"
                  list="manual-vendor-options"
                  value={manualForm.vendor}
                  onChange={(e) => handleManualFieldChange('vendor', e.target.value)}
                  placeholder="Vendor name"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <datalist id="manual-vendor-options">
                  {vendors.map(v => <option key={v.id} value={v.vendorId || v.name} />)}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Category</label>
                {isMobile ? (
                  <MobileDropdownMenu
                    value={manualForm.category}
                    onChange={val => handleManualFieldChange('category', val)}
                    options={[{ value: '', label: 'Select category' }, ...categories.filter(c => c !== 'All').map(c => ({ value: c, label: c }))]}
                    placeholder="Select category"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <select
                    value={manualForm.category}
                    onChange={(e) => handleManualFieldChange('category', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="">Select category</option>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Payment</label>
                {isMobile ? (
                  <MobileDropdownMenu
                    value={manualForm.payer}
                    onChange={val => handleManualFieldChange('payer', val)}
                    options={[{ value: '', label: 'Select payment' }, ...['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'].map(p => ({ value: p, label: p }))]}
                    placeholder="Select payment"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <select
                    value={manualForm.payer}
                    onChange={(e) => handleManualFieldChange('payer', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="">Select payment</option>
                    {['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Location</label>
                <input
                  type="text"
                  value={manualForm.location}
                  onChange={(e) => handleManualFieldChange('location', e.target.value)}
                  placeholder="Airport / location"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {manualForm.category === 'Fuel' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Fuel Provider</label>
                    {isMobile ? (
                      <MobileDropdownMenu
                        value={manualForm.fuelType}
                        onChange={val => handleManualFieldChange('fuelType', val)}
                        options={[{ value: '', label: 'Select provider' }, ...['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'].map(ft => ({ value: ft, label: ft }))]}
                        placeholder="Select provider"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <select
                        value={manualForm.fuelType}
                        onChange={(e) => handleManualFieldChange('fuelType', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      >
                        <option value="">Select provider</option>
                        {['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'].map(ft => <option key={ft} value={ft}>{ft}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Gallons</label>
                    <input
                      type="number"
                      step="1"
                      value={manualForm.gallons}
                      onChange={(e) => handleManualFieldChange('gallons', e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Purchaser</label>
                <input
                  type="text"
                  value={manualForm.purchaser}
                  onChange={(e) => handleManualFieldChange('purchaser', e.target.value)}
                  placeholder="Purchaser"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>Notes</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => handleManualFieldChange('description', e.target.value)}
                  placeholder="Description / notes"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <div>
                {editingDeptExpenseId != null && (
                  <button
                    type="button"
                    onClick={handleDeleteDepartmentExpense}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #feb2b2', backgroundColor: '#fff5f5', color: '#c53030', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setIsManualModalOpen(false); setEditingDeptExpenseId(null); }}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualExpense}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3182ce', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} /> {editingDeptExpenseId != null ? 'Save Changes' : 'Save Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingExpense && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #edf2f7', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--primary-color)" /> Receipts — {viewingExpense.vendor || 'Expense'}
              </h3>
              <button onClick={() => setViewingExpense(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#edf2f7' }}>
              {loadedReceipts.length === 0 ? (
                <div style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No receipts found for this expense.</div>
              ) : loadedReceipts.map((file, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '10px 15px', backgroundColor: '#2d3748', color: 'white', fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      {file.size ? <span style={{ fontSize: '0.7rem', opacity: 0.7, flexShrink: 0 }}>{(file.size / 1024).toFixed(0)}KB</span> : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => handleDownloadReceipt(file)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#90cdf4', display: 'flex', alignItems: 'center', padding: '4px' }} title="Download">
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleDeleteReceipt(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fc8181', display: 'flex', alignItems: 'center', padding: '4px' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', backgroundColor: '#f7fafc', minHeight: '200px' }}>
                    {file.error ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53e3e', padding: '40px', flexDirection: 'column', gap: '8px' }}>
                        <X size={24} /><span>{file.error}</span>
                      </div>
                    ) : file.type?.startsWith('image/') && file.url ? (
                      <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
                    ) : file.type === 'application/pdf' && file.url ? (
                      <iframe src={file.url} width="100%" height="500px" style={{ border: 'none' }} title={file.name} />
                    ) : (
                      <div style={{ color: '#718096', padding: '40px' }}>Preview not available for this file type.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '15px 20px', borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setViewingExpense(null)} className="btn btn-primary">Close Viewer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;

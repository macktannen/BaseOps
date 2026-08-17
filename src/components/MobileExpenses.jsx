import React, { useState } from 'react';
import { Search, Calendar, FileText, Check, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import MobileDropdownMenu from './MobileDropdownMenu';
import AIInvoiceUploader from './AIInvoiceUploader';
import { FileStorageService } from '../services/FileStorageService';
import { useData } from '../contexts/DataProvider';

const CATEGORIES = [
  'Catering', 'Cleaning / Detailing', 'Crew Meal', 'Customs / Border Fees',
  'De-icing', 'Fuel', 'GPU / Start Cart', 'Ground Transportation', 'Handling',
  'Hangar / Storage', 'Hotel', 'Landing Fee', 'Lavatory Service', 'Maintenance / Repairs',
  'Navigation / Overflight', 'Oil / Fluids', 'Oxygen Service', 'Ramp Fee',
  'Tie-down / Parking', 'Wi-Fi / Data', 'Other'
];

const PAYERS = ['Avcard', 'Avfuel', 'World Fuel', 'Direct Bill', 'Titan', 'Company Card', 'Personal Card', 'Other'];
const FUEL_TYPES = ['Avfuel', 'AEG', 'Atlantic', 'Everest', 'EVO', 'FBO', 'Phillip66', 'Signature', 'Titan', 'World Fuel', 'CAA', 'Other'];

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

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '8px',
  border: '1px solid var(--border-color)', fontSize: '0.9rem',
  boxSizing: 'border-box', backgroundColor: 'white'
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: '#2d3748', marginBottom: '4px', textTransform: 'uppercase'
};

const MobileExpenses = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'unpaid' | 'net15'

  const [showManualModal, setShowManualModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [manualForm, setManualForm] = useState({
    vendor: '', category: '', amount: '', date: new Date().toISOString().split('T')[0],
    flightId: '', payer: '', location: '', fuelType: '', gallons: '', purchaser: '',
    description: '', isPaid: false
  });
  const [manualSaving, setManualSaving] = useState(false);

  const [showAutoModal, setShowAutoModal] = useState(false);

  const { userFlights, departmentExpenses, updateData } = useData();

  const expenses = React.useMemo(() => {
    const flightsList = userFlights || [];
    let allExpenses = [];
    flightsList.forEach(flight => {
      if (flight.expenses && flight.expenses.length > 0) {
        flight.expenses.forEach(exp => {
          allExpenses.push({
            ...exp,
            flightId: flight.id,
            flightNumber: flight.flightNumber || 'Unknown',
            flightTitle: flight.title || 'Untitled',
            flightDate: flight.date || exp.date,
            isPaid: exp.isPaid || false
          });
        });
      }
    });
    
    const deptExpenses = departmentExpenses || [];
    deptExpenses.forEach(exp => {
      allExpenses.push({
        ...exp,
        flightId: '__DEPARTMENT__',
        flightNumber: 'Department',
        flightTitle: 'Department Expense',
        flightDate: exp.date,
        isPaid: exp.isPaid || false,
        isDepartment: true
      });
    });
    
    allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allExpenses;
  }, [userFlights, departmentExpenses]);

  const persistExpenseToFlight = (flightId, updatedExpenses) => {
    try {
      const storedFlights = [...flights];
      const updated = storedFlights.map(f => String(f.id) === String(flightId) ? { ...f, expenses: updatedExpenses } : f);
      updateData('userFlights', updated);
    } catch (e) { console.error('Failed to persist expense', e); }
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setEditingExpense(null);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setManualForm({
      vendor: exp.vendor || '',
      category: exp.category || '',
      amount: exp.amount || '',
      date: exp.date || new Date().toISOString().split('T')[0],
      flightId: exp.flightId === '__DEPARTMENT__' ? '' : String(exp.flightId || ''),
      payer: exp.payer || '',
      location: exp.location || '',
      fuelType: exp.fuelType || '',
      gallons: exp.gallons || '',
      purchaser: exp.purchaser || '',
      description: exp.description || '',
      isPaid: exp.isPaid || false
    });
    setShowManualModal(true);
  };

  const openNewModal = () => {
    setEditingExpense(null);
    setManualForm({
      vendor: '', category: '', amount: '', date: new Date().toISOString().split('T')[0],
      flightId: '', payer: '', location: '', fuelType: '', gallons: '', purchaser: '',
      description: '', isPaid: false
    });
    setShowManualModal(true);
  };

  const saveManualExpense = async () => {
    if (!manualForm.vendor.trim() || !manualForm.amount) return;
    setManualSaving(true);
    try {
      const flightId = manualForm.flightId || null;

      const expData = {
        vendor: manualForm.vendor.trim(),
        category: manualForm.category,
        amount: parseFloat(manualForm.amount) || 0,
        date: manualForm.date,
        payer: manualForm.payer,
        location: manualForm.location,
        fuelType: manualForm.fuelType,
        gallons: manualForm.gallons ? parseInt(manualForm.gallons, 10) : '',
        purchaser: manualForm.purchaser,
        description: manualForm.description,
        isPaid: manualForm.isPaid,
      };

      if (editingExpense) {
        // UPDATE: remove from old location, add to new location with updated data
        const updatedExp = { ...editingExpense, ...expData, _dirty: false, _saved: true };

        // Remove from old flight or department
        const oldFlightId = editingExpense.flightId;
        if (oldFlightId && oldFlightId !== '__DEPARTMENT__') {
          const oldFlight = flights.find(f => String(f.id) === String(oldFlightId));
          if (oldFlight) {
            const oldExpenses = (oldFlight.expenses || []).filter(e => e.id !== editingExpense.id);
            persistExpenseToFlight(oldFlightId, oldExpenses);
          }
        } else if (editingExpense.isDepartment) {
          const deptExpenses = departmentExpenses || [];
          updateData('departmentExpenses', deptExpenses.filter(e => e.id !== editingExpense.id));
        }

        // Add to new location
        if (flightId) {
          const targetFlight = flights.find(f => String(f.id) === String(flightId));
          const currentExpenses = targetFlight?.expenses || [];
          persistExpenseToFlight(flightId, [...currentExpenses, updatedExp]);
        } else {
          const deptExpenses = departmentExpenses || [];
          updateData('departmentExpenses', [...deptExpenses, { ...updatedExp, isDepartment: true }]);
        }
      } else {
        // CREATE
        const newExp = {
          id: Date.now(),
          ...expData,
          receiptCount: 0,
          _dirty: false,
          _saved: true
        };

        if (flightId) {
          const targetFlight = flights.find(f => String(f.id) === String(flightId));
          const currentExpenses = targetFlight?.expenses || [];
          persistExpenseToFlight(flightId, [...currentExpenses, newExp]);
        } else {
          const deptExpenses = departmentExpenses || [];
          updateData('departmentExpenses', [...deptExpenses, { ...newExp, isDepartment: true }]);
        }
      }

      setEditingExpense(null);
      setManualForm({
        vendor: '', category: '', amount: '', date: new Date().toISOString().split('T')[0],
        flightId: '', payer: '', location: '', fuelType: '', gallons: '', purchaser: '',
        description: '', isPaid: false
      });
      setShowManualModal(false);
      loadExpensesData();
    } catch (e) { console.error(e); }
    setManualSaving(false);
  };

  const handleAutoFillParsedExpense = async (parsedData) => {
    const matchedFlight = flights.find(f =>
      String(f.flightNumber).toLowerCase() === (parsedData.tripNumber || '').trim().toLowerCase()
    );
    const flightId = matchedFlight ? matchedFlight.id : null;

    const newExp = {
      id: Date.now(),
      vendor: parsedData.vendor || '',
      category: parsedData.category || '',
      amount: parsedData.amount || 0,
      date: parsedData.date || new Date().toISOString().split('T')[0],
      payer: parsedData.payment || '',
      description: parsedData.invoiceNumber ? `[Inv #${parsedData.invoiceNumber}] ${parsedData.description || ''}` : (parsedData.description || ''),
      isPaid: false,
      receiptCount: 0,
      autoParsed: true,
      _dirty: false,
      _saved: true
    };

    let receiptFiles = [];
    let receiptCount = 0;
    if (parsedData._originalFile && flightId) {
      try {
        const validation = FileStorageService.validateFileSize(parsedData._originalFile);
        if (validation.valid) {
          const result = await FileStorageService.saveReceipt(flightId, newExp.id, parsedData._originalFile);
          receiptFiles = [{ storagePath: result.storagePath, name: parsedData._originalFile.name, type: parsedData._originalFile.type, size: result.size, url: result.url }];
          receiptCount = 1;
        }
      } catch (e) { console.warn('Receipt upload error:', e); }
    }
    newExp.receiptFiles = receiptFiles;
    newExp.receiptCount = receiptCount;
    newExp.hasReceipt = receiptCount > 0;

    if (flightId) {
      const targetFlight = flights.find(f => String(f.id) === String(flightId));
      persistExpenseToFlight(flightId, [...(targetFlight?.expenses || []), newExp]);
    } else {
      const deptExpenses = departmentExpenses || [];
      updateData('departmentExpenses', [...deptExpenses, { ...newExp, isDepartment: true }]);
    }
    setShowAutoModal(false);
  };

  const selectedFlightForForm = flights.find(f => String(f.id) === String(manualForm.flightId));
  const legAirports = selectedFlightForForm?.legs
    ? [...new Set(selectedFlightForForm.legs.flatMap(l => [
        l.departure?.id || l.departure,
        l.destination?.id || l.destination
      ].filter(Boolean).map(a => typeof a === 'string' ? a : String(a))))]
    : [];

  const baseExpenses = expenses.filter(e => {
    const s = search.toLowerCase();
    return (e.vendor?.toLowerCase().includes(s) ||
            e.category?.toLowerCase().includes(s) ||
            e.description?.toLowerCase().includes(s));
  });

  const totalAmount = baseExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalPaid = baseExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalUnpaid = baseExpenses.filter(e => !e.isPaid).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const paidCount = baseExpenses.filter(e => e.isPaid).length;
  const unpaidCount = baseExpenses.filter(e => !e.isPaid).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const net15Expenses = baseExpenses.filter(e => {
    if (e.isPaid) return false;
    if (!e.date) return false;
    const expDate = new Date(e.date + 'T00:00:00');
    if (isNaN(expDate.getTime())) return false;
    const diffDays = Math.floor((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 15;
  });
  const net15Count = net15Expenses.length;

  const filteredExpenses = baseExpenses.filter(e => {
    if (statusFilter === 'paid') return e.isPaid;
    if (statusFilter === 'unpaid') return !e.isPaid;
    if (statusFilter === 'net15') {
      if (e.isPaid || !e.date) return false;
      const expDate = new Date(e.date + 'T00:00:00');
      if (isNaN(expDate.getTime())) return false;
      const diffDays = Math.floor((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 15;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)' }}>
      {/* Search and Summaries pinned to top */}
      <div style={{ padding: '10px 12px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '15px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
          <div 
            onClick={() => setStatusFilter('all')}
            style={{ 
              backgroundColor: '#ebf8ff', 
              padding: '6px 2px', 
              borderRadius: '6px', 
              textAlign: 'center', 
              minWidth: 0,
              cursor: 'pointer',
              border: statusFilter === 'all' ? '2px solid #2b6cb0' : '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.58rem', color: '#2b6cb0', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2c5282', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
          </div>
          <div 
            onClick={() => setStatusFilter(prev => prev === 'paid' ? 'all' : 'paid')}
            style={{ 
              backgroundColor: '#f0fff4', 
              padding: '6px 2px', 
              borderRadius: '6px', 
              textAlign: 'center', 
              minWidth: 0,
              cursor: 'pointer',
              border: statusFilter === 'paid' ? '2px solid #276749' : '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.58rem', color: '#2f855a', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Paid</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#276749', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
          </div>
          <div 
            onClick={() => setStatusFilter(prev => prev === 'unpaid' ? 'all' : 'unpaid')}
            style={{ 
              backgroundColor: '#fff5f5', 
              padding: '6px 2px', 
              borderRadius: '6px', 
              textAlign: 'center', 
              minWidth: 0,
              cursor: 'pointer',
              border: statusFilter === 'unpaid' ? '2px solid #9b2c2c' : '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.58rem', color: '#c53030', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Unpaid</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9b2c2c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>${totalUnpaid.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
          </div>
          <div 
            onClick={() => setStatusFilter('all')}
            style={{ 
              backgroundColor: unpaidCount === 0 && baseExpenses.length > 0 ? '#f0fff4' : '#fffaf0', 
              padding: '6px 2px', 
              borderRadius: '6px', 
              textAlign: 'center', 
              minWidth: 0,
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.58rem', color: unpaidCount === 0 && baseExpenses.length > 0 ? '#2f855a' : '#c05621', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Paid / Unpaid</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: '#276749' }}>{paidCount}</span>/<span style={{ color: unpaidCount > 0 ? '#9b2c2c' : '#718096' }}>{unpaidCount}</span>
            </div>
          </div>
          <div 
            onClick={() => setStatusFilter(prev => prev === 'net15' ? 'all' : 'net15')}
            style={{ 
              backgroundColor: net15Count > 0 ? '#fff5f5' : '#f0fff4', 
              padding: '6px 2px', 
              borderRadius: '6px', 
              textAlign: 'center', 
              minWidth: 0,
              cursor: 'pointer',
              border: statusFilter === 'net15' ? '2px solid #9b2c2c' : '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
            title="Invoices > 15 days from date"
          >
            <div style={{ fontSize: '0.58rem', color: net15Count > 0 ? '#c53030' : '#2f855a', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>NET 15</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: net15Count > 0 ? '#9b2c2c' : '#276749', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {net15Count}
            </div>
          </div>
        </div>
        {statusFilter !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '4px 8px', backgroundColor: statusFilter === 'paid' ? '#f0fff4' : '#fff5f5', borderRadius: '6px', border: `1px solid ${statusFilter === 'paid' ? '#c6f6d5' : '#fed7d7'}`, fontSize: '0.72rem' }}>
            <span style={{ color: statusFilter === 'paid' ? '#276749' : '#9b2c2c', fontWeight: 600 }}>
              {statusFilter === 'paid' && `Showing Paid (${filteredExpenses.length})`}
              {statusFilter === 'unpaid' && `Showing Unpaid (${filteredExpenses.length})`}
              {statusFilter === 'net15' && `Showing NET 15 Overdue (${filteredExpenses.length})`}
            </span>
            <button 
              onClick={() => setStatusFilter('all')}
              style={{ background: 'none', border: 'none', color: '#3182ce', fontWeight: 600, cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Expense List */}
      <div style={{ flex: 1, padding: '15px', paddingBottom: '140px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredExpenses.length > 0 ? filteredExpenses.map(exp => {
            const colors = getCategoryColor(exp.category);
            return (
              <div key={exp.id} className="card" onClick={() => openEditModal(exp)} style={{ padding: '15px', borderLeft: `4px solid ${exp.isPaid ? '#48bb78' : '#f56565'}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.vendor || 'Unknown Vendor'}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Calendar size={12} /> {exp.date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>${parseFloat(exp.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.7rem', marginTop: '2px', color: exp.isPaid ? '#38a169' : '#e53e3e', fontWeight: 600 }}>
                      {exp.isPaid ? <><Check size={12}/> Paid</> : <><X size={12}/> Unpaid</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: colors.bg, color: colors.text, fontWeight: 600 }}>
                    {exp.category || 'Other'}
                  </span>
                  {!exp.isDepartment && (
                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#edf2f7', color: '#4a5568', fontWeight: 600 }}>
                      Flight #{exp.flightNumber}
                    </span>
                  )}
                </div>
                {exp.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', padding: '10px', backgroundColor: '#f7fafc', borderRadius: '6px' }}>
                    <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                    {exp.description}
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No expenses found.</div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'fixed', bottom: '56px', left: 0, right: 0,
        padding: '12px 16px',
        backgroundColor: 'white', borderTop: '1px solid var(--border-color)',
        display: 'flex', gap: '10px', zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)'
      }}>
        <button
          onClick={openNewModal}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--primary-color)', color: 'white',
            fontSize: '0.9rem', fontWeight: 600
          }}
        >
          <Plus size={18} /> Add Expense
        </button>
        <button
          onClick={() => setShowAutoModal(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            backgroundColor: '#805ad5', color: 'white',
            fontSize: '0.9rem', fontWeight: 600
          }}
        >
          <Sparkles size={18} /> Auto-fill Invoice
        </button>
      </div>

      {/* Manual Expense Modal */}
      {showManualModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={closeManualModal}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px', maxHeight: '90vh',
              backgroundColor: 'white', borderRadius: '16px 16px 0 0',
              overflowY: 'auto', padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1a202c' }}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={closeManualModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Vendor *</label>
                <input
                  type="text" placeholder="Vendor name" value={manualForm.vendor}
                  onChange={e => setManualForm({ ...manualForm, vendor: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <MobileDropdownMenu
                  value={manualForm.category}
                  onChange={val => setManualForm({ ...manualForm, category: val })}
                  options={[{ value: '', label: 'Select category' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                  placeholder="Select category"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Amount *</label>
                  <input
                    type="number" step="0.01" placeholder="0.00" value={manualForm.amount}
                    onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date" value={manualForm.date}
                    onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Flight</label>
                <MobileDropdownMenu
                  value={manualForm.flightId}
                  onChange={val => {
                    const selectedFlight = flights.find(f => String(f.id) === String(val));
                    setManualForm({
                      ...manualForm,
                      flightId: val,
                      date: selectedFlight?.date ? selectedFlight.date.split('T')[0] : manualForm.date,
                      purchaser: selectedFlight?.aircraftId || manualForm.purchaser,
                      location: '',
                    });
                  }}
                  options={[
                    { value: '', label: 'Department (no flight)' },
                    ...flights
                      .slice()
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(f => ({
                        value: String(f.id),
                        label: `#${f.flightNumber || f.id} — ${f.title || 'Untitled'} (${(f.date || '').split('T')[0]})`
                      }))
                  ]}
                  placeholder="Select flight"
                />
              </div>

              <div>
                <label style={labelStyle}>Payment</label>
                <MobileDropdownMenu
                  value={manualForm.payer}
                  onChange={val => setManualForm({ ...manualForm, payer: val })}
                  options={[{ value: '', label: 'Select payment' }, ...PAYERS.map(p => ({ value: p, label: p }))]}
                  placeholder="Select payment"
                />
              </div>

              <div>
                <label style={labelStyle}>Location / Airport</label>
                {legAirports.length > 0 ? (
                  <MobileDropdownMenu
                    value={manualForm.location}
                    onChange={val => setManualForm({ ...manualForm, location: val })}
                    options={[{ value: '', label: 'Select airport' }, ...legAirports.map(a => ({ value: a, label: a }))]}
                    placeholder="Select airport"
                  />
                ) : (
                  <input
                    type="text" placeholder="Airport code or location" value={manualForm.location}
                    onChange={e => setManualForm({ ...manualForm, location: e.target.value })}
                    style={inputStyle}
                  />
                )}
              </div>

              <div>
                <label style={labelStyle}>Fuel Type</label>
                <MobileDropdownMenu
                  value={manualForm.fuelType}
                  onChange={val => setManualForm({ ...manualForm, fuelType: val })}
                  options={[{ value: '', label: 'Select fuel type' }, ...FUEL_TYPES.map(f => ({ value: f, label: f }))]}
                  placeholder="Select fuel type"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Gallons</label>
                  <input
                    type="number" step="1" placeholder="0" value={manualForm.gallons}
                    onChange={e => setManualForm({ ...manualForm, gallons: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Purchaser</label>
                  <input
                    type="text" placeholder="Purchaser" value={manualForm.purchaser}
                    onChange={e => setManualForm({ ...manualForm, purchaser: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <input
                  type="text" placeholder="Description or notes" value={manualForm.description}
                  onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox" id="mobile-exp-paid"
                  checked={manualForm.isPaid}
                  onChange={e => setManualForm({ ...manualForm, isPaid: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                />
                <label htmlFor="mobile-exp-paid" style={{ fontSize: '0.85rem', color: '#2d3748', cursor: 'pointer' }}>Mark as Paid</label>
              </div>

              <button
                onClick={saveManualExpense}
                disabled={!manualForm.vendor.trim() || !manualForm.amount || manualSaving}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  backgroundColor: (!manualForm.vendor.trim() || !manualForm.amount) ? '#cbd5e0' : 'var(--primary-color)',
                  color: 'white', fontSize: '1rem', fontWeight: 600, cursor: (!manualForm.vendor.trim() || !manualForm.amount) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '4px'
                }}
              >
                {manualSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingExpense ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>
      )}

      {/* Auto-fill Invoice Modal */}
      {showAutoModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setShowAutoModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px', maxHeight: '90vh',
              backgroundColor: 'white', borderRadius: '16px 16px 0 0',
              overflowY: 'auto', padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1a202c' }}>Auto-fill Invoice</h3>
              <button onClick={() => setShowAutoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '20px' }}>
                Upload a PDF or image invoice and AI will extract the expense details automatically.
              </div>
              <AIInvoiceUploader
                onExpenseParsed={(parsed) => {
                  handleAutoFillParsedExpense(parsed);
                }}
                compact={false}
              />
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>
      )}
    </div>
  );
};

export default MobileExpenses;

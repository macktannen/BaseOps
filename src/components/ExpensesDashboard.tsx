import React, { useMemo, useState } from 'react';
import { DollarSign, Check, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';

const PALETTE = [
  '#4376ac', '#2a9d8f', '#e76f51', '#1e3a8a', '#059669', '#b45309',
  '#374151', '#0e7490', '#6b46c1', '#c53030', '#2b6cb0', '#975a16',
  '#38a169', '#d69e2e', '#805ad5', '#dd6b20'
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' }
];

const fmtCurrency = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const SORT_OPTIONS = [
  { value: 'amount-desc', label: 'Amount: High → Low' },
  { value: 'amount-asc', label: 'Amount: Low → High' },
  { value: 'count-desc', label: 'Count: High → Low' },
  { value: 'name-asc', label: 'Name: A → Z' }
];

const sortItems = (items, key) => {
  const arr = [...items];
  switch (key) {
    case 'amount-asc':
      return arr.sort((a, b) => a.total - b.total);
    case 'count-desc':
      return arr.sort((a, b) => b.count - a.count || b.total - a.total);
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'amount-desc':
    default:
      return arr.sort((a, b) => b.total - a.total);
  }
};

const monthLabel = (ym) => {
  const parts = ym.split('-');
  const m = parseInt(parts[1], 10);
  if (!m || m < 1 || m > 12) return ym;
  return `${MONTHS[m - 1]} '${parts[0].slice(2)}`;
};

const ChartCard = ({ title, subtitle, sortKey, onSortChange, children }) => {
  const isMobile = useIsMobile();
  return (
    <div className="card" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#2d3748' }}>{title}</h3>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
        </div>
        {sortKey && onSortChange && (
          isMobile ? (
            <MobileDropdownMenu
              value={sortKey}
              onChange={(val) => onSortChange(val)}
              options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              placeholder="Sort"
              style={{ fontSize: '0.78rem' }}
            />
          ) : (
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem', backgroundColor: 'white', cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )
        )}
      </div>
      {children}
    </div>
  );
};

const HorizontalBars = ({ data, height }) => {
  const chartHeight = height || Math.max(180, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#4a5568' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => fmtCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((entry, i) => <Cell key={`cell-${entry.name}-${i}`} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const ExpensesDashboard = ({ expenses, vendors, accounts }) => {
  const [period, setPeriod] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [catSort, setCatSort] = useState('amount-desc');
  const [vendorSort, setVendorSort] = useState('amount-desc');
  const [accountSort, setAccountSort] = useState('amount-desc');
  const [payerSort, setPayerSort] = useState('amount-desc');
  const [aircraftSort, setAircraftSort] = useState('amount-desc');

  const dateBounds = useMemo(() => {
    const today = referenceDate;
    const toStr = (x) => format(x, 'yyyy-MM-dd');
    let start = null;
    let end = null;
    switch (period) {
      case 'day': start = today; end = today; break;
      case 'week': start = startOfWeek(today); end = endOfWeek(today); break;
      case 'month': start = startOfMonth(today); end = endOfMonth(today); break;
      case 'quarter': start = startOfQuarter(today); end = endOfQuarter(today); break;
      case 'ytd': start = startOfYear(today); end = today; break;
      case 'year': start = startOfYear(today); end = endOfYear(today); break;
      case 'custom':
        start = customStart ? new Date(customStart + 'T00:00:00') : null;
        end = customEnd ? new Date(customEnd + 'T00:00:00') : null;
        break;
      default: start = null; end = null;
    }
    const startStr = start ? toStr(start) : null;
    const endStr = end ? toStr(end) : null;
    const pretty = (x) => format(x, 'MMM d, yyyy');
    let label = 'All time';
    if (start && end) label = `${pretty(start)} – ${pretty(end)}`;
    else if (start) label = `From ${pretty(start)}`;
    else if (end) label = `Up to ${pretty(end)}`;
    return { startStr, endStr, label };
  }, [period, customStart, customEnd, referenceDate]);

  const baseFiltered = useMemo(() => {
    const { startStr, endStr } = dateBounds;
    if (!startStr && !endStr) return expenses;
    return expenses.filter(e => {
      if (!e.date) return false;
      const ds = String(e.date).slice(0, 10);
      if (startStr && ds < startStr) return false;
      if (endStr && ds > endStr) return false;
      return true;
    });
  }, [expenses, dateBounds]);

  const filtered = useMemo(() => {
    if (paidFilter === 'all') return baseFiltered;
    return baseFiltered.filter(e => paidFilter === 'paid' ? e.isPaid : !e.isPaid);
  }, [baseFiltered, paidFilter]);

  const agg = useMemo(() => {
    const byCategory = {};
    const byVendor = {};
    const byAccount = {};
    const byPayer = {};
    const byAircraft = {};
    const byMonth = {};
    let total = 0, paid = 0, unpaid = 0;

    baseFiltered.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      total += amt;
      if (e.isPaid) paid += amt; else unpaid += amt;
    });

    const bump = (map, key, amt) => {
      if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
      map[key].total += amt;
      map[key].count += 1;
    };

    filtered.forEach(e => {
      const amt = parseFloat(e.amount) || 0;

      bump(byCategory, e.category || 'Uncategorized', amt);

      const v = vendors.find(x => x.vendorId === e.vendor || x.name === e.vendor);
      bump(byVendor, (v && v.name) || e.vendor || 'Unknown Vendor', amt);

      let accountName;
      if (e.isDepartment) {
        accountName = 'Department';
      } else {
        const a = accounts.find(x => x.id === e.flightAccount || x.name === e.flightAccount);
        accountName = (a && a.name) || e.flightAccount || 'No Account';
      }
      bump(byAccount, accountName, amt);

      bump(byPayer, e.payer || 'Unspecified', amt);
      bump(byAircraft, e.flightAircraft || 'Unassigned', amt);

      if (e.date && e.date.length >= 7) {
        bump(byMonth, e.date.slice(0, 7), amt);
      }
    });

    const monthly = Object.values(byMonth)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({ ...m, label: monthLabel(m.name) }));

    return {
      total, paid, unpaid, count: filtered.length,
      byCategory: Object.values(byCategory),
      byVendor: Object.values(byVendor),
      byAccount: Object.values(byAccount),
      byPayer: Object.values(byPayer),
      byAircraft: Object.values(byAircraft),
      monthly
    };
  }, [filtered, baseFiltered, vendors, accounts]);

  const catData = useMemo(() => sortItems(agg.byCategory, catSort), [agg.byCategory, catSort]);
  const vendorData = useMemo(() => sortItems(agg.byVendor, vendorSort), [agg.byVendor, vendorSort]);
  const accountData = useMemo(() => sortItems(agg.byAccount, accountSort), [agg.byAccount, accountSort]);
  const payerData = useMemo(() => sortItems(agg.byPayer, payerSort), [agg.byPayer, payerSort]);
  const aircraftData = useMemo(() => sortItems(agg.byAircraft, aircraftSort), [agg.byAircraft, aircraftSort]);

  const donutData = useMemo(() => sortItems(agg.byCategory, 'amount-desc'), [agg.byCategory]);

  const shiftReference = (direction) => {
    switch (period) {
      case 'day': setReferenceDate(d => addDays(d, direction)); break;
      case 'week': setReferenceDate(d => addWeeks(d, direction)); break;
      case 'month': setReferenceDate(d => addMonths(d, direction)); break;
      case 'quarter': setReferenceDate(d => addQuarters(d, direction)); break;
      case 'year': case 'ytd': setReferenceDate(d => addYears(d, direction)); break;
      default: break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>Period:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setPeriod(p.value);
                  setReferenceDate(new Date());
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${period === p.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  backgroundColor: period === p.value ? 'var(--primary-color)' : 'white',
                  color: period === p.value ? 'white' : '#4a5568',
                  fontSize: '0.78rem',
                  fontWeight: period === p.value ? 600 : 500,
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
            </div>
          )}
        </div>

        {(period !== 'all' && period !== 'custom') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
             <button 
               className="btn btn-secondary" 
               style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
               onClick={() => shiftReference(-1)}
             >
               <ChevronLeft size={16} /> Prev
             </button>
             <button 
               className="btn btn-secondary" 
               style={{ padding: '4px 12px' }}
               onClick={() => setReferenceDate(new Date())}
             >
               Current
             </button>
             <button 
               className="btn btn-secondary" 
               style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
               onClick={() => shiftReference(1)}
             >
               Next <ChevronRight size={16} />
             </button>
             <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', marginLeft: '10px' }}>
                {dateBounds.label}
             </span>
          </div>
        )}
        {(period === 'all' || period === 'custom') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
             <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                {dateBounds.label}
             </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div 
          className="card" 
          onClick={() => setPaidFilter('all')}
          style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: paidFilter === 'all' ? '0 0 0 2px var(--primary-color)' : 'var(--shadow)' }}
        >
          <div style={{ padding: '15px', backgroundColor: '#e6fffa', borderRadius: '50%', color: '#319795' }}><DollarSign size={24} /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Expenses</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtCurrency(agg.total)}</div>
          </div>
        </div>
        <div 
          className="card" 
          onClick={() => setPaidFilter(paidFilter === 'paid' ? 'all' : 'paid')}
          style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: paidFilter === 'paid' ? '0 0 0 2px #38a169' : 'var(--shadow)' }}
        >
          <div style={{ padding: '15px', backgroundColor: '#f0fff4', borderRadius: '50%', color: '#38a169' }}><Check size={24} /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Paid</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38a169' }}>{fmtCurrency(agg.paid)}</div>
          </div>
        </div>
        <div 
          className="card" 
          onClick={() => setPaidFilter(paidFilter === 'unpaid' ? 'all' : 'unpaid')}
          style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: paidFilter === 'unpaid' ? '0 0 0 2px #e53e3e' : 'var(--shadow)' }}
        >
          <div style={{ padding: '15px', backgroundColor: '#fff5f5', borderRadius: '50%', color: '#e53e3e' }}><X size={24} /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Unpaid</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53e3e' }}>{fmtCurrency(agg.unpaid)}</div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#edf2f7', borderRadius: '50%', color: 'var(--primary-color)' }}><FileText size={24} /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filtered Records</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{agg.count}</div>
          </div>
        </div>
      </div>

      {agg.count === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          {expenses.length === 0
            ? 'No expense data to visualize yet. Add expenses to see the dashboard.'
            : 'No expenses fall within the selected date range.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Category Distribution" subtitle="Share of total spend by category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={donutData} dataKey="total" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2} isAnimationActive={false}>
                    {donutData.map((entry, i) => <Cell key={`donut-${entry.name}-${i}`} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => fmtCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Spending by Category" subtitle="Where the money goes, grouped by category" sortKey={catSort} onSortChange={setCatSort}>
              <HorizontalBars data={catData} />
            </ChartCard>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Spending by Vendor" subtitle="Top payees by total amount" sortKey={vendorSort} onSortChange={setVendorSort}>
              <HorizontalBars data={vendorData} />
            </ChartCard>

            <ChartCard title="Spending by Account" subtitle="Which account each expense is billed to" sortKey={accountSort} onSortChange={setAccountSort}>
              <HorizontalBars data={accountData} />
            </ChartCard>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Monthly Trend" subtitle="Total spend per month">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agg.monthly} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => fmtCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="total" fill="#2a9d8f" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Spending by Payment Method" subtitle="How expenses were paid" sortKey={payerSort} onSortChange={setPayerSort}>
              <HorizontalBars data={payerData} />
            </ChartCard>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Spending by Aircraft" subtitle="Operating cost per tail number" sortKey={aircraftSort} onSortChange={setAircraftSort}>
              <HorizontalBars data={aircraftData} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpensesDashboard;

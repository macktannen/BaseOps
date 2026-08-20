import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Helicopter, Clock, Trophy, Fuel, Tag } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie
} from 'recharts';
import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, format, addMonths, addQuarters, addYears
} from 'date-fns';
import { useData } from '../contexts/DataProvider';
import { computeAircraftUsage } from '../services/aircraftUsage';
import type { Flight, Aircraft } from '../data';

const PALETTE = [
  '#0f4c81', '#2a9d8f', '#e76f51', '#1e3a8a', '#059669', '#b45309',
  '#374151', '#0e7490', '#6b46c1', '#c53030', '#2b6cb0', '#975a16',
  '#38a169', '#d69e2e', '#805ad5', '#dd6b20'
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' }
];

const fmtHours = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtCount = (n: number) => (Number(n) || 0).toLocaleString('en-US');
const fmtGallons = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const monthLabel = (ym: string) => {
  const parts = ym.split('-');
  const m = parseInt(parts[1], 10);
  if (!m || m < 1 || m > 12) return ym;
  return `${MONTHS[m - 1]} '${parts[0].slice(2)}`;
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const ChartCard = ({ title, subtitle, children }: ChartCardProps) => (
  <div className="card" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#2d3748' }}>{title}</h3>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

interface HorizontalBarsProps {
  data: { name: string; value: number }[];
  formatter: (n: number) => string;
}

const HorizontalBars = ({ data, formatter }: HorizontalBarsProps) => {
  const chartHeight = Math.max(180, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={formatter} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#4a5568' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={formatter} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((entry, i) => <Cell key={`cell-${entry.name}-${i}`} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const AircraftUsageDashboard = () => {
  const { userFlights, userAircraft, userAccounts } = useData();
  const [period, setPeriod] = useState('all');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAircraft, setSelectedAircraft] = useState<string>('');

  const dateBounds = useMemo(() => {
    const toStr = (x: Date) => format(x, 'yyyy-MM-dd');
    let start: Date | null = null;
    let end: Date | null = null;

    switch (period) {
      case 'month':
        start = startOfMonth(referenceDate);
        end = endOfMonth(referenceDate);
        break;
      case 'quarter':
        start = startOfQuarter(referenceDate);
        end = endOfQuarter(referenceDate);
        break;
      case 'year':
        start = startOfYear(referenceDate);
        end = endOfYear(referenceDate);
        break;
      case 'custom':
        start = customStart ? new Date(`${customStart}T00:00:00`) : null;
        end = customEnd ? new Date(`${customEnd}T00:00:00`) : null;
        break;
      default:
        start = null;
        end = null;
    }

    if (start && Number.isNaN(start.getTime())) start = null;
    if (end && Number.isNaN(end.getTime())) end = null;

    const startStr = start ? toStr(start) : null;
    const endStr = end ? toStr(end) : null;
    const pretty = (x: Date) => format(x, 'MMM d, yyyy');
    let label = 'All time';
    if (start && end) label = `${pretty(start)} – ${pretty(end)}`;
    else if (start) label = `From ${pretty(start)}`;
    else if (end) label = `Up to ${pretty(end)}`;

    return { startStr, endStr, label };
  }, [period, customStart, customEnd, referenceDate]);

  const filteredFlights = useMemo(() => {
    if (!selectedAircraft) return userFlights as Flight[];
    return (userFlights as Flight[]).filter(f => f.aircraftId === selectedAircraft);
  }, [userFlights, selectedAircraft]);

  const stats = useMemo(
    () => computeAircraftUsage(filteredFlights, userAircraft as Aircraft[], dateBounds, true, (userAccounts || []) as { id: string; name: string }[]),
    [filteredFlights, userAircraft, userAccounts, dateBounds]
  );

  const hoursData = useMemo(
    () => [...stats.fleet.byAircraft]
      .filter(a => a.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((a) => ({ name: a.tailNumber, value: a.totalHours })),
    [stats]
  );

  const fuelData = useMemo(
    () => [...stats.fleet.byAircraft]
      .filter(a => a.totalFuel > 0)
      .sort((a, b) => b.totalFuel - a.totalFuel)
      .map((a) => ({ name: a.tailNumber, value: a.totalFuel })),
    [stats]
  );

  const missionsData = useMemo(
    () => [...stats.fleet.byAircraft]
      .filter(a => a.missionCount > 0)
      .sort((a, b) => b.missionCount - a.missionCount)
      .map((a) => ({ name: a.tailNumber, value: a.missionCount })),
    [stats]
  );

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    stats.aircraft.forEach((ac) => {
      Object.entries(ac.hoursByMonth).forEach(([month, hours]) => {
        map[month] = (map[month] || 0) + hours;
      });
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, hours]) => ({ month, label: monthLabel(month), hours }));
  }, [stats]);

  const accountData = useMemo(() => {
    const total = Object.values(stats.fleet.byAccount).reduce((sum, d) => sum + d.hours, 0);
    return Object.entries(stats.fleet.byAccount)
      .map(([name, data]) => ({
        name,
        value: data.hours,
        percentage: total > 0 ? ((data.hours / total) * 100).toFixed(1) : '0',
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const tagData = useMemo(() => {
    return Object.entries(stats.fleet.byTag)
      .map(([name, data]) => ({ name, value: data.hours, missions: data.missions, fuel: data.fuel }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const busiest = useMemo(() => {
    if (stats.fleet.byAircraft.length === 0) return null;
    return [...stats.fleet.byAircraft].sort((a, b) => b.totalHours - a.totalHours)[0];
  }, [stats]);

  const gallonsPerHour = useMemo(
    () => (stats.fleet.totalHours > 0 ? stats.fleet.totalFuel / stats.fleet.totalHours : 0),
    [stats]
  );

  const shiftReference = (direction: number) => {
    switch (period) {
      case 'month':
        setReferenceDate((d) => addMonths(d, direction));
        break;
      case 'quarter':
        setReferenceDate((d) => addQuarters(d, direction));
        break;
      case 'year':
        setReferenceDate((d) => addYears(d, direction));
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>Period:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PERIODS.map((p) => (
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
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
              />
            </div>
          )}
        </div>

        {period !== 'all' && period !== 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => shiftReference(-1)}>Prev</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setReferenceDate(new Date())}>Current</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => shiftReference(1)}>Next</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', marginLeft: '10px' }}>{dateBounds.label}</span>
          </div>
        )}
        {(period === 'all' || period === 'custom') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)' }}>{dateBounds.label}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>Aircraft:</span>
          <select
            value={selectedAircraft}
            onChange={(e) => setSelectedAircraft(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', backgroundColor: 'white' }}
          >
            <option value="">All Aircraft (Fleet View)</option>
            {userAircraft.map((ac: Aircraft) => (
              <option key={ac.id} value={ac.id}>{ac.tailNumber || ac.id}</option>
            ))}
          </select>
          {selectedAircraft && (
            <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setSelectedAircraft('')}>Clear Selection</button>
          )}
        </div>
      </div>

      {stats.fleet.totalMissions === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          {userFlights.length === 0
            ? 'No completed flight data to visualize yet. Sign flight logbooks to see the dashboard.'
            : 'No completed flights fall within the selected date range.'}
        </div>
      ) : (
        <>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#e6fffa', borderRadius: '50%', color: '#319795' }}><Helicopter size={24} /></div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Missions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtCount(stats.fleet.totalMissions)}</div>
                  </div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#e0f2fe', borderRadius: '50%', color: '#0f4c81' }}><Clock size={24} /></div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Flight Hours</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtHours(stats.fleet.totalHours)}</div>
                  </div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '50%', color: '#d97706' }}><Fuel size={24} /></div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Fuel (Gal)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtGallons(stats.fleet.totalFuel)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtGallons(gallonsPerHour)} gal/hr avg</div>
                  </div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#d69e2e' }}><Trophy size={24} /></div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Busiest Aircraft</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{busiest ? busiest.tailNumber : '—'}</div>
                    {busiest && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtHours(busiest.totalHours)} hrs / {fmtCount(busiest.missionCount)} missions</div>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <ChartCard title="Flight Hours by Aircraft" subtitle="Completed flight hours per tail number">
                  <HorizontalBars data={hoursData} formatter={fmtHours} />
                </ChartCard>
                <ChartCard title="Missions by Aircraft" subtitle="Completed missions per tail number">
                  <HorizontalBars data={missionsData} formatter={fmtCount} />
                </ChartCard>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <ChartCard title="Fuel Usage by Aircraft" subtitle="Total gallons per tail number">
                  <HorizontalBars data={fuelData} formatter={fmtGallons} />
                </ChartCard>
                <ChartCard title="Account Usage" subtitle="Flight hours by account">
                  {accountData.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={accountData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            isAnimationActive={false}
                          >
                            {accountData.map((entry, i) => (
                              <Cell key={`cell-${entry.name}-${i}`} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => fmtHours(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        {accountData.map((entry, i) => (
                          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#4a5568', flex: 1 }}>{entry.name}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2d3748' }}>{entry.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No account data available</div>
                  )}
                </ChartCard>
              </div>

              {tagData.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, color: '#2d3748' }}>Usage by Tag</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {tagData.map((t) => (
                      <div key={t.name} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Tag size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2d3748', textTransform: 'capitalize' }}>{t.name}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {fmtHours(t.value)} hrs / {fmtCount(t.missions)} missions / {fmtGallons(t.fuel)} gal
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <ChartCard title="Monthly Flight Hours Trend" subtitle="Total completed hours per month">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtHours} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={fmtHours} />
                      <Line type="monotone" dataKey="hours" stroke="#0f4c81" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
        </>
      )}
    </div>
  );
};

export default AircraftUsageDashboard;

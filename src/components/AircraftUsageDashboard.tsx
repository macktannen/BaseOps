import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plane, Clock, Trophy, Gauge } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
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
  const { userFlights, userAircraft } = useData();
  const [period, setPeriod] = useState('all');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  const stats = useMemo(
    () => computeAircraftUsage(userFlights as Flight[], userAircraft as Aircraft[], dateBounds),
    [userFlights, userAircraft, dateBounds]
  );

  const hoursData = useMemo(
    () => [...stats.fleet.byAircraft]
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((a) => ({ name: a.tailNumber, value: a.totalHours })),
    [stats]
  );

  const missionsData = useMemo(
    () => [...stats.fleet.byAircraft]
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

  const busiest = useMemo(() => {
    if (stats.fleet.byAircraft.length === 0) return null;
    return [...stats.fleet.byAircraft].sort((a, b) => b.totalHours - a.totalHours)[0];
  }, [stats]);

  const avgHours = useMemo(
    () => (stats.fleet.totalAircraft > 0 ? stats.fleet.totalHours / stats.fleet.totalAircraft : 0),
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
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => shiftReference(-1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 12px' }}
              onClick={() => setReferenceDate(new Date())}
            >
              Current
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => shiftReference(1)}
            >
              Next
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

      {stats.fleet.totalMissions === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          {userFlights.length === 0
            ? 'No flight data to visualize yet. Add flights to see the dashboard.'
            : 'No flights fall within the selected date range.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#e6fffa', borderRadius: '50%', color: '#319795' }}>
                <Plane size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Missions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtCount(stats.fleet.totalMissions)}</div>
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#e0f2fe', borderRadius: '50%', color: '#0f4c81' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Flight Hours</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtHours(stats.fleet.totalHours)}</div>
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#d69e2e' }}>
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Busiest Aircraft</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{busiest ? busiest.tailNumber : '—'}</div>
                {busiest && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {fmtHours(busiest.totalHours)} hrs / {fmtCount(busiest.missionCount)} missions
                  </div>
                )}
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f3e8ff', borderRadius: '50%', color: '#7c3aed' }}>
                <Gauge size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Average Hours / Aircraft</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtHours(avgHours)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Flight Hours by Aircraft" subtitle="Total hours flown per tail number">
              <HorizontalBars data={hoursData} formatter={fmtHours} />
            </ChartCard>

            <ChartCard title="Missions by Aircraft" subtitle="Number of missions per tail number">
              <HorizontalBars data={missionsData} formatter={fmtCount} />
            </ChartCard>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <ChartCard title="Monthly Flight Hours Trend" subtitle="Total hours flown per month">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtHours} tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={fmtHours} />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#0f4c81"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
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

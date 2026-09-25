import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';

const P = ['#7c6cfa', '#f59e0b', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c', '#4ade80'];

/* shared tooltip */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-3)', border: '1px solid var(--rule-2)',
      borderRadius: 10, padding: '0.55rem 0.85rem', fontSize: '0.8rem',
    }}>
      {label && <p style={{ color: 'var(--ink-3)', marginBottom: '3px' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'var(--ink)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}
        </p>
      ))}
    </div>
  );
};

const PctLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + r * Math.sin(-midAngle * Math.PI / 180);
  return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.7rem', fontWeight: 700, fill: '#fff', fontFamily: 'DM Mono' }}>{(percent*100).toFixed(0)}%</text>;
};

const Empty = () => (
  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
    no data
  </div>
);

/* category breakdown pie */
export function CategoryPie({ data }) {
  const entries = Object.entries(data ?? {})
    .map(([name, value]) => ({ name, value: +parseFloat(value).toFixed(2) }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!entries.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%"
          outerRadius={95} innerRadius={48} labelLine={false} label={<PctLabel />}>
          {entries.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
        </Pie>
        <Tooltip content={<Tip />} />
        <Legend
          iconType="circle" iconSize={7}
          formatter={(v) => <span style={{ fontSize: '0.76rem', color: 'var(--ink-2)' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* top merchants bar */
export function MerchantsBar({ data }) {
  // data = [[name, amount], ...]
  const entries = (data ?? []).map(([name, amount]) => ({ name, amount: +parseFloat(amount).toFixed(2) }));
  if (!entries.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={entries} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={50} />
        <Tooltip content={<Tip />} />
        <Bar dataKey="amount" name="spend" radius={[5, 5, 0, 0]}>
          {entries.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* timeline */
export function Timeline({ transactions }) {
  if (!transactions?.length) return <Empty />;
  const byDate = {};
  transactions.forEach((t) => {
    const d = (t.date ?? '').slice(0, 10) || 'unknown';
    if (!byDate[d]) byDate[d] = { date: d, total: 0, flags: 0 };
    byDate[d].total += parseFloat(t.amount ?? 0);
    if (t.is_anomaly) byDate[d].flags++;
  });
  const pts = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, total: +d.total.toFixed(2) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={pts}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: 'var(--ink-3)', fontSize: 10, fontFamily: 'DM Mono' }} 
          axisLine={false} 
          tickLine={false}
          tickFormatter={(val) => {
            const d = new Date(val);
            return isNaN(d) ? val : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
          minTickGap={20}
        />
        <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip content={<Tip />} />
        <Legend formatter={(v) => <span style={{ fontSize: '0.74rem', color: 'var(--ink-3)' }}>{v}</span>} />
        <Line type="monotone" dataKey="total" name="spend" stroke="#7c6cfa" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="flags" name="anomalies" stroke="#f87171" strokeWidth={1.5} dot={{ fill: '#f87171', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* currency split */
export function CurrencySplit({ transactions }) {
  const counts = {};
  (transactions ?? []).forEach((t) => {
    const c = (t.currency ?? 'OTHER').toUpperCase();
    counts[c] = (counts[c] ?? 0) + parseFloat(t.amount ?? 0);
  });
  const entries = Object.entries(counts).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  if (!entries.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%"
          outerRadius={80} innerRadius={40} labelLine={false} label={<PctLabel />}>
          {entries.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
        </Pie>
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" iconSize={7}
          formatter={(v) => <span style={{ fontSize: '0.76rem', color: 'var(--ink-2)' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

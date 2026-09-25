import { CategoryPie, MerchantsBar, Timeline, CurrencySplit } from './Charts';
import TransactionsTable from './TransactionsTable';

function Num({ value, prefix = '', color }) {
  return (
    <span className="display mono" style={{
      fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
      color: color ?? 'var(--ink)',
      fontFamily: 'var(--font-mono)',
    }}>
      {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
    </span>
  );
}

function Stat({ label, value, prefix = '', sub, color }) {
  return (
    <div className="anim-up" style={{
      padding: '1.25rem 1.5rem',
      borderRight: '1px solid var(--rule)',
      minWidth: 0,
    }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
      <Num value={value} prefix={prefix} color={color} />
      {sub && <p style={{ fontSize: '0.74rem', color: 'var(--ink-3)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="anim-up" style={{ marginBottom: '2rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 className="display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</h2>
        {hint && <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div className="surface-inset" style={{ padding: '1.25rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</p>
      {children}
    </div>
  );
}

function RiskPill({ level }) {
  const l = (level ?? 'medium').toLowerCase();
  const map = { low: ['var(--emerald)', 'var(--emerald-dim)'], medium: ['var(--amber)', 'var(--amber-dim)'], high: ['var(--rose)', 'var(--rose-dim)'] };
  const [color, bg] = map[l] ?? map.medium;
  return (
    <span style={{ padding: '3px 12px', borderRadius: 99, background: bg, color, fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
      {l} risk
    </span>
  );
}

export default function Dashboard({ results, onReset }) {
  const { summary, transactions = [], category_breakdown = {}, anomalies = [], job_id } = results;

  const fmt   = (n, prefix = '') => `${prefix}${parseFloat(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = transactions.length;
  const flags = anomalies.length;

  const handleDownload = () => {
    if (!transactions.length) return;
    const headers = ['txn_id', 'date', 'merchant', 'amount', 'currency', 'category', 'status', 'is_anomaly', 'anomaly_reason'];
    const csvRows = [headers.join(',')];
    
    for (const t of transactions) {
      const values = headers.map(h => {
        let val = t[h] ?? '';
        if (typeof val === 'string' && val.includes(',')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `txnflow-results-${job_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>

      {/* ── Page title ── */}
      <div className="anim-up" style={{ marginBottom: '2rem' }}>
        <div className="row" style={{ gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>job #{job_id}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <RiskPill level={summary?.risk_level} />
        </div>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 className="display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>
            Here's what we found
          </h1>
          <button className="btn btn-ghost" onClick={handleDownload} style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
            ↓ Export CSV
          </button>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-2)', fontWeight: 300 }}>
          {total.toLocaleString()} transactions processed
          {flags > 0 && <>, <span style={{ color: 'var(--rose)' }}>{flags} flagged</span></>}
          {' '}— details below.
        </p>
      </div>

      <div className="glow-line" style={{ marginBottom: '0' }} />

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', borderBottom: '1px solid var(--rule)', marginBottom: '2rem', overflowX: 'auto' }}>
        <Stat label="Spend (INR)" value={parseFloat(summary?.total_spend_inr ?? 0)} prefix="₹" />
        <Stat label="Spend (USD)" value={parseFloat(summary?.total_spend_usd ?? 0)} prefix="$" />
        <Stat label="Flagged" value={flags} color={flags > 0 ? 'var(--rose)' : undefined} sub={`${total ? ((flags/total)*100).toFixed(1) : 0}% of txns`} />
        <Stat label="Transactions" value={total} />
        {summary?.top_merchants?.[0] && (
          <div style={{ padding: '1.25rem 1.5rem', minWidth: 0 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Top merchant</p>
            <p className="display" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary.top_merchants[0][0]}</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--ink-3)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{fmt(summary.top_merchants[0][1])}</p>
          </div>
        )}
      </div>

      {/* ── AI narrative ── */}
      {summary?.narrative && (
        <Section title="What Gemini says">
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--violet-dim)',
            border: '1px solid var(--violet-mid)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--violet)',
          }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)', lineHeight: 1.7, fontWeight: 300, fontStyle: 'italic' }}>
              "{summary.narrative}"
            </p>
          </div>
        </Section>
      )}

      {/* ── Charts ── */}
      <Section title="Spending breakdown" hint={`${Object.keys(category_breakdown).length} categories`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <ChartBox title="By category">
            <CategoryPie data={category_breakdown} />
          </ChartBox>
          <ChartBox title="Top merchants">
            <MerchantsBar data={summary?.top_merchants} />
          </ChartBox>
        </div>
      </Section>

      <Section title="Over time" hint="daily aggregation">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <ChartBox title="Transaction volume">
            <Timeline transactions={transactions} />
          </ChartBox>
          <ChartBox title="Currency split">
            <CurrencySplit transactions={transactions} />
          </ChartBox>
        </div>
      </Section>

      {/* ── Transactions ── */}
      <Section title="Every transaction" hint={`sorted by ${results.status}`}>
        <TransactionsTable transactions={transactions} />
      </Section>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          job #{job_id} · completed
        </p>
        <button className="btn btn-ghost" onClick={onReset} style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}>
          ← Analyse another file
        </button>
      </div>
    </div>
  );
}

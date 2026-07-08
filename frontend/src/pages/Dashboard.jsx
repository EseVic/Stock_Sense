import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap } from 'recharts'
import './Dashboard.css'
import { formatDaysToExpiryShort } from '../utils/expiry'

// Builds the second line of an alert card. If the item is already past its
// expiry date, the day count itself says "Expired Xd ago" which is the most
// concrete, actionable fact — so it's shown alone rather than paired with a
// possibly-stale ML risk label like "Expiry Risk". If there's no real expiry
// date at all (slow movers with no expiry_date), the day count is omitted
// entirely instead of showing the meaningless 9999 sentinel.
function alertDetailText(a) {
  const label = formatDaysToExpiryShort(a.days)
  if (!label) return a.type
  if (a.days < 0) return label
  return `${a.type} — ${label}`
}

const RISK_COLORS = { Low:'#1B7A5A', Medium:'#C47D0E', High:'#C0392B', Expired:'#4A1A1A', 'No Expiry':'#8B93A1' }
const VEL_COLORS  = { Slow:'#C0392B', Moderate:'#C47D0E', Fast:'#1B7A5A' }

// Every product as one block, colored by expiry risk. Block AREA is driven by
// a log-scaled "size" field (see stats.controller.js) rather than raw ₦ value,
// so a handful of expensive slow movers can't visually bury the cheap-but-
// urgent expired items — but the LABEL still shows the real ₦ value from
// payload.value, since that's what's actually useful to read.
function ProductTreemapCell(props) {
  const { x, y, width, height, name } = props
  const risk = props.risk ?? props.payload?.risk ?? 'No Expiry'
  const value = props.payload?.value ?? props.value
  const fill = RISK_COLORS[risk] || '#8B93A1'
  if (width < 2 || height < 2) return null
  const showLabel = width > 55 && height > 28
  const maxChars = Math.max(1, Math.floor((width - 12) / 6.5))
  const label = name && name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={1.5} rx={3} />
      {showLabel && (
        <>
          <text x={x + 6} y={y + 16} fontSize={11} fontWeight={600} fill="#fff">{label}</text>
          <text x={x + 6} y={y + 30} fontSize={10} fill="#fff" opacity={0.85}>
            ₦{Number(value).toLocaleString()}
          </text>
        </>
      )}
    </g>
  )
}

function StatCard({ label, value, sub, color='var(--green)', icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background:color+'18', color}}>{icon}</div>
      <div>
        <div className="stat-val" style={{color}}>{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

function SavingsCard({ label, value, sub, color, icon }) {
  return (
    <div className="savings-card">
      <div className="savings-icon" style={{background:color+'18', color}}>{icon}</div>
      <div className="savings-body">
        <div className="savings-val" style={{color}}>₦{Number(value).toLocaleString()}</div>
        <div className="savings-label">{label}</div>
        {sub && <div className="savings-sub">{sub}</div>}
      </div>
    </div>
  )
}

function PieLegend({ data }) {
  return (
    <div className="pie-legend">
      {data.map((entry, i) => (
        <div key={i} className="pie-legend-item">
          <span className="pie-legend-dot" style={{ background: entry.fill }} />
          <span className="pie-legend-text">
            {entry.name}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading dashboard…</div>
  if (!stats || stats.total === 0) return (
    <div className="empty-dash">
      <div className="empty-icon">📦</div>
      <h2>No inventory data yet</h2>
      <p>Add your first stock records to see predictions and analytics here.</p>
      <Link to="/app/add-stock" className="cta-btn">Add stock now</Link>
    </div>
  )

  const riskData = Object.entries(stats.byRisk || {}).map(([k,v]) => ({ name:k, value:v, fill:RISK_COLORS[k]||'#888' }))
  const velData  = Object.entries(stats.byVel  || {}).map(([k,v]) => ({ name:k, value:v, fill:VEL_COLORS[k] ||'#888' }))
  const sv       = stats.savings || {}

  return (
    <div className="dash">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of your inventory health</p>
        </div>
        <Link to="/app/add-stock" className="cta-btn">+ Add stock</Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Total records"  value={stats.total}      sub="inventory batches"        icon="📋" color="var(--green)" />
        <StatCard label="High / Expired" value={stats.highRisk}   sub="need immediate attention" icon="⚠️" color="var(--red)" />
        <StatCard label="Low stock" value={stats.lowStock?.length||0} sub="need restocking soon" icon="📉" color="var(--amber)" />
        <StatCard label="Slow movers"    value={stats.slowMovers} sub="not selling fast enough"  icon="🐢" color="var(--amber)" />
        <StatCard label="Total revenue"  value={"₦"+Number(stats.revenue||0).toLocaleString()} sub="from sold stock" icon="₦" color="var(--green)" />
      </div>

      {/* ── ML Savings Intelligence ── */}
      {(sv.potentialLoss > 0 || sv.potentialSavings > 0 || sv.capitalTiedUp > 0) && (
        <div className="savings-section">
          <h3 className="section-title">💡 ML Financial Intelligence</h3>
          <p className="section-sub">Estimated figures based on your current ML predictions</p>
          <div className="savings-grid">
            {sv.potentialLoss > 0 && (
              <SavingsCard
                label="Stock value lost to expiry"
                value={sv.potentialLoss}
                sub={`${sv.expiredCount} expired product${sv.expiredCount !== 1 ? 's' : ''} still on shelf`}
                color="#C0392B"
                icon="🚫"
              />
            )}
            {sv.potentialSavings > 0 && (
              <SavingsCard
                label="Recoverable if discounted now"
                value={sv.potentialSavings}
                sub={`${sv.highRiskCount} high-risk product${sv.highRiskCount !== 1 ? 's' : ''} — act before they expire`}
                color="#C47D0E"
                icon="💰"
              />
            )}
            {sv.capitalTiedUp > 0 && (
              <SavingsCard
                label="Capital tied up in slow movers"
                value={sv.capitalTiedUp}
                sub={`${sv.slowMoverCount} slow-moving product${sv.slowMoverCount !== 1 ? 's' : ''} — consider promotions`}
                color="#1B7A5A"
                icon="📦"
              />
            )}
          </div>
        </div>
      )}

      {stats.alerts?.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">⚠️ Active alerts</h3>
          <div className="alerts-list">
            {stats.alerts.map((a,i) => (
              <div key={i} className={`alert-item alert-${a.severity}`}>
                <div className="alert-dot" />
                <div>
                  <div className="alert-prod">{a.product}</div>
                  <div className="alert-detail">{alertDetailText(a)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.productMap?.length > 0 && (
        <div className="chart-card" style={{ marginBottom:14 }}>
          <h3 className="chart-title">All products — value & expiry risk</h3>
          <ResponsiveContainer width="100%" height={320}>
            <Treemap
              data={stats.productMap}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              isAnimationActive={false}
              content={<ProductTreemapCell />}
            >
              <Tooltip
                formatter={(_value, _name, props) =>
                  [`₦${Number(props.payload.value).toLocaleString()} · ${props.payload.risk} risk`, props.payload.name]
                }
              />
            </Treemap>
          </ResponsiveContainer>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:10, fontSize:12 }}>
            {Object.entries(RISK_COLORS).map(([label, color]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:10, height:10, borderRadius:2, background:color, display:'inline-block' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="charts-row">

        <div className="chart-card">
          <h3 className="chart-title">Revenue by category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.topCategories||[]} layout="vertical" margin={{left:8,right:20}}>
              <XAxis type="number" tick={{fontSize:11}} tickFormatter={v=>'₦'+Math.round(v/1000)+'k'} />
              <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={110} />
              <Tooltip formatter={v=>['₦'+Number(v).toLocaleString(),'Revenue']} />
              <Bar dataKey="revenue" fill="var(--green)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Expiry risk distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={false} labelLine={false}>
                {riskData.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v,n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <PieLegend data={riskData} />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Sales velocity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={velData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={false} labelLine={false}>
                {velData.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v,n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <PieLegend data={velData} />
        </div>

      </div>
    </div>
  )
}

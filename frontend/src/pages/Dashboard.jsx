import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import './Dashboard.css'

const RISK_COLORS = { Low:'#1B7A5A', Medium:'#C47D0E', High:'#C0392B', Expired:'#4A1A1A' }
const VEL_COLORS  = { Slow:'#C0392B', Moderate:'#C47D0E', Fast:'#1B7A5A' }

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

// renders a clean legend below the pie, never clipped
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
      <Link to="/add-stock" className="cta-btn">Add stock now</Link>
    </div>
  )

  const riskData = Object.entries(stats.byRisk || {}).map(([k,v]) => ({ name:k, value:v, fill:RISK_COLORS[k]||'#888' }))
  const velData  = Object.entries(stats.byVel  || {}).map(([k,v]) => ({ name:k, value:v, fill:VEL_COLORS[k] ||'#888' }))

  return (
    <div className="dash">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of your inventory health</p>
        </div>
        <Link to="/add-stock" className="cta-btn">+ Add stock</Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Total records"  value={stats.total}      sub="inventory batches"        icon="📋" color="var(--green)" />
        <StatCard label="High / Expired" value={stats.highRisk}   sub="need immediate attention" icon="⚠️" color="var(--red)" />
        <StatCard label="Slow movers"    value={stats.slowMovers} sub="not selling fast enough"  icon="🐢" color="var(--amber)" />
        <StatCard label="Total revenue"  value={"₦"+Number(stats.revenue||0).toLocaleString()} sub="from sold stock" icon="₦" color="var(--green)" />
      </div>

      {stats.alerts?.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">⚠️ Active alerts</h3>
          <div className="alerts-list">
            {stats.alerts.map((a,i) => (
              <div key={i} className={`alert-item alert-${a.severity}`}>
                <div className="alert-dot" />
                <div>
                  <div className="alert-prod">{a.product}</div>
                  <div className="alert-detail">{a.type}{a.days != null ? ` — ${a.days} days to expiry` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="charts-row">

        {/* Revenue by category */}
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

        {/* Expiry risk */}
        <div className="chart-card">
          <h3 className="chart-title">Expiry risk distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                dataKey="value"
                label={false}
                labelLine={false}
              >
                {riskData.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v,n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          {/* legend rendered as normal HTML below the chart — never clipped */}
          <PieLegend data={riskData} />
        </div>

        {/* Sales velocity */}
        <div className="chart-card">
          <h3 className="chart-title">Sales velocity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={velData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                dataKey="value"
                label={false}
                labelLine={false}
              >
                {velData.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v,n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          {/* legend rendered as normal HTML below the chart — never clipped */}
          <PieLegend data={velData} />
        </div>

      </div>
    </div>
  )
}

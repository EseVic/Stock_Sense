import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Notifications.css'

const SEV_ORDER = { critical:0, high:1, medium:2, low:3 }

export default function Notifications() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    axios.get('/api/stats')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading alerts…</div>

  // build unified alert list from all three sources
  const alerts = []

  // expiry alerts from stats
  ;(data?.alerts || []).forEach(a => {
    if (a.type === 'Expired' || a.type === 'Expiry Risk') {
      alerts.push({
        id:       `exp-${a.product}`,
        type:     'expiry',
        severity: a.severity,
        title:    a.product,
        detail:   a.type === 'Expired'
          ? 'This product has already expired and should be removed from the shelf'
          : `Expiry risk is High — ${a.days != null ? a.days + ' days remaining' : 'check shelf life'}`,
        icon: '⏰',
        action: { label:'View inventory', to:'/app/inventory' }
      })
    }
    if (a.type === 'Slow Mover') {
      alerts.push({
        id:       `slow-${a.product}`,
        type:     'slow',
        severity: a.severity,
        title:    a.product,
        detail:   'This product is selling slowly and may be tying up capital on the shelf',
        icon:     '🐢',
        action:   { label:'View predictions', to:'/app/predictions' }
      })
    }
  })

  // low stock alerts
  ;(data?.lowStock || []).forEach(i => {
    alerts.push({
      id:       `low-${i.product}`,
      type:     'lowstock',
      severity: i.remaining <= 2 ? 'high' : 'medium',
      title:    i.product,
      detail:   `Only ${i.remaining} units remaining (${i.pct}% of original stock). Consider restocking soon.`,
      icon:     '📉',
      action:   { label:'Add stock', to:'/app/add-stock' }
    })
  })

  // sort by severity
  alerts.sort((a,b) => (SEV_ORDER[a.severity]||9) - (SEV_ORDER[b.severity]||9))

  const FILTERS = [
    { key:'all',      label:'All',          count: alerts.length },
    { key:'expiry',   label:'Expiry',       count: alerts.filter(a=>a.type==='expiry').length },
    { key:'slow',     label:'Slow movers',  count: alerts.filter(a=>a.type==='slow').length },
    { key:'lowstock', label:'Low stock',    count: alerts.filter(a=>a.type==='lowstock').length },
  ]

  const shown = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)

  return (
    <div className="notif-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''} across your inventory</p>
        </div>
      </div>

      {/* summary cards */}
      <div className="notif-summary">
        <div className="ns-card ns-expiry">
          <div className="ns-icon">⏰</div>
          <div className="ns-val">{alerts.filter(a=>a.type==='expiry').length}</div>
          <div className="ns-label">Expiry alerts</div>
        </div>
        <div className="ns-card ns-slow">
          <div className="ns-icon">🐢</div>
          <div className="ns-val">{alerts.filter(a=>a.type==='slow').length}</div>
          <div className="ns-label">Slow movers</div>
        </div>
        <div className="ns-card ns-low">
          <div className="ns-icon">📉</div>
          <div className="ns-val">{alerts.filter(a=>a.type==='lowstock').length}</div>
          <div className="ns-label">Low stock</div>
        </div>
        <div className="ns-card ns-total">
          <div className="ns-icon">🔔</div>
          <div className="ns-val">{alerts.length}</div>
          <div className="ns-label">Total alerts</div>
        </div>
      </div>

      {/* filter tabs */}
      <div className="notif-tabs">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`notif-tab${filter===f.key?' active':''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="notif-tab-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* alert list */}
      {shown.length === 0 ? (
        <div className="notif-empty">
          <div style={{fontSize:48}}>✅</div>
          <h3>No alerts in this category</h3>
          <p>Everything looks good here.</p>
        </div>
      ) : (
        <div className="notif-list">
          {shown.map(a => (
            <div key={a.id} className={`notif-item notif-${a.severity}`}>
              <div className="notif-icon-wrap">{a.icon}</div>
              <div className="notif-body">
                <div className="notif-title">{a.title}</div>
                <div className="notif-detail">{a.detail}</div>
              </div>
              <div className="notif-right">
                <span className={`notif-badge sev-${a.severity}`}>{a.severity}</span>
                <Link to={a.action.to} className="notif-action">{a.action.label} →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

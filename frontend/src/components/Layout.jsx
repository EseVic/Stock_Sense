import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const NAV = [
  { to:'/app',                 icon:'⊞', label:'Dashboard'       },
  { to:'/app/inventory',       icon:'◫', label:'Inventory'        },
  { to:'/app/add-stock',       icon:'＋', label:'Add Stock'        },
  { to:'/app/predictions',     icon:'◎', label:'Predictions'      },
  { to:'/app/metrics',         icon:'≋', label:'Model Metrics'    },
  { to:'/app/suppliers',       icon:'🏭', label:'Suppliers'        },
  { to:'/app/purchase-orders', icon:'🛒', label:'Purchase Orders'  },
  { to:'/app/sales-history',   icon:'📈', label:'Sales History'    },
]

function getInitialDark() {
  try { return localStorage.getItem('ss_dark') === 'true' } catch { return false }
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [dark,        setDark]        = useState(getInitialDark)
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('app-dark', dark)
    try { localStorage.setItem('ss_dark', dark) } catch {}
  }, [dark])

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const close = e => { if (!e.target.closest('.mobile-drawer') && !e.target.closest('.mob-menu-btn')) setDrawerOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [drawerOpen])

  const handle_logout = () => { logout(); navigate('/login') }
  const currentPage = NAV.find(n => n.to === location.pathname)?.label || 'StockSense'

  return (
    <div className="shell">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">S</div>
          <div>
            <div className="logo-name">StockSense</div>
            <div className="logo-sub">Retail AI</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/app'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="dark-toggle" onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()||'U'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-store">{user?.store_name||'My Store'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handle_logout}>Sign out</button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="mobile-topbar">
        <button
          className={`mob-menu-btn${drawerOpen ? ' mob-menu-btn--open' : ''}`}
          onClick={() => setDrawerOpen(o => !o)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>

        <div className="mob-brand">
          <div className="logo-icon logo-icon-sm">S</div>
          <span>{currentPage}</span>
        </div>

        <button className="mob-dark-btn" onClick={() => setDark(d => !d)} aria-label="Toggle dark mode">
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      <div className={`mobile-drawer${drawerOpen ? ' mobile-drawer--open' : ''}`}>
        <div className="drawer-header">
          <div className="sidebar-logo" style={{padding:'20px 16px',borderBottom:'none'}}>
            <div className="logo-icon">S</div>
            <div>
              <div className="logo-name">StockSense</div>
              <div className="logo-sub">Retail AI</div>
            </div>
          </div>
        </div>

        <nav className="drawer-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/app'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="drawer-footer">
          <button className="dark-toggle" onClick={() => setDark(d => !d)}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="user-info" style={{marginTop:8}}>
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()||'U'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-store">{user?.store_name||'My Store'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handle_logout} style={{marginTop:10}}>Sign out</button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <Outlet />
      </main>

    </div>
  )
}
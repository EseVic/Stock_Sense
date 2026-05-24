import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const NAV = [
  { to:'/',                icon:'⊞', label:'Dashboard'       },
  { to:'/inventory',       icon:'◫', label:'Inventory'        },
  { to:'/add-stock',       icon:'＋', label:'Add Stock'        },
  { to:'/predictions',     icon:'◎', label:'Predictions'      },
  { to:'/metrics',         icon:'≋', label:'Model Metrics'    },
  { to:'/suppliers',       icon:'🏭', label:'Suppliers'        },
  { to:'/purchase-orders', icon:'🛒', label:'Purchase Orders'  },
  { to:'/sales-history',   icon:'📈', label:'Sales History'    },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handle_logout = () => { logout(); navigate('/login') }

  return (
    <div className="shell">
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
            <NavLink key={n.to} to={n.to} end={n.to==='/'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
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

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

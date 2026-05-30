// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import { AuthProvider, useAuth } from './context/AuthContext'
// import Landing        from './pages/Landing'
// import Login          from './pages/Login'
// import Register       from './pages/Register'
// import ForgotPassword from './pages/ForgotPassword'
// import ResetPassword  from './pages/ResetPassword'
// import VerifyEmail    from './pages/VerifyEmail'
// import Dashboard      from './pages/Dashboard'
// import Inventory      from './pages/Inventory'
// import AddStock       from './pages/AddStock'
// import Predictions    from './pages/Predictions'
// import ModelMetrics   from './pages/ModelMetrics'
// import Suppliers      from './pages/Suppliers'
// import PurchaseOrders from './pages/PurchaseOrders'
// import SalesHistory   from './pages/SalesHistory'
// import Layout         from './components/Layout'

// function Protected({ children }) {
//   const { user, loading } = useAuth()
//   if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'var(--font)',color:'var(--green)'}}>Loading StockSense…</div>
//   return user ? children : <Navigate to="/login" replace />
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Routes>
//           Landing page
//           <Route path="/landing" element={<Landing />} />

//           {/* Public auth pages */}
//           <Route path="/login"           element={<Login />} />
//           <Route path="/register"        element={<Register />} />
//           <Route path="/forgot-password" element={<ForgotPassword />} />
//           <Route path="/reset-password"  element={<ResetPassword />} />
//           <Route path="/verify-email"    element={<VerifyEmail />} />

//           {/* Protected app pages */}
//           <Route path="/" element={<Protected><Layout /></Protected>}>
//             <Route index                    element={<Dashboard />} />
//             <Route path="inventory"         element={<Inventory />} />
//             <Route path="add-stock"         element={<AddStock />} />
//             <Route path="predictions"       element={<Predictions />} />
//             <Route path="metrics"           element={<ModelMetrics />} />
//             <Route path="suppliers"         element={<Suppliers />} />
//             <Route path="purchase-orders"   element={<PurchaseOrders />} />
//             <Route path="sales-history"     element={<SalesHistory />} />
//           </Route>
          
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   )
// }


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing        from './pages/Landing'
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import VerifyEmail    from './pages/VerifyEmail'
import Dashboard      from './pages/Dashboard'
import Inventory      from './pages/Inventory'
import AddStock       from './pages/AddStock'
import Predictions    from './pages/Predictions'
import ModelMetrics   from './pages/ModelMetrics'
import Suppliers      from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import SalesHistory   from './pages/SalesHistory'
import Layout         from './components/Layout'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'var(--font)',color:'var(--green)'}}>Loading StockSense…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page — default route */}
          <Route path="/" element={<Landing />} />

          {/* Public auth pages */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />

          {/* Protected app pages */}
          <Route path="/app" element={<Protected><Layout /></Protected>}>
            <Route index                    element={<Dashboard />} />
            <Route path="inventory"         element={<Inventory />} />
            <Route path="add-stock"         element={<AddStock />} />
            <Route path="predictions"       element={<Predictions />} />
            <Route path="metrics"           element={<ModelMetrics />} />
            <Route path="suppliers"         element={<Suppliers />} />
            <Route path="purchase-orders"   element={<PurchaseOrders />} />
            <Route path="sales-history"     element={<SalesHistory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
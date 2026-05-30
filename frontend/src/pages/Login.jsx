import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import './Auth.css'

export default function Login() {
  const [form,       setForm]       = useState({ email:'', password:'' })
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [showPw,     setShowPw]     = useState(false)
  const [unverified, setUnverified] = useState(null)
  const [resending,  setResending]  = useState(false)
  const [resentMsg,  setResentMsg]  = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async () => {
    setError(''); setUnverified(null); setLoading(true)
    try {
      await login(form.email, form.password)
      nav('/app')
    } catch(e) {
      const data = e.response?.data
      if (data?.requiresVerification) {
        setUnverified(data.email || form.email)
      } else {
        setError(data?.error || 'Login failed. Check your credentials.')
      }
    } finally { setLoading(false) }
  }

  const resend = async () => {
    setResending(true); setResentMsg('')
    try {
      await axios.post('/api/resend-verification', { email: unverified })
      setResentMsg('✅ Verification email resent! Check your inbox.')
    } catch(e) {
      setResentMsg(e.response?.data?.error || 'Failed to resend. Please try again.')
    } finally { setResending(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        {/* ── back to landing ── */}
        <Link to="/" className="auth-back">
          <span className="auth-back-arrow">←</span>
          Back to home
        </Link>

        <div className="auth-brand">
          <div className="auth-logo">S</div>
          <h1>StockSense</h1>
        </div>
        <div className="auth-tagline">
          <h2>Intelligent inventory for Nigerian retail</h2>
          <p>Predict expiry risk, track slow movers, understand customer preferences — all powered by machine learning.</p>
        </div>
        <div className="auth-features">
          {['Expiry risk prediction','Sales velocity tracking','Customer preference analysis','Slow mover detection'].map(f=>(
            <div key={f} className="auth-feature"><span className="af-dot">✓</span>{f}</div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to your store dashboard</p>

          {unverified && (
            <div style={{background:'#fff8e1',border:'1px solid #f9c84a',borderRadius:10,padding:'14px 16px',marginBottom:16,fontSize:13}}>
              <p style={{margin:'0 0 8px',fontWeight:600,color:'#7a5800'}}>⚠️ Email not verified</p>
              <p style={{margin:'0 0 10px',color:'#555'}}>Please verify your email before logging in. Check your inbox for the verification link.</p>
              {resentMsg
                ? <p style={{margin:0,color:resentMsg.startsWith('✅')?'var(--green)':'#c0392b',fontWeight:600}}>{resentMsg}</p>
                : <button onClick={resend} disabled={resending}
                    style={{background:'none',border:'1px solid #f9c84a',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontWeight:600,fontSize:13,color:'#7a5800'}}>
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
              }
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <label className="field-label">Email address</label>
          <input className="field-input" type="email" value={form.email}
            onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" />

          <label className="field-label">Password</label>
          <div style={{position:'relative'}}>
            <input className="field-input" type={showPw?'text':'password'} value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
              placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()} style={{paddingRight:44}} />
            <button type="button" onClick={()=>setShowPw(v=>!v)}
              style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#888',lineHeight:1}}>
              {showPw?'🙈':'👁️'}
            </button>
          </div>

          <div style={{textAlign:'right',marginTop:6,marginBottom:16}}>
            <Link to="/forgot-password" style={{fontSize:13,color:'var(--green)',textDecoration:'none',fontWeight:500}}>Forgot password?</Link>
          </div>

          <button className="auth-btn" onClick={submit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>
    </div>
  )
}
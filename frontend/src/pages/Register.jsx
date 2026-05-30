import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

const CITIES = ['Lagos','Abuja','Kano','Port Harcourt','Ibadan','Benin City','Kaduna','Aba','Enugu','Onitsha','Warri','Ilorin','Jos','Owerri','Uyo']

export default function Register() {
  const [form,      setForm]      = useState({ name:'', email:'', password:'', store_name:'', city:'Lagos' })
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [showPw,    setShowPw]    = useState(false)
  const [resending, setResending] = useState(false)
  const [resentMsg, setResentMsg] = useState('')

  const set = k => e => setForm({...form,[k]:e.target.value})

  const submit = async () => {
    if (!form.name||!form.email||!form.password) return setError('All fields are required')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    setError(''); setLoading(true)
    try {
      await axios.post('/api/register', form)
      setDone(true)
    } catch(e) {
      setError(e.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const resend = async () => {
    setResending(true); setResentMsg('')
    try {
      await axios.post('/api/resend-verification', { email: form.email })
      setResentMsg('✅ Verification email resent! Check your inbox.')
    } catch(e) {
      setResentMsg(e.response?.data?.error || 'Failed to resend. Please try again.')
    } finally { setResending(false) }
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-left">
          <Link to="/landing" className="auth-back">
            <span className="auth-back-arrow">←</span>
            Back to home
          </Link>
          <div className="auth-brand">
            <div className="auth-logo">S</div>
            <h1>StockSense</h1>
          </div>
          <div className="auth-tagline">
            <h2>Built for Nigerian small businesses</h2>
            <p>No technical knowledge required. Just enter your stock data and let the AI do the analysis.</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-card">
            <div style={{fontSize:52,textAlign:'center',marginBottom:12}}>📬</div>
            <h2 className="auth-title">Check your email</h2>
            <p className="auth-sub" style={{textAlign:'center'}}>
              We sent a verification link to <strong>{form.email}</strong>.
              Click the link in the email to activate your account before signing in.
            </p>
            <div style={{background:'#f0faf5',border:'1px solid #b2dfcc',borderRadius:10,padding:'14px 16px',marginTop:20,fontSize:13,color:'#1B7A5A'}}>
              ⚠️ You will not be able to log in until you verify your email.
            </div>
            {resentMsg && (
              <p style={{fontSize:13,marginTop:12,textAlign:'center',color:resentMsg.startsWith('✅')?'var(--green)':'#c0392b'}}>
                {resentMsg}
              </p>
            )}
            <button onClick={resend} disabled={resending}
              style={{width:'100%',marginTop:16,padding:'11px',borderRadius:10,border:'1px solid var(--green)',background:'transparent',color:'var(--green)',cursor:'pointer',fontWeight:600,fontSize:14}}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
            <p className="auth-switch" style={{marginTop:16}}>Already verified? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        {/* ── back to landing ── */}
        <Link to="/landing" className="auth-back">
          <span className="auth-back-arrow">←</span>
          Back to home
        </Link>

        <div className="auth-brand">
          <div className="auth-logo">S</div>
          <h1>StockSense</h1>
        </div>
        <div className="auth-tagline">
          <h2>Built for Nigerian small businesses</h2>
          <p>No technical knowledge required. Just enter your stock data and let the AI do the analysis.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-sub">Set up your store in under a minute</p>

          {error && <div className="auth-error">{error}</div>}

          <label className="field-label">Full name</label>
          <input className="field-input" value={form.name} onChange={set('name')} placeholder="Chioma Okafor" />

          <label className="field-label">Email address</label>
          <input className="field-input" type="email" value={form.email} onChange={set('email')} placeholder="chioma@gmail.com" />

          <label className="field-label">Password</label>
          <div style={{position:'relative'}}>
            <input className="field-input" type={showPw?'text':'password'} value={form.password}
              onChange={set('password')} placeholder="At least 8 characters" style={{paddingRight:44}} />
            <button type="button" onClick={()=>setShowPw(v=>!v)}
              style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#888',lineHeight:1}}>
              {showPw?'🙈':'👁️'}
            </button>
          </div>

          <label className="field-label">Store name</label>
          <input className="field-input" value={form.store_name} onChange={set('store_name')} placeholder="Mama Chioma's Store" />

          <label className="field-label">City</label>
          <select className="field-input" value={form.city} onChange={set('city')}>
            {CITIES.map(c=><option key={c}>{c}</option>)}
          </select>

          <button className="auth-btn" onClick={submit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email) return setError('Please enter your email address')
    setError(''); setLoading(true)
    try {
      await axios.post('/api/forgot-password', { email })
      setSent(true)
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
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
          {sent ? (
            <>
              <div style={{fontSize:48,textAlign:'center',marginBottom:16}}>📬</div>
              <h2 className="auth-title">Check your inbox</h2>
              <p className="auth-sub" style={{textAlign:'center'}}>
                We sent a password reset link to <strong>{email}</strong>.
                Check your email and click the link to reset your password.
              </p>
              <p style={{fontSize:13,color:'var(--gray)',textAlign:'center',marginTop:16}}>
                Didn't receive it? Check your spam folder or{' '}
                <button
                  style={{background:'none',border:'none',color:'var(--green)',cursor:'pointer',fontWeight:600,padding:0}}
                  onClick={() => setSent(false)}
                >
                  try again
                </button>
              </p>
              <p className="auth-switch" style={{marginTop:24}}>
                <Link to="/login">← Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="auth-title">Forgot password?</h2>
              <p className="auth-sub">Enter your email and we'll send you a reset link</p>

              {error && <div className="auth-error">{error}</div>}

              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={e => e.key === 'Enter' && submit()}
              />

              <button className="auth-btn" onClick={submit} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="auth-switch">
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

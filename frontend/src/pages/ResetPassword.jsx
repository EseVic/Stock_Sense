import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

export default function ResetPassword() {
  const [params]               = useSearchParams()
  const [form, setForm]        = useState({ password: '', confirm: '' })
  const [error, setError]      = useState('')
  const [loading, setLoading]  = useState(false)
  const [success, setSuccess]  = useState(false)
  const nav = useNavigate()
  const token = params.get('token')

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.')
  }, [token])

  const submit = async () => {
    if (!form.password || !form.confirm) return setError('Please fill in both fields')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')

    setError(''); setLoading(true)
    try {
      await axios.post('/api/reset-password', { token, password: form.password })
      setSuccess(true)
      setTimeout(() => nav('/login'), 3000)
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
      </div>

      <div className="auth-right">
        <div className="auth-card">
          {success ? (
            <>
              <div style={{fontSize:48,textAlign:'center',marginBottom:16}}>✅</div>
              <h2 className="auth-title">Password updated!</h2>
              <p className="auth-sub" style={{textAlign:'center'}}>
                Your password has been reset successfully. Redirecting you to sign in…
              </p>
              <p className="auth-switch" style={{marginTop:24}}>
                <Link to="/login">Go to sign in now</Link>
              </p>
            </>
          ) : (
            <>
              <h2 className="auth-title">Set new password</h2>
              <p className="auth-sub">Choose a strong password for your account</p>

              {error && <div className="auth-error">{error}</div>}

              <label className="field-label">New password</label>
              <input
                className="field-input"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />

              <label className="field-label">Confirm new password</label>
              <input
                className="field-input"
                type="password"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat your password"
                onKeyDown={e => e.key === 'Enter' && submit()}
              />

              <button className="auth-btn" onClick={submit} disabled={loading || !token}>
                {loading ? 'Updating…' : 'Update password'}
              </button>

              <p className="auth-switch">
                <Link to="/forgot-password">Request a new reset link</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

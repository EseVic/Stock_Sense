import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

export default function VerifyEmail() {
  const [params]              = useSearchParams()
  const [status, setStatus]   = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent]   = useState(false)
  const token = params.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found. Please check your email link.')
      return
    }
    axios.get(`/api/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(e => {
        setStatus('error')
        setMessage(e.response?.data?.error || 'Verification failed. The link may have expired.')
      })
  }, [token])

  const resend = async () => {
    const email = prompt('Enter your email address to resend the verification link:')
    if (!email) return
    setResending(true)
    try {
      await axios.post('/api/resend-verification', { email })
      setResent(true)
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to resend. Please try again.')
    } finally {
      setResending(false)
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
          {status === 'loading' && (
            <>
              <div style={{fontSize:48,textAlign:'center',marginBottom:16}}>⏳</div>
              <h2 className="auth-title">Verifying your email…</h2>
              <p className="auth-sub" style={{textAlign:'center'}}>Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{fontSize:48,textAlign:'center',marginBottom:16}}>🎉</div>
              <h2 className="auth-title">Email verified!</h2>
              <p className="auth-sub" style={{textAlign:'center'}}>
                Your email has been verified successfully. You can now sign in to your StockSense account.
              </p>
              <Link to="/login">
                <button className="auth-btn" style={{marginTop:24}}>Go to sign in</button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{fontSize:48,textAlign:'center',marginBottom:16}}>❌</div>
              <h2 className="auth-title">Verification failed</h2>
              <p className="auth-sub" style={{textAlign:'center'}}>{message}</p>

              {resent ? (
                <p style={{textAlign:'center',color:'var(--green)',fontWeight:600,marginTop:16}}>
                  ✅ Verification email resent! Check your inbox.
                </p>
              ) : (
                <button className="auth-btn" onClick={resend} disabled={resending} style={{marginTop:24}}>
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              )}

              <p className="auth-switch" style={{marginTop:16}}>
                <Link to="/login">← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

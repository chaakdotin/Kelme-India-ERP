import { useState } from 'react'
import { getOtpMeta, isValidEmail, sendOtpToEmail, verifyOtpCode } from '../auth/otpAuth'

function EmailOtpAuth({ onAuthenticated }) {
  const initialMeta = getOtpMeta()

  const [email, setEmail] = useState(initialMeta?.email ?? '')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(initialMeta ? 'otp' : 'email')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [meta, setMeta] = useState(initialMeta)

  const handleSendOtp = () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }

    const result = sendOtpToEmail(normalizedEmail)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setEmail(normalizedEmail)
    setStep('otp')
    setOtp('')
    setMeta({
      email: normalizedEmail,
      expiresAt: result.expiresAt,
      resendAvailableAt: result.resendAvailableAt,
    })

    setFeedback({
      type: 'success',
      message: 'OTP sent on your email. Enter 6-digit code to continue.',
    })
  }

  const handleVerifyOtp = () => {
    const result = verifyOtpCode(email, otp)

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setFeedback({ type: 'success', message: 'OTP verified. Logging you in...' })
    onAuthenticated(result.session)
  }

  const handleResendOtp = () => {
    handleSendOtp()
  }

  const handleChangeEmail = () => {
    setStep('email')
    setOtp('')
    setMeta(null)
    setFeedback({ type: '', message: '' })
  }

  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <p className="eyebrow">Secure Access</p>
        <h1 className="auth-title">Email OTP Login</h1>
        <p className="auth-subtitle">Only email + OTP verification is enabled for this dashboard.</p>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="auth-email">
            Work Email
          </label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            disabled={step === 'otp'}
            autoComplete="email"
          />
        </div>

        {step === 'otp' && (
          <div className="auth-field-group">
            <label className="auth-label" htmlFor="auth-otp">
              OTP Code
            </label>
            <input
              id="auth-otp"
              className="auth-input otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              autoComplete="one-time-code"
            />
            {meta && (
              <p className="auth-meta">
                OTP valid till{' '}
                {new Date(meta.expiresAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . If expired, resend OTP.
              </p>
            )}
          </div>
        )}

        {feedback.message && <p className={`auth-feedback ${feedback.type === 'error' ? 'error' : 'success'}`}>{feedback.message}</p>}

        <div className="auth-actions">
          {step === 'email' ? (
            <button type="button" className="primary-btn" onClick={handleSendOtp}>
              Send OTP
            </button>
          ) : (
            <>
              <button type="button" className="primary-btn" onClick={handleVerifyOtp}>
                Verify OTP
              </button>
              <button type="button" className="secondary-btn" onClick={handleResendOtp}>
                Resend OTP
              </button>
              <button type="button" className="ghost-btn" onClick={handleChangeEmail}>
                Change Email
              </button>
            </>
          )}
        </div>

        {import.meta.env.DEV && <p className="dev-note">Dev mode: OTP value browser console me print hota hai.</p>}
      </article>
    </section>
  )
}

export default EmailOtpAuth

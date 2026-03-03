import { useState } from 'react'
import { getOtpMeta, isValidEmail, sendOtpToEmail, verifyOtpCode } from '../auth/otpAuth'

function EmailOtpAuth({ onAuthenticated }) {
  const initialMeta = getOtpMeta()

  const [email, setEmail] = useState(initialMeta?.email ?? '')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(initialMeta ? 'otp' : 'email')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [meta, setMeta] = useState(initialMeta)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }

    setIsSendingOtp(true)
    const result = await sendOtpToEmail(normalizedEmail)
    setIsSendingOtp(false)

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

    const otpSentMessage =
      result.devOtp
        ? `Testing OTP mode active. Use code ${result.devOtp} to continue.`
        : 'OTP sent on your email. Enter 6-digit code to continue.'

    setFeedback({
      type: 'success',
      message: otpSentMessage,
    })
  }

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true)
    const result = await verifyOtpCode(email, otp)
    setIsVerifyingOtp(false)

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
            disabled={step === 'otp' || isSendingOtp || isVerifyingOtp}
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
              disabled={isSendingOtp || isVerifyingOtp}
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
            <button type="button" className="primary-btn" onClick={handleSendOtp} disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
          ) : (
            <>
              <button type="button" className="primary-btn" onClick={handleVerifyOtp} disabled={isVerifyingOtp}>
                {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" className="secondary-btn" onClick={handleResendOtp} disabled={isSendingOtp}>
                {isSendingOtp ? 'Sending...' : 'Resend OTP'}
              </button>
              <button type="button" className="ghost-btn" onClick={handleChangeEmail} disabled={isSendingOtp || isVerifyingOtp}>
                Change Email
              </button>
            </>
          )}
        </div>

        <p className="dev-note">OTP backend API se email provider ke through send hota hai (SMTP/Resend).</p>
      </article>
    </section>
  )
}

export default EmailOtpAuth

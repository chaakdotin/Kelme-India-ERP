const AUTH_SESSION_KEY = 'kelme_erp_auth_session'
const OTP_CHALLENGE_KEY = 'kelme_erp_otp_challenge'

const OTP_LENGTH = 6
const OTP_VALID_FOR_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000

const toEmail = (value) => String(value).trim().toLowerCase()

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export const isValidEmail = (email) => {
  const value = toEmail(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const loadAuthSession = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.email || !parsed?.verifiedAt || !parsed?.token) return null

    return parsed
  } catch {
    return null
  }
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export const getOtpChallenge = () => {
  try {
    const raw = sessionStorage.getItem(OTP_CHALLENGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.email || !parsed?.otp || !parsed?.expiresAt || !parsed?.resendAvailableAt) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const sendOtpToEmail = (email) => {
  const normalizedEmail = toEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }

  const otp = generateOtp()
  const now = Date.now()

  const challenge = {
    email: normalizedEmail,
    otp,
    createdAt: now,
    expiresAt: now + OTP_VALID_FOR_MS,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
  }

  sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify(challenge))

  if (import.meta.env.DEV) {
    console.info(`[DEV][OTP] ${normalizedEmail} -> ${otp}`)
  }

  return {
    ok: true,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  }
}

export const verifyOtpCode = (email, otpInput) => {
  const challenge = getOtpChallenge()
  const normalizedEmail = toEmail(email)
  const normalizedOtp = String(otpInput).replace(/\D/g, '').slice(0, OTP_LENGTH)

  if (!challenge) {
    return { ok: false, message: 'OTP request not found. Please send OTP again.' }
  }

  if (challenge.email !== normalizedEmail) {
    return { ok: false, message: 'Email does not match OTP request. Use the same email.' }
  }

  if (Date.now() > challenge.expiresAt) {
    sessionStorage.removeItem(OTP_CHALLENGE_KEY)
    return { ok: false, message: 'OTP expired. Please send a new OTP.' }
  }

  if (normalizedOtp.length !== OTP_LENGTH) {
    return { ok: false, message: 'OTP must be a 6-digit code.' }
  }

  if (challenge.otp !== normalizedOtp) {
    return { ok: false, message: 'Invalid OTP. Please check and retry.' }
  }

  const session = {
    email: normalizedEmail,
    verifiedAt: new Date().toISOString(),
    token: `otp-${Math.random().toString(36).slice(2, 12)}`,
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  sessionStorage.removeItem(OTP_CHALLENGE_KEY)

  return { ok: true, session }
}

export const getOtpMeta = () => {
  const challenge = getOtpChallenge()
  if (!challenge) return null

  return {
    email: challenge.email,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  }
}

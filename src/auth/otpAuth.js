const AUTH_SESSION_KEY = 'kelme_erp_auth_session'
const OTP_CHALLENGE_KEY = 'kelme_erp_otp_challenge'

const OTP_LENGTH = 6
const OTP_VALID_FOR_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000
const TEST_OTP_CODE = '123456'

const toEmail = (value) => String(value || '').trim().toLowerCase()
const normalizeOtp = (value) => String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH)

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
  clearOtpChallenge()
}

const saveOtpChallengeMeta = ({ email, expiresAt, resendAvailableAt }) => {
  sessionStorage.setItem(
    OTP_CHALLENGE_KEY,
    JSON.stringify({
      email,
      expiresAt,
      resendAvailableAt,
    }),
  )
}

export const clearOtpChallenge = () => {
  sessionStorage.removeItem(OTP_CHALLENGE_KEY)
}

export const getOtpChallenge = () => {
  try {
    const raw = sessionStorage.getItem(OTP_CHALLENGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.email || !parsed?.expiresAt || !parsed?.resendAvailableAt) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const sendOtpToEmail = async (email) => {
  const normalizedEmail = toEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }

  const now = Date.now()
  const activeChallenge = getOtpChallenge()

  if (activeChallenge?.email === normalizedEmail && now < activeChallenge.resendAvailableAt) {
    return {
      ok: false,
      message: 'Please wait before requesting another OTP.',
      resendAvailableAt: activeChallenge.resendAvailableAt,
    }
  }

  const expiresAt = now + OTP_VALID_FOR_MS
  const resendAvailableAt = now + OTP_RESEND_COOLDOWN_MS

  saveOtpChallengeMeta({
    email: normalizedEmail,
    expiresAt,
    resendAvailableAt,
  })

  return {
    ok: true,
    expiresAt,
    resendAvailableAt,
    delivery: 'fixed-test',
    devOtp: TEST_OTP_CODE,
  }
}

export const verifyOtpCode = async (email, otpInput) => {
  const normalizedEmail = toEmail(email)
  const normalizedOtp = normalizeOtp(otpInput)

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }

  if (normalizedOtp.length !== OTP_LENGTH) {
    return { ok: false, message: 'OTP must be a 6-digit code.' }
  }

  const challenge = getOtpChallenge()
  if (!challenge || challenge.email !== normalizedEmail) {
    return { ok: false, message: 'OTP request not found. Please send OTP again.' }
  }

  if (Date.now() > challenge.expiresAt) {
    clearOtpChallenge()
    return { ok: false, message: 'OTP expired. Please send a new OTP.' }
  }

  if (normalizedOtp !== TEST_OTP_CODE) {
    return { ok: false, message: 'Invalid OTP. Use 123456 for testing.' }
  }

  const session = {
    email: normalizedEmail,
    verifiedAt: new Date().toISOString(),
    token: `test-otp-${Date.now().toString(36)}`,
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  clearOtpChallenge()

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

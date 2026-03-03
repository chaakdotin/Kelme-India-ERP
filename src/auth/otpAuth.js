const AUTH_SESSION_KEY = 'kelme_erp_auth_session'
const OTP_CHALLENGE_KEY = 'kelme_erp_otp_challenge'

const OTP_LENGTH = 6
const OTP_API_BASE = '/api/auth'

const toEmail = (value) => String(value || '').trim().toLowerCase()
const normalizeOtp = (value) => String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH)

const parseResponsePayload = async (response) => {
  const raw = await response.text()
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

const postOtpApi = async (path, body) => {
  try {
    const response = await fetch(`${OTP_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await parseResponsePayload(response)
    if (!response.ok) {
      const fallbackMessage =
        response.status >= 500
          ? 'OTP service unavailable. Please run full stack with `npm run dev`.'
          : `OTP request failed (${response.status}). Please retry.`

      return {
        ok: false,
        message: payload.message || fallbackMessage,
        ...payload,
      }
    }

    return payload
  } catch {
    return {
      ok: false,
      message: 'Unable to reach OTP service. Please retry in a moment.',
    }
  }
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

  const result = await postOtpApi('/send-otp', { email: normalizedEmail })
  if (!result.ok) {
    return result
  }

  saveOtpChallengeMeta({
    email: normalizedEmail,
    expiresAt: result.expiresAt,
    resendAvailableAt: result.resendAvailableAt,
  })

  return {
    ok: true,
    expiresAt: result.expiresAt,
    resendAvailableAt: result.resendAvailableAt,
    delivery: result.delivery,
    devOtp: result.devOtp,
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

  const result = await postOtpApi('/verify-otp', {
    email: normalizedEmail,
    otp: normalizedOtp,
  })

  if (!result.ok) {
    return result
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.session))
  clearOtpChallenge()

  return { ok: true, session: result.session }
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

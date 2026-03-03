import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import nodemailer from 'nodemailer'

dotenv.config()

const app = express()

const OTP_LENGTH = 6
const OTP_VALID_FOR_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000
const OTP_MAX_ATTEMPTS = 5

const AUTH_API_PORT = Number(process.env.AUTH_API_PORT || 8787)
const OTP_EMAIL_PROVIDER = String(process.env.OTP_EMAIL_PROVIDER || 'auto').toLowerCase()
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ALLOW_CONSOLE_OTP = parseBoolean(process.env.ALLOW_CONSOLE_OTP, !IS_PRODUCTION)
const USE_FIXED_TEST_OTP = parseBoolean(process.env.USE_FIXED_TEST_OTP, !IS_PRODUCTION)
const FIXED_TEST_OTP = String(process.env.TEST_OTP_CODE || '123456')
  .replace(/\D/g, '')
  .slice(0, OTP_LENGTH)
  .padStart(OTP_LENGTH, '0')

const toEmail = (value) => String(value || '').trim().toLowerCase()
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail(email))
const normalizeOtp = (value) => String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(OTP_LENGTH, '0')

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const defaultOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173']
const envOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set(envOrigins.length > 0 ? envOrigins : defaultOrigins)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS'))
    },
  }),
)
app.use(express.json({ limit: '10kb' }))

const otpChallenges = new Map()

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER),
)

const smtpTransport = isSmtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: parseBoolean(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT) === 465),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

const isResendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)

if (USE_FIXED_TEST_OTP) {
  console.warn(`[OTP] Fixed testing OTP mode enabled. OTP code: ${FIXED_TEST_OTP}`)
}

if (!USE_FIXED_TEST_OTP && !isSmtpConfigured && !isResendConfigured) {
  if (ALLOW_CONSOLE_OTP) {
    console.warn('[OTP] Email provider not configured. Falling back to console OTP for local development.')
  } else {
    console.warn('[OTP] Email provider not configured. Configure SMTP/Resend or enable ALLOW_CONSOLE_OTP=true.')
  }
}

const sendOtpWithSmtp = async ({ to, subject, text, html }) => {
  if (!smtpTransport) {
    throw new Error('SMTP transport is not configured.')
  }

  await smtpTransport.sendMail({
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  })
}

const sendOtpWithResend = async ({ to, subject, text, html }) => {
  if (!isResendConfigured) {
    throw new Error('Resend transport is not configured.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Resend request failed (${response.status}): ${payload || 'Unknown error'}`)
  }
}

const sendOtpEmail = async ({ email, otp, expiresAt }) => {
  const expiresAtLabel = new Date(expiresAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const subject = 'Kelme India ERP - OTP Verification Code'
  const text = `Your OTP is ${otp}. It is valid until ${expiresAtLabel}.`
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;border:1px solid #dce7e0;border-radius:12px;">
      <p style="margin:0 0 8px;color:#3d5a4f;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Kelme India ERP</p>
      <h2 style="margin:0 0 14px;color:#21322c;">Email OTP Verification</h2>
      <p style="margin:0 0 10px;color:#455f56;">Use this one-time password to sign in:</p>
      <p style="margin:0 0 14px;font-size:28px;letter-spacing:0.18em;font-weight:800;color:#1a2c26;">${otp}</p>
      <p style="margin:0;color:#5a7369;font-size:13px;">Valid till ${expiresAtLabel}.</p>
      <p style="margin:12px 0 0;color:#8ea098;font-size:12px;">If you did not request this code, ignore this email.</p>
    </div>
  `

  const providers = []
  if (OTP_EMAIL_PROVIDER === 'auto' || OTP_EMAIL_PROVIDER === 'smtp') {
    providers.push('smtp')
  }
  if (OTP_EMAIL_PROVIDER === 'auto' || OTP_EMAIL_PROVIDER === 'resend') {
    providers.push('resend')
  }

  let lastError = null

  for (const provider of providers) {
    try {
      if (provider === 'smtp' && isSmtpConfigured) {
        await sendOtpWithSmtp({ to: email, subject, text, html })
        return { provider: 'smtp' }
      }

      if (provider === 'resend' && isResendConfigured) {
        await sendOtpWithResend({ to: email, subject, text, html })
        return { provider: 'resend' }
      }
    } catch (error) {
      lastError = error
    }
  }

  if (ALLOW_CONSOLE_OTP) {
    console.info(`[DEV][OTP-FALLBACK] ${email} -> ${otp}`)
    return { provider: 'console', devOtp: otp }
  }

  throw lastError || new Error('No email provider configured. Configure SMTP or Resend variables.')
}

const removeExpiredChallenges = () => {
  const now = Date.now()
  for (const [email, challenge] of otpChallenges.entries()) {
    if (now > challenge.expiresAt) {
      otpChallenges.delete(email)
    }
  }
}

setInterval(removeExpiredChallenges, 60 * 1000).unref()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/send-otp', async (req, res) => {
  const email = toEmail(req.body?.email)

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Please enter a valid email address.' })
    return
  }

  const now = Date.now()
  const existing = otpChallenges.get(email)

  if (existing && now < existing.resendAvailableAt) {
    res.status(429).json({
      ok: false,
      message: 'Please wait before requesting another OTP.',
      resendAvailableAt: existing.resendAvailableAt,
    })
    return
  }

  const challenge = {
    email,
    otp: USE_FIXED_TEST_OTP ? FIXED_TEST_OTP : generateOtp(),
    createdAt: now,
    expiresAt: now + OTP_VALID_FOR_MS,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
    attempts: 0,
  }

  otpChallenges.set(email, challenge)

  let delivery = null
  if (USE_FIXED_TEST_OTP) {
    delivery = { provider: 'fixed-test', devOtp: challenge.otp }
  } else {
    try {
      delivery = await sendOtpEmail({
        email,
        otp: challenge.otp,
        expiresAt: challenge.expiresAt,
      })
    } catch (error) {
      otpChallenges.delete(email)
      console.error('OTP send failed:', error)
      const message =
        error?.message === 'No email provider configured. Configure SMTP or Resend variables.'
          ? 'Email OTP provider is not configured. Add SMTP/Resend env vars or set ALLOW_CONSOLE_OTP=true for local testing.'
          : 'Unable to send OTP email right now. Please retry in a moment.'

      res.status(503).json({
        ok: false,
        message,
      })
      return
    }
  }

  const responsePayload = {
    ok: true,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
    delivery: delivery.provider,
  }

  if (!IS_PRODUCTION && delivery.devOtp) {
    responsePayload.devOtp = delivery.devOtp
  }

  res.json(responsePayload)
})

app.post('/api/auth/verify-otp', (req, res) => {
  const email = toEmail(req.body?.email)
  const otpInput = normalizeOtp(req.body?.otp)

  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, message: 'Please enter a valid email address.' })
    return
  }

  const challenge = otpChallenges.get(email)
  if (!challenge) {
    res.status(400).json({ ok: false, message: 'OTP request not found. Please send OTP again.' })
    return
  }

  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(email)
    res.status(400).json({ ok: false, message: 'OTP expired. Please send a new OTP.' })
    return
  }

  if (otpInput.length !== OTP_LENGTH) {
    res.status(400).json({ ok: false, message: 'OTP must be a 6-digit code.' })
    return
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    otpChallenges.delete(email)
    res.status(429).json({ ok: false, message: 'Too many incorrect attempts. Request a new OTP.' })
    return
  }

  if (challenge.otp !== otpInput) {
    challenge.attempts += 1
    const remainingAttempts = OTP_MAX_ATTEMPTS - challenge.attempts
    if (remainingAttempts <= 0) {
      otpChallenges.delete(email)
      res.status(429).json({ ok: false, message: 'Too many incorrect attempts. Request a new OTP.' })
      return
    }

    res.status(401).json({
      ok: false,
      message: `Invalid OTP. ${remainingAttempts} attempt(s) left.`,
    })
    return
  }

  otpChallenges.delete(email)

  res.json({
    ok: true,
    session: {
      email,
      verifiedAt: new Date().toISOString(),
      token: `otp-${crypto.randomBytes(18).toString('hex')}`,
    },
  })
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')
const indexFilePath = path.resolve(distPath, 'index.html')

if (process.env.NODE_ENV === 'production' && fs.existsSync(indexFilePath)) {
  app.use(express.static(distPath))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(indexFilePath)
  })
}

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error)
  res.status(500).json({ ok: false, message: 'Internal server error.' })
})

app.listen(AUTH_API_PORT, () => {
  console.info(`OTP auth API running on http://127.0.0.1:${AUTH_API_PORT}`)
})

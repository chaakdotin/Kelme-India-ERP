# Kelme India ERP (React + OTP Email Auth)

This app now includes:
- React dashboard frontend (Vite)
- Node OTP auth API (`/api/auth/send-otp`, `/api/auth/verify-otp`)
- Real email OTP delivery via SMTP or Resend

## 1) Install

```bash
npm install
```

## 2) Configure email provider

Copy env template:

```bash
cp .env.example .env
```

Then set either:
- SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`)
- or Resend variables (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)

You can force provider with:

```env
OTP_EMAIL_PROVIDER=smtp
```

or

```env
OTP_EMAIL_PROVIDER=resend
```

`OTP_EMAIL_PROVIDER=auto` tries SMTP first, then Resend.

For quick local testing without email setup:

```env
USE_FIXED_TEST_OTP=true
TEST_OTP_CODE=123456
```

## 3) Run locally

```bash
npm run dev
```

This starts:
- API on `http://127.0.0.1:8787`
- Frontend on `http://127.0.0.1:5173`

Vite proxy forwards `/api/*` to the API.

## 4) OTP login flow

1. Enter email and click `Send OTP`
2. OTP arrives in email
3. Enter 6-digit OTP and click `Verify OTP`

## API quick reference

### POST `/api/auth/send-otp`
Body:

```json
{ "email": "user@example.com" }
```

### POST `/api/auth/verify-otp`
Body:

```json
{ "email": "user@example.com", "otp": "123456" }
```

## Notes

- OTP expires in 5 minutes.
- Resend cooldown is 30 seconds.
- Max 5 invalid attempts per OTP challenge.
- In local testing mode (`USE_FIXED_TEST_OTP=true`), OTP is fixed to `123456` and email delivery is skipped.
- In development, if SMTP/Resend is not configured, local console fallback is enabled and OTP is printed in server logs.
- For real email delivery, configure SMTP/Resend in `.env` and set `ALLOW_CONSOLE_OTP=false`.

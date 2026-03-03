# Kelme India ERP (React + Test OTP Login)

This app now includes:
- React dashboard frontend (Vite)
- Frontend-only email login flow for testing
- Fixed OTP code: `123456`

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev:web
```

Open `http://127.0.0.1:5173`.

## OTP login flow

1. Enter email and click `Send OTP`
2. Enter `123456`
3. Click `Verify OTP`

## Notes

- OTP expires in 5 minutes.
- Resend cooldown is 30 seconds.
- No backend OTP/email provider is required for this testing flow.

# Cartly

Cartly is a full-stack React Native ecommerce application backed by an Express/TypeScript API, PostgreSQL and Prisma.

## Implemented

- Complete customer shopping and account navigation
- Registration, email OTP verification, login, JWT refresh/logout and password reset
- Profile update, secure password change and password-confirmed account deletion
- PostgreSQL address CRUD with atomic default-address handling
- API-backed categories, products, search, filters, sorting and pagination
- Product variants, stock, images, ratings, reviews and related products
- Admin-protected product image upload/delete
- Shared authenticated API client with automatic refresh/retry
- Offline banner and reusable loading/error states

- Persistent guest/authenticated carts, wishlists and server-side coupons
- Transactional checkout, inventory reservation and idempotent order creation
- Order tracking, cancellation, returns, refunds and fulfilment notifications
- Firebase push registration and responsive SMTP order emails
- Administrator dashboard for catalogue, inventory, orders, returns, customers, coupons, reviews and reports

## Stack

- React Native 0.84 + TypeScript
- React Navigation
- Express 5 + TypeScript
- PostgreSQL 18
- Prisma 7
- JWT access/refresh tokens and scrypt password hashing
- Nodemailer SMTP
- Jest (mobile) and Vitest/Supertest (backend)

## Setup

Install mobile dependencies:

```powershell
npm install
```

Install backend dependencies:

```powershell
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and enter local secrets. Never commit `.env`.

Create a PostgreSQL database named `myapp`, then run:

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

## Run locally

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
npm start
```

Terminal 3:

```powershell
adb devices
npm run android:usb
```

`android:usb` configures ADB reverse for Metro port `8081` and API port `4000`. It works with USB and Android Wireless Debugging.

Health endpoint:

```text
http://localhost:4000/api/health
```

## Tests

Mobile:

```powershell
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Backend:

```powershell
cd backend
npm run typecheck
npm test
npm run build
```

Backend tests never use the development database. `npm test` creates or reuses
`myapp_test`, applies migrations, seeds deterministic catalogue data, disables
SMTP/Firebase delivery and then runs Vitest sequentially. You can optionally copy
`backend/.env.test.example` to `backend/.env.test` and set `TEST_DATABASE_URL`.

End-to-end Android flows use Maestro:

```powershell
npm run test:e2e
```

See `e2e/README.md` for the required test account and device setup.

## Database inspection

```powershell
cd backend
npx prisma studio
```

Open `http://localhost:5555`.

## Documentation

- [A-to-Z technical guide](docs/Cartly-A-to-Z-Technical-Guide.pdf)
- [Editable guide source](docs/Cartly-A-to-Z-Technical-Guide.html)

The guide documents every screen, context, API, database model, authentication flow, run command, security decision and remaining production phase.

## Security

- Passwords and OTPs are stored only as hashes.
- Refresh tokens are hashed, rotated and revocable.
- Mobile tokens use Android Keystore/iOS Keychain.
- Profile, address, review and image mutation routes require authentication.
- Image mutation additionally requires the `ADMIN` role.
- `.env`, uploaded development media and build outputs are ignored by Git.

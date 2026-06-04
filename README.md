# 💈 BarberShop Appointment App

A modern, full-stack barbershop management system with multilingual support (English, Amharic, Afan Oromo).

## Features

| Feature | Details |
|---|---|
| 📅 **Customer Booking** | Multi-step booking with service, barber, date/time selection |
| 💈 **Queue Management** | Real-time queue display, call/serve/skip actions |
| 📱 **SMS Notifications** | Africa's Talking integration for Ethiopian phone numbers |
| 💰 **Service Pricing** | Dynamic pricing management via admin panel |
| 🌐 **Multilingual** | English, አማርኛ (Amharic), Afaan Oromoo (Afan Oromo) |
| 📲 **Mobile Responsive** | Fully responsive Tailwind CSS UI |
| 💳 **Payment Gateway** | Chapa integration (Ethiopian payment gateway) |
| 🔐 **Admin Panel** | Full dashboard with appointments, queue, services, barbers management |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (via `better-sqlite3`) — no setup required
- **SMS**: Africa's Talking API
- **Payment**: Chapa Payment Gateway
- **i18n**: react-i18next

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd Barbershop_App
npm run setup
```

### 2. Configure Environment

```bash
cp .env.example server/.env
# Edit server/.env with your API keys
```

### 3. Run Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Admin Panel

Visit `/admin` and login with:
- Username: `admin`
- Password: `admin123`

> **Change the password** in production via the database.

## Environment Variables

Copy `.env.example` to `server/.env`:

```env
PORT=5000
JWT_SECRET=your_secret_here

# Africa's Talking (SMS)
AT_API_KEY=your_key
AT_USERNAME=sandbox   # Use 'sandbox' for testing

# Chapa (Payment)
CHAPA_SECRET_KEY=CHASECK_TEST-...
CLIENT_URL=http://localhost:5173
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/services` | List all services |
| GET | `/api/barbers` | List all barbers |
| POST | `/api/appointments` | Create appointment + sends SMS |
| GET | `/api/queue/today` | Today's queue |
| PATCH | `/api/queue/:id/call` | Call customer (sends SMS) |
| POST | `/api/payment/initialize` | Init Chapa payment |
| GET | `/api/payment/verify/:txRef` | Verify payment |

## Language Support

Switch languages using the **EN / አማ / OO** toggle in the navbar.

- **EN** — English
- **አማ** — አማርኛ (Amharic)
- **OO** — Afaan Oromoo (Afan Oromo)

All text, service names, barber names, and SMS messages are localized.

## Deployment

```bash
npm run build
npm start  # Serves Express on PORT=5000
```

For production, use a process manager like PM2 and serve the client `dist/` folder via nginx or from Express.

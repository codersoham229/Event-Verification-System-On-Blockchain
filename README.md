# BlockTix — Blockchain Event Ticketing & Verification System

A full-stack event ticketing platform built with React, Supabase, and Ethereum (Sepolia testnet). Organizers create events, mint tickets as NFTs, and verify attendees via QR code. Attendees collect downloadable digital badges for every event they attend.

---

## Features

### For Organizers
- Create events with date, location, capacity, and cover image
- Mint tickets as NFTs on the Sepolia blockchain and email them to attendees
- Real-time ticket verification — scan a QR code or enter Event ID + Ticket ID manually
- Mark tickets as used instantly (no MetaMask required at verify time)
- Send a digital badge to the attendee after verifying their entry
- Manage enrollment requests — approve or reject applicants
- Live dashboard stats: total events, tickets minted, tickets used

### For Attendees
- Browse events and submit enrollment requests
- Personal dashboard with all your tickets and QR codes
- **Badge System** — earn a badge every time an organizer verifies and sends one to you:
  - Bronze Explorer (0-4) - early announcements, community forum
  - Silver Trailblazer (5-9) - 5% discount, priority support
  - Gold Maverick (10-19) - 10% discount, VIP lounge access
  - Diamond Legend (20-49) - 20% discount, meet and greet, guest pass
  - Platinum Master (50+) - free Gold subscription, 30% discount, gala invite
- Download your badge as a styled PNG image

### General
- Email and password authentication via Supabase
- Mobile-responsive — collapsible sidebar, bottom nav on mobile
- QR scanner with camera or image-upload fallback

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI | shadcn/ui (Radix UI), Lucide Icons |
| Backend | Node.js + Express (tsx) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Blockchain | Ethereum Sepolia, Ethers.js, Hardhat |
| Smart Contract | Solidity 0.8.19 (ERC-721 NFT tickets) |
| Routing | Wouter |

---

## Prerequisites

- Node.js 18+
- A Supabase project (supabase.com)
- MetaMask (only needed when minting tickets, never for verification)
- Test ETH on Sepolia: faucets.chain.link/sepolia

---

## Setup

### 1. Install dependencies

`ash
npm install
`

### 2. Create a .env file

`
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CONTRACT_ADDRESS=0xABe88DaE8eB0051940b21Eac6043C97Ed4ad7F9b
`

### 3. Set up Supabase tables

Run these SQL files in your Supabase SQL Editor in order:

1. supabase-schema.sql
2. supabase-ticket-emails-schema.sql
3. supabase-enrollment-requests-schema.sql

Then add the badge column (run once if table already exists):

`sql
ALTER TABLE ticket_emails ADD COLUMN IF NOT EXISTS badge_sent BOOLEAN DEFAULT FALSE;
`

### 4. Start the dev server

`ash
npx tsx server/index.ts
`

App runs at http://localhost:5000

---

## Smart Contract

Pre-deployed on Sepolia at:

`
0xABe88DaE8eB0051940b21Eac6043C97Ed4ad7F9b
`

To redeploy your own:

1. Open Remix IDE at remix.ethereum.org
2. Paste contracts/EventTicketing.sol
3. Compile with Solidity 0.8.19+
4. Deploy to Sepolia via MetaMask
5. Update VITE_CONTRACT_ADDRESS in .env and restart

Test ETH faucets:
- https://faucets.chain.link/sepolia
- https://sepoliafaucet.com

---

## How Verification Works

1. Organizer scans attendee QR code or types Event ID + Ticket ID
2. System queries the ticket_emails table in Supabase instantly (no blockchain call needed)
3. Shows attendee email, valid/invalid, used/not-used
4. Mark as Used sets status = used in DB instantly, no MetaMask popup
5. Send Badge sets badge_sent = true on that ticket row
6. Attendee opens My Badges in their dashboard and downloads a styled PNG badge

---

## Badge Download

The PNG badge includes:
- Event name, attendee email, and event date
- Level icon and tier name matching the attendee current level
- Ticket ID and Organizer Verified stamp
- BlockTix branding with gradient background

---

## Project Structure

`
client/src/
  pages/
    home.tsx              Organizer dashboard
    user-dashboard.tsx    Attendee dashboard (tickets, badges)
    landing.tsx           Public landing page
    verify-ticket.tsx     Standalone verify page
  components/
    qr-scanner.tsx        Camera + upload QR scanner
    ui/                   shadcn/ui components
  hooks/
    use-contract.ts       Blockchain interaction hooks
    use-wallet.ts         MetaMask wallet state
  lib/
    supabase.ts           Supabase client
    contract.ts           Ethers.js contract wrapper
    auth-context.tsx      Auth provider

contracts/
  EventTicketing.sol      ERC-721 NFT ticketing contract

server/
  index.ts                Express entry point
  routes.ts               API routes
`

---

## Deployment on Vercel

### Prerequisites
- Vercel account (vercel.com)
- GitHub repository with this code pushed
- All environment variables ready

### Steps to Deploy

#### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Select your GitHub repository
4. Click **Import**

#### 3. Configure Environment Variables
In the Vercel dashboard, add these environment variables:

**Frontend Variables (used by Vite):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CONTRACT_ADDRESS=0xABe88DaE8eB0051940b21Eac6043C97Ed4ad7F9b
```

**Backend Variables (Node.js/Express):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:password@your-db
NODE_ENV=production
```

> **Note:** Get these from your Supabase project settings

#### 4. Deployment Settings
Vercel will auto-detect and use `vercel.json` configuration:
- **Build Command:** `vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- **Output Directory:** `dist/public` (frontend) and `dist/index.js` (server)
- **Start Command:** `node dist/index.js`

#### 5. Deploy
Click **Deploy** and wait for the build to complete. Your app will be live at `https://your-project.vercel.app`

### Verify Deployment
1. Check that the frontend loads at your Vercel URL
2. Test login/signup with Supabase
3. Test event creation (organizer) and browsing (attendee)
4. Verify QR code functionality

### Post-Deployment Checklist
- [ ] Frontend loads without errors
- [ ] Supabase connection works
- [ ] MetaMask wallet connects on event creation page
- [ ] QR code generation works
- [ ] Badge download works
- [ ] Verify ticket endpoint responds correctly

### Troubleshooting Vercel Deployment

| Problem | Solution |
|---------|----------|
| Build fails with "Missing environment variable" | Add all `VITE_*` and backend vars to Vercel dashboard |
| 404 on routes after deployment | vercel.json rewrites configured correctly; auto-detected |
| Supabase connection fails | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| MetaMask not connecting | Import MetaMask extension in browser; check Sepolia network |
| "Cannot find module" errors | Ensure `node_modules` not in .gitignore; dependencies in package.json |
| Database queries fail | Verify `SUPABASE_URL` and `SUPABASE_KEY` in backend environment |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| npm run dev exits with code 1 | Use npx tsx server/index.ts directly |
| Ticket shows as invalid | Ensure ticket_emails table exists in Supabase |
| Badge not appearing | Run the ALTER TABLE SQL to add badge_sent column |
| MetaMask popup on verify | Should not happen - refresh and do not connect wallet |
| QR scanner not working on iOS | Serve over HTTPS or localhost |

---

## License

MIT

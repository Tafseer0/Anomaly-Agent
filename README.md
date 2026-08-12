# Anomaly Agent

A full-stack Web application for automated business metric surveillance. Upload Excel (`.xlsx`) or CSV files to establish statistical baselines, detect significant metric deviations ($Z$-score anomalies), generate structured summary reports, and trigger automated email notifications to stakeholders.

**Magic Link1 :** | [🚀 Live Demo](https://www.anomalyagent.jo3.org)
**Magic Link2 :** | [🚀 Live Demo2](https://anomalyai.up.railway.app)

---

## Features

- **Multi-Format Ingestion**: Parses `.xlsx`, `.xls`, and `.csv` files entirely in-browser.
- **Statistical Anomaly Detection**:
  - Uses rolling $N$-period baselines and standard deviation ($Z$-scores) to identify statistically significant outliers.
  - Automatically flags metrics exceeding global or custom sensitivity thresholds.
- **Granular Threshold Control**:
  - Tune global parameters ($Z$-score threshold $\sigma$ and baseline window size).
  - Apply per-metric overrides (adjust window, tighten/loosen sensitivity, or mute specific metrics entirely).
- **Automated Reporting**: Generates plain-English summaries detailing which metrics drifted off-baseline, by how much, and when.
- **Transactional Email Dispatch**: Integrated server-side dispatching via Mailjet to deliver alerts to up to 20 recipient addresses per run.
- **Alert History**: Keeps a local audit log of dispatched reports, status, recipient lists, and affected metric lists.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start) (SSR React on Vite) |
| **Routing** | [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing) |
| **State & Data** | [TanStack Query](https://tanstack.com/query) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/), Lucide Icons |
| **File Parsing** | [SheetJS (xlsx)](https://sheetjs.com/) |
| **Mail Transport** | Mailjet API v3.1 |
| **Language** | TypeScript 5.8 |

---

## Project Structure

```text
├── src/
│   ├── components/
│   │   ├── anomaly/            # Metric cards, report panels & threshold controls
│   │   └── ui/                 # Radix UI wrapper components
│   ├── lib/
│   │   ├── alert-log.ts        # Local alert history store
│   │   ├── alerts.functions.ts # TanStack Start server function for Mailjet dispatch
│   │   ├── anomaly.ts          # Core Z-score and baseline calculation engine
│   │   └── excel.ts            # Excel/CSV parser and dataset transformation
│   └── routes/
│       ├── __root.tsx          # Root shell layout & provider wrappers
│       ├── index.tsx           # Main workspace and anomaly dashboard
│       └── history.tsx         # Alert log & history page
├── public/                     # Static assets & sample datasets
├── .env.example                # Template for environment configuration
└── vite.config.ts              # Vite + TanStack Start configuration
```

---

## Environment Setup

To enable email alert dispatching, copy `.env.example` to `.env` and provide your Mailjet API credentials:

```bash
cp .env.example .env
```

Define the following environment variables in `.env`:

```env
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
MAILJET_FROM_EMAIL=your_verified_sender_email@domain.com
```

> **Note**: `MAILJET_FROM_EMAIL` must match an active, verified sender address in your Mailjet account.

---

## Development

### Prerequisites

- Node.js `^18.0.0` or higher
- npm `^9.0.0` or higher

### Installation

```bash
npm install
```

### Run Locally

Start the local Vite development server:

```bash
npm run dev
```

Open `http://localhost:8080` in your browser.

---

## Available Scripts

| Script | Action |
|---|---|
| `npm run dev` | Starts local development server |
| `npm run build` | Builds client and server bundles for production |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run format` | Formats code with Prettier |

---

## Production Deployment

This project uses TanStack Start and Nitro under the hood, allowing seamless deployment to multiple targets without extra adapter code.

### Vercel / Netlify

1. Connect the repository to your hosting dashboard.
2. Set the environment variables (`MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM_EMAIL`).
3. Build command: `npm run build`
4. Deploy.

### Node.js / Docker Server

Build the production assets:

```bash
npm run build
```

Run the compiled server output:

```bash
node dist/server/server.js
```

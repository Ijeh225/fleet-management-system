# Fleet Management System

A full-stack fleet operations app for managing:

- trucks and drivers
- trips and dispatch
- maintenance records
- parts inventory and stock movement
- suppliers and purchase orders
- reports and dashboard analytics
- role-based user access

## Stack

- React 19 + Vite
- TypeScript
- Express
- tRPC
- Drizzle ORM
- MySQL
- Tailwind CSS

## Local development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

## Production deployment

This repo is prepared for:

- Railway cloud deployment
- Docker-based deployment

See [DEPLOYMENT.md](C:\Users\SONOFGRACE\Documents\account_directory_app\fleet-management-system\DEPLOYMENT.md) for the full setup.

## Environment variables

Copy `.env.example` and provide values for:

- `JWT_SECRET`
- `DATABASE_URL`

Optional integrations:

- OAuth
- Google Maps proxy
- storage / image generation / voice services

## Health check

The app exposes:

```text
/api/health
```

Expected response:

```json
{"ok":true}
```

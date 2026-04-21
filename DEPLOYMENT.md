# Deployment Guide

## Recommended cloud target: Railway

This repo now includes [railway.toml](C:\Users\SONOFGRACE\Documents\account_directory_app\fleet-management-system\railway.toml), which tells Railway to build from the `Dockerfile` and use `/api/health` as the deployment healthcheck.

### Railway setup

1. Push this project to GitHub.
2. In Railway, create a new project and add:
   - one service from your GitHub repo
   - one MySQL database service
3. In the app service's Variables tab, set:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

4. Add these only if you use the related features:

```env
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
```

5. In the app service settings:
   - confirm Railway is using the repo root
   - confirm the detected `Dockerfile`
   - set the pre-deploy command to `pnpm db:migrate`
6. Deploy the staged changes.

### Railway notes

- Railway injects `PORT`, and its healthchecks use that port.
- Railway's MySQL service exposes `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, and `MYSQL_URL`; using `DATABASE_URL=${{MySQL.MYSQL_URL}}` is the simplest mapping.
- If your MySQL service has a different name than `MySQL`, replace `MySQL` in the reference with your actual service name.

### Verify

After deploy, open:

```text
https://<your-railway-domain>/api/health
```

It should return a 200 response with `{"ok":true}`.

## Local Docker option

If you want a local production-style stack instead, copy `.env.example` to `.env` and run:

```bash
docker-compose up --build -d
```

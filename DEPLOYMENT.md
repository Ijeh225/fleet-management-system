# Deployment Guide

## Recommended cloud target: Render

This repo now includes [render.yaml](C:\Users\SONOFGRACE\Documents\account_directory_app\fleet-management-system\render.yaml), which configures a Git-backed Docker web service with:

- `main` branch deploys
- `autoDeployTrigger: commit`
- health checks at `/api/health`
- `pnpm db:migrate` as the pre-deploy command

### Render app service

Create or sync a Render Blueprint from this repository, then provide these required environment variables when Render prompts for them:

```env
JWT_SECRET=<long-random-secret>
DATABASE_URL=mysql://fleet_user:<MYSQL_PASSWORD>@<INTERNAL_HOST>:3306/fleet_management
```

The Blueprint already sets these non-secret values:

```env
NODE_ENV=production
PORT=10000
```

### Render MySQL service

Use a private MySQL service in the same Render workspace and region with:

```env
MYSQL_DATABASE=fleet_management
MYSQL_USER=fleet_user
MYSQL_PASSWORD=<strong-random-password>
MYSQL_ROOT_PASSWORD=<different-strong-random-password>
```

Keep the persistent disk mounted at:

```text
/var/lib/mysql
```

Build the app's `DATABASE_URL` from the MySQL service's internal connection details:

```text
mysql://fleet_user:<MYSQL_PASSWORD>@<INTERNAL_HOST>:3306/fleet_management
```

### Verify

After Render finishes deploying, open:

```text
https://<your-app>.onrender.com/api/health
```

Expected response:

```json
{"ok":true}
```

## Railway

This repo also includes [railway.toml](C:\Users\SONOFGRACE\Documents\account_directory_app\fleet-management-system\railway.toml) if you prefer Railway later.

## Local Docker option

For a local production-style stack:

```bash
docker-compose up --build -d
```

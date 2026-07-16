# Hostinger Deployment

This repo deploys as a Vite/React web container, a Node API container, and a private SQL Server container behind Traefik on a Hostinger Docker VPS.

## DNS

Create `A` records for the app and API hosts and point both to the VPS public IP.

```text
invoice      A  <vps-public-ip>
api.invoice  A  <vps-public-ip>
```

If your DNS editor asks for full names, use your real domains, for example:

```text
invoice.example.co.za
api.invoice.example.co.za
```

## GitHub Actions Variables

Create these under `Settings > Secrets and variables > Actions > Variables`:

```text
HOSTINGER_VM_ID
APP_HOST
API_HOST
VITE_API_BASE_URL
VITE_GEOAPIFY_API_KEY
MSSQL_DATABASE
MSSQL_PID
CORS_ORIGIN
```

Example values:

```text
HOSTINGER_VM_ID=1745253
APP_HOST=invoice.example.co.za
API_HOST=api.invoice.example.co.za
VITE_API_BASE_URL=https://api.invoice.example.co.za
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
MSSQL_DATABASE=HaInvoiceGen
MSSQL_PID=Express
CORS_ORIGIN=https://invoice.example.co.za
```

## GitHub Actions Secrets

Create these under `Settings > Secrets and variables > Actions > Secrets`:

```text
HOSTINGER_API_KEY
MSSQL_SA_PASSWORD
```

Use a long, strong SQL Server `sa` password. SQL Server rejects weak passwords.

## GHCR Access

The workflow builds and pushes these images to GitHub Container Registry:

```text
ghcr.io/<github-owner>/ha-invoice-gen-web:<commit-sha>
ghcr.io/<github-owner>/ha-invoice-gen-api:<commit-sha>
```

Hostinger must be able to pull both GHCR images. Make the packages public, or add GHCR credentials in Hostinger Docker Manager:

```text
Registry: ghcr.io
Username: <github-username>
Password/token: <github-personal-access-token-with-read:packages>
```

## Data Persistence

Quotes and invoices are stored in SQL Server through the API. SQL Server data lives in the Docker volume named:

```text
ha-invoice-gen-sql-data
```

Redeploying the app updates containers without deleting that volume. Do not remove the volume unless you intentionally want to delete all saved records.

The browser still keeps a local cache. On first connection to the API, existing browser records are imported into SQL automatically.

## Local Validation

Validate the compose file before deploying:

```bash
docker compose --env-file .env.example config --quiet
```

Build the frontend:

```bash
npm run build
```

Install and smoke-check the API dependencies:

```bash
cd backend
npm install
npm start
```
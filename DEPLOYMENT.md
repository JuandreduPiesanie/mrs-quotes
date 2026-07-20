# MRS Quotes deployment

## Docker deployment

Copy .env.example to .env and replace the SQL password and JWT signing key. The JWT key must be a long random secret and must not be committed.

    Copy-Item .env.example .env
    docker compose config
    docker compose up -d --build

The stack contains:

- mrs-quotes-web: Nginx serving the React PWA and proxying API and upload traffic.
- mrs-quotes-api: .NET 10 Minimal API; applies EF migrations on startup.
- mrs-quotes-db: SQL Server 2022 with persistent database storage.

Persistent volumes:

- mrs-quotes-sql-data stores SQL Server data.
- mrs-quotes-uploads stores quote photos.

The uploads volume is temporary working storage for outstanding quotes. Completing a quote requires an ERP quote number and a OneDrive or SharePoint photo-folder URL. The API saves that archive reference and then removes the completed quote's local photo files and photo rows. Completed quote records remain available through the Completed Quotes view.

The API retries database migrations for about one minute while SQL Server starts. Check startup with:

    docker compose logs -f api

## HTTPS

PWA installation and service workers require HTTPS outside localhost. Put the web container behind a TLS reverse proxy such as Traefik, Caddy, or Nginx and set APP_ORIGIN to the public HTTPS frontend origin. The browser normally needs only the web origin because Nginx proxies the API.

Back up both Docker volumes. Database backups do not include uploaded photos.

## Install on a tablet

After deploying over HTTPS:

- Android with Chrome: open the site, choose Install app or Add to Home screen.
- iPad with Safari: open the site, tap Share, then Add to Home Screen.

The installed app opens in standalone mode. Its shell can load after a prior visit without a connection, but login, calendars, submissions, and quote data still require access to the API.

## First login

On a new database, open the login page and choose the first-time setup option. Create the initial Admin account, then register other users and assign assessors to Quote Administrators from the Admin or Management screens.

## Validation before deployment

    dotnet build backend\MrsQuotes.slnx
    npm run build --prefix frontend
    docker compose --env-file .env.example config --quiet

Integration tests are present in backend\MrsQuotes.IntegrationTests. Their JWT test-host fixture is currently deferred and should be repaired before relying on automated deployment gates.

# MRS Quotes

MRS Quotes schedules insurance-repair assessments and routes submitted quotes from assessors to their assigned Quote Administrators.

## Business workflow

1. A Schedule Administrator creates an appointment for an assessor.
2. The assessor completes the visit and submits the quote with line items and photos.
3. The appointment leaves the assessor calendar and appears as an outstanding quote and calendar task for the Quote Administrator captured when the quote is submitted. Later assessor reassignment does not move historical quotes.
4. The Quote Administrator downloads the photos and uploads them to the company's OneDrive or SharePoint quote folder.
5. Completion requires both the ERP quote number and the OneDrive or SharePoint folder URL.
6. The Quote Administrator confirms every photo is present in the archive. The system retains the completed quote and archive URL, keeps local recovery copies for 48 hours, then purges them from the VPS.
7. Management maintains assessor-to-Quote-Administrator assignments.

## Roles

- Admin: unrestricted system access, including completing the assessor quote workflow on behalf of the assessor assigned to an appointment, user registration, roles, and assignments.
- Management: manages assessor assignments and has operational visibility.
- Schedule Administrator: schedules assessor appointments.
- Quote Administrator: receives submitted quotes from assigned assessors.
- Assessor: sees assigned appointments and submits or updates quotes.

The initial Admin is created from the login screen's first-time setup flow. Setup closes after the first account is created.

## Architecture

    .
    +-- backend/
    |   +-- MrsQuotes.Api/                 .NET 10 Minimal API, EF Core, JWT
    |   +-- MrsQuotes.Models/              Shared request/response contracts
    |   +-- MrsQuotes.Client/              Typed API client for tools and tests
    |   +-- MrsQuotes.IntegrationTests/    End-to-end API tests
    |   +-- MrsQuotes.slnx
    +-- frontend/                          React 19 and Vite installable PWA
    +-- docker-compose.yml                 Web, API, and SQL Server containers
    +-- .env.example
    +-- DEPLOYMENT.md

The API uses SQL Server and applies EF Core migrations automatically at startup. It includes a clean initial migration, starter pricing items, and the existing client list as seed data. Photos use persistent VPS storage while a quote is outstanding. The tablet compresses supported large images before upload, quote views load small thumbnails lazily, and ZIP downloads stream without buffering the complete archive. On completion, verified local photos enter a 48-hour recovery window before purge; quote data and the archived photo count remain in SQL Server.

## Local development

Requirements: .NET 10 SDK, Node.js 22 or newer, and SQL Server LocalDB or another SQL Server instance.

Start the backend from the repository root:

    dotnet restore backend\MrsQuotes.slnx
    dotnet run --project backend\MrsQuotes.Api\MrsQuotes.Api.csproj

Start the frontend:

    cd frontend
    npm install
    npm run dev

The web app opens at http://localhost:5173. Vite proxies API requests to http://localhost:4000.

Useful validation:

    dotnet build backend\MrsQuotes.slnx
    npm run build --prefix frontend

## Docker

    Copy-Item .env.example .env
    # Replace the placeholder SQL and JWT secrets in .env
    docker compose up -d --build

Open http://localhost:8080. SQL Server remains private inside the Compose network. API port 4000 is exposed for diagnostics.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production and tablet installation notes.

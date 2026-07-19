# MRS Quotes

MRS Quotes schedules insurance-repair assessments and routes submitted quotes from assessors to their assigned Quote Administrators.

## Business workflow

1. A Schedule Administrator creates an appointment for an assessor.
2. The assessor completes the visit and submits the quote with line items and photos.
3. The appointment leaves the assessor calendar and appears as an outstanding quote and calendar task for the assessor's assigned Quote Administrator.
4. The Quote Administrator reviews or edits the quote and completes it with the ERP quote number.
5. Management maintains assessor-to-Quote-Administrator assignments.

## Roles

- Admin: unrestricted system access, user registration, roles, and assignments.
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

The API uses SQL Server and applies EF Core migrations automatically at startup. It includes a clean initial migration, starter pricing items, and the existing client list as seed data. Uploaded quote photos use persistent storage.

## Local development

Requirements: .NET 10 SDK, Node.js 22 or newer, and SQL Server LocalDB or another SQL Server instance.

Start the backend from the repository root:

    dotnet restore backend\MrsQuotes.slnx
    dotnet run --project backend\MrsQuotes.Api\MrsQuotes.Api.csproj

Start the frontend:

    cd frontend
    npm install
    npm run dev

The web app opens at http://localhost:5173. Vite proxies API and upload requests to http://localhost:4000.

Useful validation:

    dotnet build backend\MrsQuotes.slnx
    npm run build --prefix frontend

## Docker

    Copy-Item .env.example .env
    # Replace the placeholder SQL and JWT secrets in .env
    docker compose up -d --build

Open http://localhost:8080. SQL Server remains private inside the Compose network. API port 4000 is exposed for diagnostics.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production and tablet installation notes.

# MRS Quotes

MRS Quotes is an internal web application for scheduling insurance-repair assessments and preparing, reviewing, and administering repair quotes. Field assessors use a guided three-step quote builder, while office users manage appointments, assignments, users, and submitted quotes.

## Technology stack

### Backend

- .NET 10 Minimal API
- Entity Framework Core
- SQL Server
- JWT authentication with role-based authorization
- FluentValidation
- OpenAPI and Scalar API documentation

### Frontend

- React 19 and TypeScript
- Vite
- Redux Toolkit and RTK Query
- React Router
- Material UI and MUI Data Grid
- Progressive Web App support

### Infrastructure

- Docker Compose
- Nginx
- SQL Server 2022

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment and production-operation instructions.

## Architecture

The backend API is the authoritative source for authentication, permissions, quote data, pricing, and validation. Entity Framework Core handles persistence and database migrations.

The frontend uses a feature-based structure:

- `frontend/src/app/` contains application setup, routing, the Redux store, and shared hooks.
- `frontend/src/features/` contains the authentication, calendar, scheduling, assignment, user, and quote features.
- `frontend/src/features/*/domain/` contains feature models and domain logic.
- `frontend/src/features/*/state/` contains Redux slices and selectors.
- `frontend/src/services/` contains typed API DTOs, RTK Query endpoints, session storage, and media access.
- `frontend/src/shared/` contains reusable UI components and utilities.

RTK Query manages API data and caching, while Redux Toolkit manages client-side workflow and authentication state. React Router provides URL-based navigation and protected, role-aware routes.

## Repository structure

```text
.
|-- backend/
|   |-- MrsQuotes.Api/                 .NET API, database migrations, and seed data
|   |-- MrsQuotes.Models/              Shared C# request and response contracts
|   |-- MrsQuotes.Client/              Typed API client
|   |-- MrsQuotes.IntegrationTests/    API integration-test project
|   `-- MrsQuotes.slnx
|-- frontend/                           React TypeScript application
|-- scripts/                            Supporting import scripts
|-- docs/                               UX mockups
|-- docker-compose.yml
|-- DEPLOYMENT.md
`-- README.md
```

## Run locally

### Requirements

- .NET 10 SDK
- Node.js 22 or newer
- SQL Server LocalDB or another SQL Server instance

By default, the API uses the `MrsQuotes` database on `(localdb)\MSSQLLocalDB`. To use another SQL Server instance, update the `Database` connection string in `backend/MrsQuotes.Api/appsettings.json` or provide it through configuration.

### Run the backend

From the repository root:

```powershell
dotnet restore backend\MrsQuotes.slnx
dotnet run --project backend\MrsQuotes.Api\MrsQuotes.Api.csproj
```

The API runs at `http://localhost:4000`. In Development, Scalar API documentation is available at `http://localhost:4000/scalar/v1`.

### Run the frontend

Open a second terminal from the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to `http://localhost:4000`.

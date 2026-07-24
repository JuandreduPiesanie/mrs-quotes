# Graph Report - .  (2026-07-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 796 nodes · 1508 edges · 44 communities (33 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd30cb9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 43

## God Nodes (most connected - your core abstractions)
1. `MrsQuotes.Api.Database` - 18 edges
2. `UserDto` - 17 edges
3. `compilerOptions` - 17 edges
4. `MrsQuotesDbContext` - 15 edges
5. `QuoteProvider` - 15 edges
6. `MrsQuotes.Api.Database.Models` - 14 edges
7. `MrsQuotes.Api` - 14 edges
8. `MrsQuotes.Api.Security` - 14 edges
9. `MrsQuotes.IntegrationTests` - 14 edges
10. `AuthResult` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AppRoutesProps` --references--> `Role`  [EXTRACTED]
  frontend/src/app/AppRoutes.tsx → frontend/src/app/roles.ts
- `MrsQuotesDbContext` --references--> `PriceItem`  [EXTRACTED]
  backend/MrsQuotes.Api/Database/MrsQuotesDbContext.cs → backend/MrsQuotes.Api/Database/Models/PriceItem.cs
- `Quote` --references--> `QuoteItem`  [EXTRACTED]
  backend/MrsQuotes.Api/Database/Models/Quote.cs → backend/MrsQuotes.Api/Database/Models/QuoteItem.cs
- `MrsQuotesDbContext` --references--> `QuoteItem`  [EXTRACTED]
  backend/MrsQuotes.Api/Database/MrsQuotesDbContext.cs → backend/MrsQuotes.Api/Database/Models/QuoteItem.cs
- `QuoteProvider` --implements--> `IQuoteProvider`  [EXTRACTED]
  backend/MrsQuotes.Api/Providers/Quotes/QuoteProvider.cs → backend/MrsQuotes.Api/Providers/Quotes/IQuoteProvider.cs

## Import Cycles
- None detected.

## Communities (44 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (71): useAppSelector, Role, ROLE_LABELS, ROLES, AssignmentsView(), AppointmentEditorDialogProps, CalendarView(), CalendarViewProps (+63 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (31): IResult, Task, AuthenticationHandler, Task, Program, Task, AuthenticationProvider, Task (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (29): DateTime, List, PriceItem, QuoteItem, CancellationToken, IReadOnlyList, List, Task (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (27): CancellationToken, ClaimsPrincipal, Error, IReadOnlyList, IResult, JsonSerializerOptions, Task, QuoteHandler (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (37): useAppDispatch, optimizePhoto(), preparePhotosForUpload(), createSelectedItem(), createSelectionId(), isQuoteReadyForReview(), restoreSelectedItems(), ExistingQuote (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (45): @emotion/react, @emotion/styled, dependencies, @emotion/react, @emotion/styled, lucide-react, @mui/icons-material, @mui/material (+37 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (29): App(), appointmentFromCalendar(), appointmentFromQuote(), AppRoutes(), AppRoutesProps, AssignmentsView, CalendarView, parseRouteId() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (16): ClaimsPrincipal, IResult, Task, UserHandler, List, Task, IUserProvider, List (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (30): MrsQuotes.Api, net10.0, MrsQuotes.Client, net10.0, Microsoft.NET.Sdk, MrsQuotes.IntegrationTests, net10.0, Microsoft.NET.Sdk (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (22): CancellationToken, IWebHostEnvironment, Task, DatabaseInitializer, RateSeedItem, DateTime, Appointment, DateTime (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (13): ClaimsPrincipal, IResult, Task, AppointmentHandler, List, Task, AppointmentProvider, List (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (14): ClaimsPrincipal, IResult, Task, PricingHandler, List, Task, IPricingProvider, List (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (15): ClientProblemDetails, Content, Error, List, Task, MrsQuotesClient, Content, Error (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (8): MrsQuotes.Api.Providers.Users, MrsQuotes.Api.Database, MrsQuotes.Api.Providers.Authentication, MrsQuotes.Models.Users, MrsQuotes.IntegrationTests.Common, MrsQuotes.Api.Database.Models, MrsQuotes.Models.Authentication, MrsQuotes.IntegrationTests.Tests

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (12): IResult, Task, ClientHandler, List, Task, ClientProvider, List, Task (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (9): MrsQuotes.Api.EndpointHandlers.Users, MrsQuotes.Api.Providers.Storage, MrsQuotes.Api.EndpointHandlers.Authentication, MrsQuotes.Models.Quotes, MrsQuotes.Api.Providers.Quotes, MrsQuotes.Api.EndpointHandlers.Appointments, MrsQuotes.Api.EndpointHandlers.Clients, MrsQuotes.Api.EndpointHandlers.Pricing (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (15): ASPNETCORE_ENVIRONMENT, applicationUrl, commandName, dotnetRunMessages, environmentVariables, launchBrowser, applicationUrl, commandName (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (8): AbstractValidator, CreateAppointmentRequestValidator, FirstAdminRequestValidator, LoginRequestValidator, QuotePayloadValidator, CreateUserRequestValidator, UpdateUserRequestValidator, MrsQuotes.Api.Validations

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (7): string, PolicyNames, string, RoleNames, MrsQuotes.Api.Providers.Appointments, MrsQuotes.Api.Security, MrsQuotes.Models.Appointments

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (3): ModelBuilder, InitialCreate, MrsQuotes.Api.Migrations

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (8): PwaInstallAction(), BeforeInstallPromptEvent, InstallGuidance, InstallOutcome, isAppleMobileDevice(), isRunningStandalone(), NavigatorWithStandalone, usePwaInstall()

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (6): IConfiguration, IServiceCollection, AuthenticationSetup, MrsQuotes.Api.Startup.DependencyInjection, MrsQuotes.Api.Startup.Authentication, MrsQuotes.Api.Startup.EndpointMapping

### Community 23 - "Community 23"
Cohesion: 0.43
Nodes (4): CancellationToken, Task, CompletedQuotePhotoPurgeWorker, BackgroundService

### Community 24 - "Community 24"
Cohesion: 0.43
Nodes (4): HttpContext, Task, ApiExceptionMiddleware, MrsQuotes.Api.Startup

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (4): HttpContext, Task, QuoteArchiveResult, IResult

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): MigrationBuilder, InitialCreate, Migration

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (3): ModelBuilder, MrsQuotesDbContextModelSnapshot, ModelSnapshot

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (3): ValidationEndpointExtensions, MrsQuotes.Api.Startup.Validations, RouteHandlerBuilder

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): IConfiguration, IServiceCollection, DependencyInjectionSetup

## Knowledge Gaps
- **120 isolated node(s):** `RateSeedItem`, `net10.0`, `FluentValidation (12.1.1)`, `Microsoft.AspNetCore.Authentication.JwtBearer (10.0.10)`, `Microsoft.AspNetCore.OpenApi (10.0.10)` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MrsQuotes.Api.Database` connect `Community 14` to `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 43`, `Community 11`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `MrsQuotes.Api.Security` connect `Community 19` to `Community 33`, `Community 11`, `Community 14`, `Community 16`, `Community 18`, `Community 22`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `MrsQuotes.Api.Migrations` connect `Community 20` to `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 43`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `RateSeedItem`, `net10.0`, `FluentValidation (12.1.1)` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05721003134796238 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.059887005649717516 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07542087542087542 - nodes in this community are weakly interconnected._
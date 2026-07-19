using FluentValidation;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.EndpointHandlers.Appointments;
using MrsQuotes.Api.EndpointHandlers.Authentication;
using MrsQuotes.Api.EndpointHandlers.Clients;
using MrsQuotes.Api.EndpointHandlers.Pricing;
using MrsQuotes.Api.EndpointHandlers.Quotes;
using MrsQuotes.Api.EndpointHandlers.Users;
using MrsQuotes.Api.Providers.Appointments;
using MrsQuotes.Api.Providers.Authentication;
using MrsQuotes.Api.Providers.Clients;
using MrsQuotes.Api.Providers.Pricing;
using MrsQuotes.Api.Providers.Quotes;
using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Api.Providers.Users;
using MrsQuotes.Api.Validations;
using MrsQuotes.Models.Appointments;
using MrsQuotes.Models.Authentication;
using MrsQuotes.Models.Quotes;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.Startup.DependencyInjection;

public static class DependencyInjectionSetup
{
    public static IServiceCollection RegisterServices(this IServiceCollection services, IConfiguration configuration)
    {
        if (!Program.RunningAsTest)
        {
            services.AddDbContext<MrsQuotesDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("Database")));
        }

        services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 50L * 8 * 1024 * 1024;
        });

        services.AddScoped<AuthenticationHandler>();
        services.AddScoped<UserHandler>();
        services.AddScoped<ClientHandler>();
        services.AddScoped<PricingHandler>();
        services.AddScoped<AppointmentHandler>();
        services.AddScoped<QuoteHandler>();

        services.AddScoped<IAuthenticationProvider, AuthenticationProvider>();
        services.AddScoped<IUserProvider, UserProvider>();
        services.AddScoped<IClientProvider, ClientProvider>();
        services.AddScoped<IPricingProvider, PricingProvider>();
        services.AddScoped<IAppointmentProvider, AppointmentProvider>();
        services.AddScoped<IQuoteProvider, QuoteProvider>();
        services.AddScoped<IPhotoStorage, PhotoStorage>();

        services.AddScoped<IValidator<LoginRequest>, LoginRequestValidator>();
        services.AddScoped<IValidator<FirstAdminRequest>, FirstAdminRequestValidator>();
        services.AddScoped<IValidator<CreateUserRequest>, CreateUserRequestValidator>();
        services.AddScoped<IValidator<CreateAppointmentRequest>, CreateAppointmentRequestValidator>();
        services.AddScoped<IValidator<QuotePayload>, QuotePayloadValidator>();
        services.AddScoped<IValidator<CompleteQuoteRequest>, CompleteQuoteRequestValidator>();

        return services;
    }
}

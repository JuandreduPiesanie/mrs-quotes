using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using MrsQuotes.Api.Security;

namespace MrsQuotes.Api.Startup.Authentication;

public static class AuthenticationSetup
{
    public static IServiceCollection AddMrsQuotesAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var signingKey = configuration["Authentication:JwtSigningKey"]
            ?? throw new InvalidOperationException("Authentication:JwtSigningKey is required.");
        var issuer = configuration["Authentication:Issuer"]
            ?? throw new InvalidOperationException("Authentication:Issuer is required.");
        var audience = configuration["Authentication:Audience"]
            ?? throw new InvalidOperationException("Authentication:Audience is required.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                    ClockSkew = TimeSpan.FromMinutes(2)
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyNames.AdminOnly, policy => policy.RequireRole(RoleNames.Admin));
            options.AddPolicy(PolicyNames.Management, policy => policy.RequireRole(RoleNames.Admin, RoleNames.Management));
            options.AddPolicy(PolicyNames.Schedule, policy => policy.RequireRole(RoleNames.Admin, RoleNames.ScheduleAdministrator));
            options.AddPolicy(PolicyNames.QuoteAdministrator, policy => policy.RequireRole(RoleNames.Admin, RoleNames.QuoteAdministrator));
            options.AddPolicy(PolicyNames.Assessor, policy => policy.RequireRole(RoleNames.Admin, RoleNames.Assessor));
            options.AddPolicy(PolicyNames.AssessorDirectory, policy =>
                policy.RequireRole(RoleNames.Admin, RoleNames.Management, RoleNames.ScheduleAdministrator, RoleNames.QuoteAdministrator));
            options.AddPolicy(PolicyNames.ClientDirectory, policy =>
                policy.RequireRole(RoleNames.Admin, RoleNames.Management, RoleNames.ScheduleAdministrator));
            options.AddPolicy(PolicyNames.QuoteDirectory, policy =>
                policy.RequireRole(RoleNames.Admin, RoleNames.Management, RoleNames.QuoteAdministrator, RoleNames.Assessor));
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }
}

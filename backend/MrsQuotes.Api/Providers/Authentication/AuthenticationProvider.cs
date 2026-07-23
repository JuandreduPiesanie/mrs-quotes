using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Authentication;

namespace MrsQuotes.Api.Providers.Authentication;

public sealed class AuthenticationProvider(MrsQuotesDbContext context, IConfiguration configuration)
    : IAuthenticationProvider
{
    public async Task<bool> IsInitialSetupAvailableAsync()
    {
        return !await context.Users.AnyAsync();
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null || !VerifySecret(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return CreateAuthResult(user);
    }

    public async Task<AuthResult> SetupFirstAdminAsync(FirstAdminRequest request)
    {
        if (!await IsInitialSetupAvailableAsync())
        {
            throw new InvalidOperationException("Initial setup has already been completed.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = HashSecret(request.Password),
            Role = RoleNames.Admin
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return CreateAuthResult(user);
    }

    public static string HashSecret(string secret)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(secret, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifySecret(string secret, string storedHash)
    {
        try
        {
            var parts = storedHash.Split('.');
            if (parts.Length != 2) return false;
            var salt = Convert.FromBase64String(parts[0]);
            var expected = Convert.FromBase64String(parts[1]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(secret, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private AuthResult CreateAuthResult(User user)
    {
        var signingKey = configuration["Authentication:JwtSigningKey"]!;
        var issuer = configuration["Authentication:Issuer"]!;
        var audience = configuration["Authentication:Audience"]!;
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: credentials);

        return new AuthResult
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            User = new UserSession { Id = user.Id, Name = user.Name, Email = user.Email, Role = user.Role }
        };
    }
}

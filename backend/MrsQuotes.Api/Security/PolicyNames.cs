namespace MrsQuotes.Api.Security;

public static class PolicyNames
{
    public const string AdminOnly = nameof(AdminOnly);
    public const string Management = nameof(Management);
    public const string Schedule = nameof(Schedule);
    public const string QuoteAdministrator = nameof(QuoteAdministrator);
    public const string Assessor = nameof(Assessor);
    public const string AssessorDirectory = nameof(AssessorDirectory);
    public const string ClientDirectory = nameof(ClientDirectory);
    public const string QuoteDirectory = nameof(QuoteDirectory);
}

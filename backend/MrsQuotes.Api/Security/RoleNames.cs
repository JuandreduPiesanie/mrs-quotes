namespace MrsQuotes.Api.Security;

public static class RoleNames
{
    public const string Admin = "admin";
    public const string Management = "management";
    public const string ScheduleAdministrator = "schedule_administrator";
    public const string QuoteAdministrator = "quote_administrator";
    public const string Assessor = "assessor";

    public static readonly string[] All =
    [
        Admin,
        Management,
        ScheduleAdministrator,
        QuoteAdministrator,
        Assessor
    ];
}

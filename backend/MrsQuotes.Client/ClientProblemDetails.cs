namespace MrsQuotes.Client;

public sealed class ClientProblemDetails
{
    public int? Status { get; set; }
    public string? Title { get; set; }
    public string? Detail { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }
}

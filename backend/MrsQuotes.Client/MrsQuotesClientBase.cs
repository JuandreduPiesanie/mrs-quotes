using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace MrsQuotes.Client;

public abstract class MrsQuotesClientBase
{
    protected HttpClient HttpClient { get; }
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    protected MrsQuotesClientBase(HttpClient httpClient, string? authorizationToken)
    {
        HttpClient = httpClient;
        if (!string.IsNullOrWhiteSpace(authorizationToken))
        {
            var token = authorizationToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authorizationToken[7..]
                : authorizationToken;
            HttpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Trim());
        }
    }

    protected async Task<(TResponse? Content, ClientProblemDetails? Error)> GetAsync<TResponse>(string path)
    {
        using var response = await HttpClient.GetAsync(path);
        return await ReadResponse<TResponse>(response);
    }

    protected async Task<(TResponse? Content, ClientProblemDetails? Error)> PostAsync<TRequest, TResponse>(
        string path,
        TRequest request)
    {
        using var response = await HttpClient.PostAsJsonAsync(path, request, JsonOptions);
        return await ReadResponse<TResponse>(response);
    }

    private static async Task<(TResponse? Content, ClientProblemDetails? Error)> ReadResponse<TResponse>(
        HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            ClientProblemDetails? problem = null;
            try { problem = JsonSerializer.Deserialize<ClientProblemDetails>(body, JsonOptions); }
            catch (JsonException) { }
            problem ??= new ClientProblemDetails { Detail = body };
            problem.Status ??= (int)response.StatusCode;
            return (default, problem);
        }

        return string.IsNullOrWhiteSpace(body)
            ? (default, null)
            : (JsonSerializer.Deserialize<TResponse>(body, JsonOptions), null);
    }
}

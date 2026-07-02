using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using KazakhstanStrategyApi.Controllers;
using Serilog.Context;

namespace KazakhstanStrategyApi.Middleware;

/// <summary>
/// Logs every /api request (event input) and its response (event result), tying the two
/// together with a correlation id. For non-2xx responses it logs the failure reason.
/// See LOGGING-STANDARD.md.
/// </summary>
public class RequestResponseLoggingMiddleware
{
    private const int MaxBodyLogBytes = 32 * 1024; // 32 KB cap for logged bodies
    private const string CorrelationHeader = "X-Correlation-ID";

    // Case-insensitive substrings; any JSON property whose name contains one is redacted.
    private static readonly string[] SensitiveKeys =
    {
        "password", "token", "secret", "honeypot", "authorization"
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;

    public RequestResponseLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestResponseLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only instrument the API surface; skip health checks, static assets and the SPA fallback.
        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var correlationId = ResolveCorrelationId(context);
        context.Response.Headers[CorrelationHeader] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await LogRequestAsync(context);

            var originalBody = context.Response.Body;
            using var buffer = new MemoryStream();
            context.Response.Body = buffer;

            var stopwatch = Stopwatch.StartNew();
            try
            {
                await _next(context);
                stopwatch.Stop();
                LogResponse(context, buffer, stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                // An unhandled exception has not set the status code yet (it stays 200 until an
                // outer handler produces the error page). Log it explicitly as the failure reason.
                stopwatch.Stop();
                _logger.LogError(ex,
                    "HTTP response {Method} {Path} => 500 (unhandled) in {ElapsedMs}ms reason={FailureReason}",
                    context.Request.Method, context.Request.Path.Value,
                    stopwatch.ElapsedMilliseconds, ex.GetType().Name);
                throw;
            }
            finally
            {
                // Copy the buffered response back to the real stream.
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
                context.Response.Body = originalBody;
            }
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        var incoming = context.Request.Headers[CorrelationHeader].FirstOrDefault();
        return string.IsNullOrWhiteSpace(incoming)
            ? Activity.Current?.Id ?? context.TraceIdentifier
            : incoming;
    }

    private async Task LogRequestAsync(HttpContext context)
    {
        var request = context.Request;
        var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
        var body = await ReadRequestBodyAsync(request);

        _logger.LogInformation(
            "HTTP request {Method} {Path}{QueryString} user={UserId} ip={ClientIp} body={RequestBody}",
            request.Method,
            request.Path.Value,
            request.QueryString.Value ?? string.Empty,
            userId,
            GetClientIp(context),
            body);
    }

    private void LogResponse(HttpContext context, MemoryStream buffer, long elapsedMs)
    {
        var statusCode = context.Response.StatusCode;
        var reason = context.Items.TryGetValue(ApiControllerBase.FailureReasonKey, out var r)
            ? r?.ToString()
            : null;

        // For failures without an explicit reason code, fall back to the response body's message.
        string? responseBody = null;
        if (statusCode >= 400)
        {
            responseBody = ReadResponseBody(context, buffer);
            reason ??= ExtractMessage(responseBody) ?? "unspecified";
        }

        var method = context.Request.Method;
        var path = context.Request.Path.Value;

        if (statusCode >= 500)
        {
            _logger.LogError(
                "HTTP response {Method} {Path} => {StatusCode} in {ElapsedMs}ms reason={FailureReason} body={ResponseBody}",
                method, path, statusCode, elapsedMs, reason, responseBody);
        }
        else if (statusCode >= 400)
        {
            _logger.LogWarning(
                "HTTP response {Method} {Path} => {StatusCode} in {ElapsedMs}ms reason={FailureReason} body={ResponseBody}",
                method, path, statusCode, elapsedMs, reason, responseBody);
        }
        else
        {
            _logger.LogInformation(
                "HTTP response {Method} {Path} => {StatusCode} in {ElapsedMs}ms",
                method, path, statusCode, elapsedMs);
        }
    }

    private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        if (request.ContentLength is null or 0)
            return string.Empty;

        if (!IsJson(request.ContentType))
            return "[omitted non-json]";

        if (request.ContentLength > MaxBodyLogBytes)
            return "[omitted oversized]";

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(
            request.Body, Encoding.UTF8, leaveOpen: true);
        var raw = await reader.ReadToEndAsync();
        request.Body.Position = 0; // rewind so model binding can read it again

        return Sanitize(raw);
    }

    private static string? ReadResponseBody(HttpContext context, MemoryStream buffer)
    {
        if (buffer.Length == 0 || buffer.Length > MaxBodyLogBytes)
            return null;

        if (!IsJson(context.Response.ContentType))
            return "[omitted non-json]";

        buffer.Position = 0;
        using var reader = new StreamReader(buffer, Encoding.UTF8, leaveOpen: true);
        var raw = reader.ReadToEnd();
        buffer.Position = 0;
        return Sanitize(raw);
    }

    private static bool IsJson(string? contentType)
        => contentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true;

    private static string GetClientIp(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',').FirstOrDefault()?.Trim() ?? "unknown";

        var ip = context.Connection.RemoteIpAddress?.ToString();
        return ip == "::1" ? "127.0.0.1" : ip ?? "unknown";
    }

    /// <summary>Redact sensitive JSON properties; return raw string on parse failure.</summary>
    private static string Sanitize(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(json);
            using var stream = new MemoryStream();
            using (var writer = new Utf8JsonWriter(stream))
            {
                WriteRedacted(doc.RootElement, writer, redactValue: false);
            }
            return Encoding.UTF8.GetString(stream.ToArray());
        }
        catch (JsonException)
        {
            return "[unparseable]";
        }
    }

    private static void WriteRedacted(JsonElement element, Utf8JsonWriter writer, bool redactValue)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var prop in element.EnumerateObject())
                {
                    writer.WritePropertyName(prop.Name);
                    var redact = IsSensitive(prop.Name);
                    WriteRedacted(prop.Value, writer, redact);
                }
                writer.WriteEndObject();
                break;
            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                    WriteRedacted(item, writer, redactValue);
                writer.WriteEndArray();
                break;
            default:
                if (redactValue)
                    writer.WriteStringValue("***");
                else
                    element.WriteTo(writer);
                break;
        }
    }

    private static bool IsSensitive(string propertyName)
        => SensitiveKeys.Any(k => propertyName.Contains(k, StringComparison.OrdinalIgnoreCase));

    private static string? ExtractMessage(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody) || responseBody.StartsWith('['))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty("message", out var msg))
            {
                return msg.GetString();
            }
        }
        catch (JsonException)
        {
            // ignore
        }
        return null;
    }
}

public static class RequestResponseLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestResponseLogging(this IApplicationBuilder app)
        => app.UseMiddleware<RequestResponseLoggingMiddleware>();
}

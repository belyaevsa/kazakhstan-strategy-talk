namespace KazakhstanStrategyApi.Middleware;

/// <summary>
/// Adds baseline security response headers (M2): anti-sniffing, clickjacking protection,
/// a restrictive referrer policy, and a Content-Security-Policy. HSTS is handled separately
/// by <c>app.UseHsts()</c> so it is only emitted over HTTPS in non-dev environments.
///
/// The CSP defaults accommodate the Vite SPA (server-injected inline JSON-LD / SEO tags),
/// Google Analytics and Yandex Metrica, and images served from Yandex Object Storage. It can
/// be overridden wholesale with the <c>CONTENT_SECURITY_POLICY</c> environment variable.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _csp;

    private const string DefaultCsp =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'; " +
        // 'unsafe-inline' is required for the server-injected JSON-LD/SEO tags and the SPA bootstrap.
        "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com https://region1.google-analytics.com; " +
        "frame-src https://mc.yandex.ru; " +
        "upgrade-insecure-requests";

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
        _csp = Environment.GetEnvironmentVariable("CONTENT_SECURITY_POLICY") ?? DefaultCsp;
    }

    public Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // OnStarting so headers are applied even on short-circuited/static responses.
        context.Response.OnStarting(() =>
        {
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["X-Permitted-Cross-Domain-Policies"] = "none";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";

            // Don't override a CSP a controller may have set deliberately.
            if (!headers.ContainsKey("Content-Security-Policy"))
            {
                headers["Content-Security-Policy"] = _csp;
            }

            return Task.CompletedTask;
        });

        return _next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        => app.UseMiddleware<SecurityHeadersMiddleware>();
}

using System.Threading.Channels;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;

namespace KazakhstanStrategyApi.Services;

public interface IWarmupService
{
    /// <summary>Drop the caches that must refresh on a content edit and schedule a re-warm.</summary>
    void InvalidateAndRewarm();

    /// <summary>Schedule a background re-warm (coalesced/debounced).</summary>
    void TriggerRewarm();

    /// <summary>Prime every server cache now by requesting its public endpoints over loopback.</summary>
    Task WarmAllAsync(CancellationToken ct = default);
}

/// <summary>
/// General-purpose cache warmer. On startup, and after content edits, it requests
/// the app's own public endpoints over loopback HTTP so that every cache those
/// endpoints populate (chapters tree, per-page paragraphs, sitemap, and the SEO
/// pre-render) is warm rather than cold or stale. Warming through the real
/// endpoints means it stays correct as caching evolves - no duplicated logic.
/// </summary>
public class CacheWarmupService : BackgroundService, IWarmupService
{
    private static readonly string[] Languages = { "ru", "en", "kk" };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IServer _server;
    private readonly ICacheService _cache;
    private readonly ILogger<CacheWarmupService> _logger;

    // Bounded to 1 with DropWrite: rapid edits coalesce into a single pending re-warm.
    private readonly Channel<bool> _signal =
        Channel.CreateBounded<bool>(new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public CacheWarmupService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpFactory,
        IServer server,
        ICacheService cache,
        ILogger<CacheWarmupService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpFactory = httpFactory;
        _server = server;
        _cache = cache;
        _logger = logger;
    }

    public void InvalidateAndRewarm()
    {
        // Single owner of content-cache invalidation: drop every content-derived
        // cache, then re-warm. Callers (edit endpoints) just call this.
        _cache.RemoveByPattern("chapters:");   // chapters:all, chapters:all:drafts
        _cache.RemoveByPattern("chapter:");    // chapter:{id}
        _cache.RemoveByPattern("page:");       // page:id:*, page:slug:*
        _cache.RemoveByPattern("paragraphs:"); // paragraphs:page:*
        _cache.RemoveByPattern(CacheKeys.SeoHtmlPrefix);
        _cache.Remove(CacheKeys.Sitemap);
        TriggerRewarm();
    }

    public void TriggerRewarm() => _signal.Writer.TryWrite(true);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initial warm shortly after startup (give the server a moment to bind + DB to be ready).
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            await WarmAllAsync(stoppingToken);
        }
        catch (OperationCanceledException) { return; }
        catch (Exception ex) { _logger.LogError(ex, "Initial cache warm failed"); }

        // Re-warm whenever signaled, debouncing bursts of edits.
        await foreach (var _pending in _signal.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                while (_signal.Reader.TryRead(out _)) { } // drain coalesced signals
                await WarmAllAsync(stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Cache re-warm failed"); }
        }
    }

    public async Task WarmAllAsync(CancellationToken ct = default)
    {
        var baseUrl = ResolveLoopbackBaseUrl();
        if (baseUrl == null)
        {
            _logger.LogWarning("Cache warm skipped: could not resolve a loopback HTTP address");
            return;
        }

        // Build the URL list from the current published content.
        var urls = new List<string> { "/api/chapters", "/sitemap.xml", "/robots.txt" };
        foreach (var lang in Languages) urls.Add($"/{lang}");

        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var chapters = await db.Chapters.Include(c => c.Pages).Where(c => !c.IsDraft).ToListAsync(ct);

            foreach (var chapter in chapters)
            {
                foreach (var lang in Languages) urls.Add($"/{lang}/{chapter.Slug}");
                foreach (var page in chapter.Pages.Where(p => !p.IsDraft))
                {
                    urls.Add($"/api/paragraphs/page/{page.Id}");
                    foreach (var lang in Languages) urls.Add($"/{lang}/{chapter.Slug}/{page.Slug}");
                }
            }
        }

        var client = _httpFactory.CreateClient();
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(20);
        // Signal https to the app so UseHttpsRedirection doesn't 307 the loopback call.
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");

        var ok = 0;
        foreach (var url in urls)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                using var resp = await client.GetAsync(url, ct);
                if (resp.IsSuccessStatusCode) ok++;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Cache warm failed for {Url}", url);
            }
        }

        _logger.LogInformation("Cache warmed: {Ok}/{Total} endpoints via {Base}", ok, urls.Count, baseUrl);
    }

    /// <summary>Resolve a loopback base URL from the server's bound HTTP address (fallback: ASPNETCORE_URLS / :8080).</summary>
    private string? ResolveLoopbackBaseUrl()
    {
        var addresses = _server.Features.Get<IServerAddressesFeature>()?.Addresses;
        var httpAddress = addresses?.FirstOrDefault(a => a.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                          ?? addresses?.FirstOrDefault();

        var port = PortFromAddress(httpAddress)
                   ?? PortFromAddress(Environment.GetEnvironmentVariable("ASPNETCORE_URLS"))
                   ?? 8080;

        return $"http://localhost:{port}";
    }

    private static int? PortFromAddress(string? address)
    {
        if (string.IsNullOrWhiteSpace(address)) return null;
        // Handles "http://+:8080", "http://[::]:8080", "http://0.0.0.0:8080", possibly ';'-separated.
        var first = address.Split(';', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault(a => a.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                    ?? address.Split(';', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (first == null) return null;
        var colon = first.LastIndexOf(':');
        if (colon < 0) return null;
        var portStr = first[(colon + 1)..].Trim().TrimEnd('/');
        return int.TryParse(portStr, out var p) ? p : (int?)null;
    }
}

using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;

namespace KazakhstanStrategyApi.Services;

public interface ISeoWarmupService
{
    /// <summary>Clear the SEO HTML cache and schedule a background re-warm. Call after content edits.</summary>
    void InvalidateAndRewarm();

    /// <summary>Schedule a background re-warm (coalesced/debounced).</summary>
    void TriggerRewarm();

    /// <summary>Render and cache every content URL now.</summary>
    Task WarmAllAsync(CancellationToken ct = default);
}

/// <summary>
/// Warms the SEO HTML cache on startup and re-warms it (debounced) after content
/// edits, so crawlers always hit a pre-rendered, up-to-date cache rather than a
/// cold render or stale content.
/// </summary>
public class SeoWarmupService : BackgroundService, ISeoWarmupService
{
    private static readonly string[] Languages = { "ru", "en", "kk" };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ICacheService _cache;
    private readonly ILogger<SeoWarmupService> _logger;

    // Bounded to 1 with DropWrite: many rapid edits coalesce into a single pending re-warm.
    private readonly Channel<bool> _signal =
        Channel.CreateBounded<bool>(new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public SeoWarmupService(IServiceScopeFactory scopeFactory, ICacheService cache, ILogger<SeoWarmupService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _logger = logger;
    }

    public void InvalidateAndRewarm()
    {
        _cache.RemoveByPattern(CacheKeys.SeoHtmlPrefix);
        TriggerRewarm();
    }

    public void TriggerRewarm() => _signal.Writer.TryWrite(true);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initial warm shortly after startup (give the app/DB a moment to be ready).
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            await WarmAllAsync(stoppingToken);
        }
        catch (OperationCanceledException) { return; }
        catch (Exception ex) { _logger.LogError(ex, "Initial SEO cache warm failed"); }

        // Re-warm whenever signaled, debouncing bursts of edits.
        await foreach (var pending in _signal.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                while (_signal.Reader.TryRead(out _)) { } // drain coalesced signals
                await WarmAllAsync(stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _logger.LogError(ex, "SEO cache re-warm failed"); }
        }
    }

    public async Task WarmAllAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var seo = scope.ServiceProvider.GetRequiredService<SeoMetaService>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var chapters = await db.Chapters
            .Include(c => c.Pages)
            .Where(c => !c.IsDraft)
            .ToListAsync(ct);

        var paths = new List<string>();
        foreach (var lang in Languages) paths.Add($"/{lang}");
        foreach (var chapter in chapters)
        {
            foreach (var lang in Languages) paths.Add($"/{lang}/{chapter.Slug}");
            foreach (var page in chapter.Pages.Where(p => !p.IsDraft))
                foreach (var lang in Languages)
                    paths.Add($"/{lang}/{chapter.Slug}/{page.Slug}");
        }

        foreach (var path in paths)
        {
            ct.ThrowIfCancellationRequested();
            await seo.WarmAsync(path);
        }

        _logger.LogInformation("SEO cache warmed: {Count} URLs", paths.Count);
    }
}

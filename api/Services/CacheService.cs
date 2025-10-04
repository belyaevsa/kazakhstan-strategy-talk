using Microsoft.Extensions.Caching.Memory;

namespace KazakhstanStrategyApi.Services;

public interface ICacheService
{
    T? Get<T>(string key);
    void Set<T>(string key, T value, TimeSpan? absoluteExpiration = null);
    void Remove(string key);
    void RemoveByPattern(string pattern);
}

public class CacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly HashSet<string> _cacheKeys = new();
    private readonly object _lock = new();
    private static readonly TimeSpan DefaultExpiration = TimeSpan.FromHours(24);

    public CacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public T? Get<T>(string key)
    {
        return _cache.TryGetValue(key, out T? value) ? value : default;
    }

    public void Set<T>(string key, T value, TimeSpan? absoluteExpiration = null)
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = absoluteExpiration ?? DefaultExpiration
        };

        _cache.Set(key, value, options);

        lock (_lock)
        {
            _cacheKeys.Add(key);
        }
    }

    public void Remove(string key)
    {
        _cache.Remove(key);

        lock (_lock)
        {
            _cacheKeys.Remove(key);
        }
    }

    public void RemoveByPattern(string pattern)
    {
        List<string> keysToRemove;

        lock (_lock)
        {
            keysToRemove = _cacheKeys.Where(k => k.Contains(pattern)).ToList();
        }

        foreach (var key in keysToRemove)
        {
            Remove(key);
        }
    }
}

// Cache key constants
public static class CacheKeys
{
    public const string AllChapters = "chapters:all";
    public static string Chapter(Guid id) => $"chapter:{id}";
    public static string PageById(Guid id) => $"page:id:{id}";
    public static string PageBySlug(string slug) => $"page:slug:{slug}";
    public static string ParagraphsByPage(Guid pageId) => $"paragraphs:page:{pageId}";
}

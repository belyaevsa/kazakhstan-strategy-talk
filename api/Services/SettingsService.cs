using KazakhstanStrategyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace KazakhstanStrategyApi.Services;

public class SettingsService
{
    private readonly AppDbContext _context;
    private Dictionary<string, string> _cache = new();
    private DateTime _lastRefresh = DateTime.MinValue;
    private readonly TimeSpan _refreshInterval = TimeSpan.FromMinutes(15);

    public SettingsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string?> GetSettingAsync(string key)
    {
        await RefreshCacheIfNeededAsync();
        return _cache.GetValueOrDefault(key);
    }

    public async Task<int> GetIntSettingAsync(string key, int defaultValue = 0)
    {
        var value = await GetSettingAsync(key);
        return int.TryParse(value, out var result) ? result : defaultValue;
    }

    public async Task<bool> GetBoolSettingAsync(string key, bool defaultValue = false)
    {
        var value = await GetSettingAsync(key);
        return bool.TryParse(value, out var result) ? result : defaultValue;
    }

    public async Task<List<string>> GetListSettingAsync(string key)
    {
        var value = await GetSettingAsync(key);
        if (string.IsNullOrWhiteSpace(value))
            return new List<string>();

        return value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }

    private async Task RefreshCacheIfNeededAsync()
    {
        if (DateTime.UtcNow - _lastRefresh < _refreshInterval && _cache.Any())
            return;

        var settings = await _context.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
        _cache = settings;
        _lastRefresh = DateTime.UtcNow;
    }

    public async Task SetSettingAsync(string key, string value, string? description = null)
    {
        var setting = await _context.Settings.FindAsync(key);
        if (setting == null)
        {
            setting = new Models.Setting
            {
                Key = key,
                Value = value,
                Description = description
            };
            _context.Settings.Add(setting);
        }
        else
        {
            setting.Value = value;
            setting.UpdatedAt = DateTime.UtcNow;
            if (description != null)
                setting.Description = description;
        }

        await _context.SaveChangesAsync();
        _cache[key] = value; // Update cache immediately
    }
}

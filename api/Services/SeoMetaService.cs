using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;

namespace KazakhstanStrategyApi.Services;

/// <summary>
/// Renders index.html with per-URL SEO metadata (title, description, Open Graph,
/// canonical, hreflang, html lang) so non-JS crawlers and social scrapers see real
/// per-page tags instead of the generic SPA shell. Results are cached per path.
/// </summary>
public class SeoMetaService
{
    private static readonly string[] Languages = { "ru", "en", "kk" };
    private const string DefaultLang = "ru";

    private static readonly Dictionary<string, string> SiteTitle = new()
    {
        ["ru"] = "ИТ стратегия Казахстана",
        ["en"] = "IT strategy of Kazakhstan",
        ["kk"] = "Қазақстан АТ стратегиясы",
    };

    private static readonly Dictionary<string, string> SiteDescription = new()
    {
        ["ru"] = "Интерактивный аналитический документ о стратегии развития ИТ в Казахстане. Читайте, комментируйте и обсуждайте отдельные абзацы.",
        ["en"] = "An interactive analytical document on IT development strategy in Kazakhstan. Read, comment, and engage with specific paragraphs.",
        ["kk"] = "Қазақстандағы АТ дамыту стратегиясы туралы интерактивті аналитикалық құжат. Оқыңыз, түсініктеме қалдырыңыз және талқылаңыз.",
    };

    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ICacheService _cache;
    private readonly IWebHostEnvironment _env;

    public SeoMetaService(AppDbContext db, IConfiguration configuration, ICacheService cache, IWebHostEnvironment env)
    {
        _db = db;
        _configuration = configuration;
        _cache = cache;
        _env = env;
    }

    /// <summary>
    /// Returns the SEO-enriched index.html for the given request path, or null if
    /// the default file should be served (path not a content route, or template missing).
    /// </summary>
    public async Task<string?> RenderAsync(string path, string scheme, string host)
    {
        var normalized = "/" + path.Trim('/');
        if (normalized == "/") normalized = "/";

        // Skip anything that looks like a file (has an extension in the last segment).
        var lastSegment = normalized.Split('/').Last();
        if (lastSegment.Contains('.')) return null;

        var cacheKey = $"seo:html:{normalized}";
        var cached = _cache.Get<string>(cacheKey);
        if (cached != null) return cached;

        var template = LoadTemplate();
        if (template == null) return null;

        var meta = await BuildMetaAsync(normalized, scheme, host);
        var html = Inject(template, meta);

        // Cache for 10 minutes; content edits become visible shortly after.
        _cache.Set(cacheKey, html, TimeSpan.FromMinutes(10));
        return html;
    }

    private string? LoadTemplate()
    {
        var cached = _cache.Get<string>("seo:template");
        if (cached != null) return cached;

        var indexPath = Path.Combine(_env.WebRootPath ?? "wwwroot", "index.html");
        if (!File.Exists(indexPath)) return null;

        var template = File.ReadAllText(indexPath);
        _cache.Set("seo:template", template, TimeSpan.FromMinutes(30));
        return template;
    }

    private async Task<SeoMeta> BuildMetaAsync(string path, string scheme, string host)
    {
        var baseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["App:BaseUrl"]
            ?? $"{scheme}://{host}";
        baseUrl = baseUrl.TrimEnd('/');

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var lang = segments.Length > 0 && Languages.Contains(segments[0]) ? segments[0] : DefaultLang;
        var rest = segments.Skip(Languages.Contains(segments.FirstOrDefault() ?? "") ? 1 : 0).ToArray();

        var siteTitle = SiteTitle[lang];
        var meta = new SeoMeta
        {
            Lang = lang,
            Title = siteTitle,
            Description = SiteDescription[lang],
            Canonical = $"{baseUrl}{path}",
            BaseUrl = baseUrl,
            PathWithoutLang = rest.Length > 0 ? "/" + string.Join('/', rest) : "",
        };

        // Content page: /{lang}/{chapterSlug}/{pageSlug}
        if (rest.Length >= 2)
        {
            var chapterSlug = rest[0];
            var pageSlug = rest[1];

            var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Slug == chapterSlug && !c.IsDraft);
            if (chapter != null)
            {
                var page = await _db.Pages.FirstOrDefaultAsync(p => p.ChapterId == chapter.Id && p.Slug == pageSlug && !p.IsDraft);
                if (page != null)
                {
                    var pageTr = await _db.PageTranslations.FirstOrDefaultAsync(t => t.PageId == page.Id && t.Language == lang);
                    var chapterTr = await _db.ChapterTranslations.FirstOrDefaultAsync(t => t.ChapterId == chapter.Id && t.Language == lang);

                    var pageTitle = string.IsNullOrWhiteSpace(pageTr?.Title) ? page.Title : pageTr!.Title;
                    var chapterTitle = string.IsNullOrWhiteSpace(chapterTr?.Title) ? chapter.Title : chapterTr!.Title;
                    var description = FirstNonEmpty(pageTr?.Description, page.Description, chapterTr?.Description, chapter.Description, meta.Description);

                    meta.Title = $"{siteTitle} | {chapterTitle} | {pageTitle}";
                    meta.Description = description;
                }
            }
        }
        // Chapter landing page: /{lang}/{chapterSlug} (but not /{lang}/chapters)
        else if (rest.Length == 1 && rest[0] != "chapters")
        {
            var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Slug == rest[0] && !c.IsDraft);
            if (chapter != null)
            {
                var chapterTr = await _db.ChapterTranslations.FirstOrDefaultAsync(t => t.ChapterId == chapter.Id && t.Language == lang);
                var chapterTitle = string.IsNullOrWhiteSpace(chapterTr?.Title) ? chapter.Title : chapterTr!.Title;
                var description = FirstNonEmpty(chapterTr?.Description, chapter.Description, meta.Description);

                meta.Title = $"{siteTitle} | {chapterTitle}";
                meta.Description = description;
            }
        }

        return meta;
    }

    private static string FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? "";

    private static string Inject(string html, SeoMeta meta)
    {
        var title = WebUtility.HtmlEncode(meta.Title);
        var description = WebUtility.HtmlEncode(meta.Description);
        var canonical = WebUtility.HtmlEncode(meta.Canonical);

        // <html lang="...">
        html = Regex.Replace(html, "<html[^>]*?\\blang=\"[^\"]*\"", $"<html lang=\"{meta.Lang}\"", RegexOptions.IgnoreCase);

        // <title>...</title>
        html = Regex.Replace(html, "<title>.*?</title>", $"<title>{title}</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline);

        html = ReplaceMetaContent(html, "name", "description", description);
        html = ReplaceMetaContent(html, "property", "og:title", title);
        html = ReplaceMetaContent(html, "property", "og:description", description);
        html = ReplaceMetaContent(html, "property", "og:url", canonical);
        html = ReplaceMetaContent(html, "name", "twitter:title", title);
        html = ReplaceMetaContent(html, "name", "twitter:description", description);

        // Canonical + hreflang links injected before </head>
        var links = new System.Text.StringBuilder();
        links.Append($"\n    <link rel=\"canonical\" href=\"{canonical}\" />");
        foreach (var lang in Languages)
        {
            var href = WebUtility.HtmlEncode($"{meta.BaseUrl}/{lang}{meta.PathWithoutLang}");
            links.Append($"\n    <link rel=\"alternate\" hreflang=\"{lang}\" href=\"{href}\" />");
        }
        var xdefault = WebUtility.HtmlEncode($"{meta.BaseUrl}/{DefaultLang}{meta.PathWithoutLang}");
        links.Append($"\n    <link rel=\"alternate\" hreflang=\"x-default\" href=\"{xdefault}\" />");

        html = html.Replace("</head>", links + "\n  </head>");
        return html;
    }

    // Replaces the content="" of a <meta {attr}="{value}" ...> tag, tolerating attribute order.
    private static string ReplaceMetaContent(string html, string attr, string value, string newContent)
    {
        var pattern = $"(<meta\\b[^>]*\\b{attr}=\"{Regex.Escape(value)}\"[^>]*\\bcontent=\")[^\"]*(\")";
        if (Regex.IsMatch(html, pattern, RegexOptions.IgnoreCase))
            return Regex.Replace(html, pattern, m => m.Groups[1].Value + newContent + m.Groups[2].Value, RegexOptions.IgnoreCase);

        // content attribute before the identifying attribute
        var patternAlt = $"(<meta\\b[^>]*\\bcontent=\")[^\"]*(\"[^>]*\\b{attr}=\"{Regex.Escape(value)}\")";
        if (Regex.IsMatch(html, patternAlt, RegexOptions.IgnoreCase))
            return Regex.Replace(html, patternAlt, m => m.Groups[1].Value + newContent + m.Groups[2].Value, RegexOptions.IgnoreCase);

        return html;
    }

    private class SeoMeta
    {
        public string Lang { get; set; } = DefaultLang;
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Canonical { get; set; } = "";
        public string BaseUrl { get; set; } = "";
        public string PathWithoutLang { get; set; } = "";
    }
}

using System.Net;
using System.Text.Json;
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
    // Resolved content is cached for 72h (busted + re-warmed on edits). Unknown
    // paths (e.g. crawler-scanned garbage URLs) get a short TTL so they can't
    // accumulate in memory.
    private static readonly TimeSpan ResolvedTtl = TimeSpan.FromHours(72);
    private static readonly TimeSpan UnresolvedTtl = TimeSpan.FromMinutes(1);

    public async Task<string?> RenderAsync(string path, string scheme, string host)
    {
        var normalized = "/" + path.Trim('/');
        if (normalized == "/") normalized = "/";

        // Skip anything that looks like a file (has an extension in the last segment).
        var lastSegment = normalized.Split('/').Last();
        if (lastSegment.Contains('.')) return null;

        var cacheKey = $"{CacheKeys.SeoHtmlPrefix}:{normalized}";
        var cached = _cache.Get<string>(cacheKey);
        if (cached != null) return cached;

        var template = LoadTemplate();
        if (template == null) return null;

        var meta = await BuildMetaAsync(normalized, scheme, host);
        var html = Inject(template, meta);

        _cache.Set(cacheKey, html, meta.Resolved ? ResolvedTtl : UnresolvedTtl);
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
                    meta.Resolved = true;
                    meta.JsonLd = BuildArticleJsonLd(meta, siteTitle, pageTitle, chapterTitle, chapterSlug, description, page.CreatedAt, page.UpdatedAt ?? page.CreatedAt);

                    // Render the page body as HTML so non-JS crawlers see real content,
                    // not just the empty SPA shell.
                    try
                    {
                        var paragraphs = await _db.Paragraphs
                            .Where(p => p.PageId == page.Id && !p.IsHidden)
                            .OrderBy(p => p.OrderIndex)
                            .ToListAsync();

                        Dictionary<Guid, string> paraTranslations = new();
                        if (paragraphs.Count > 0)
                        {
                            var paraIds = paragraphs.Select(p => p.Id).ToList();
                            paraTranslations = await _db.ParagraphTranslations
                                .Where(tr => paraIds.Contains(tr.ParagraphId) && tr.Language == lang)
                                .ToDictionaryAsync(tr => tr.ParagraphId, tr => tr.Content);
                        }

                        meta.BodyHtml = RenderBody(pageTitle, description, paragraphs, paraTranslations);
                    }
                    catch
                    {
                        // Body rendering is best-effort; head meta still ships if it fails.
                    }
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
                meta.Resolved = true;
            }
        }
        // Homepage: /{lang} or /
        else if (rest.Length == 0)
        {
            meta.Resolved = true;
            meta.JsonLd = BuildWebSiteJsonLd(meta, siteTitle);
        }

        return meta;
    }

    private static string BuildArticleJsonLd(SeoMeta meta, string siteTitle, string pageTitle, string chapterTitle,
        string chapterSlug, string description, DateTime datePublished, DateTime dateModified)
    {
        var logoUrl = $"{meta.BaseUrl}/web-app-manifest-512x512.png";
        var publisher = new Dictionary<string, object>
        {
            ["@type"] = "Organization",
            ["name"] = siteTitle,
            ["logo"] = new Dictionary<string, object> { ["@type"] = "ImageObject", ["url"] = logoUrl },
        };

        var article = new Dictionary<string, object>
        {
            ["@type"] = "Article",
            ["headline"] = pageTitle,
            ["description"] = description,
            ["inLanguage"] = meta.Lang,
            ["url"] = meta.Canonical,
            ["mainEntityOfPage"] = meta.Canonical,
            ["image"] = logoUrl,
            ["datePublished"] = datePublished.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ["dateModified"] = dateModified.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ["author"] = publisher,
            ["publisher"] = publisher,
            ["isPartOf"] = new Dictionary<string, object>
            {
                ["@type"] = "WebSite",
                ["name"] = siteTitle,
                ["url"] = $"{meta.BaseUrl}/{meta.Lang}",
            },
        };

        var breadcrumb = new Dictionary<string, object>
        {
            ["@type"] = "BreadcrumbList",
            ["itemListElement"] = new object[]
            {
                new Dictionary<string, object> { ["@type"] = "ListItem", ["position"] = 1, ["name"] = siteTitle, ["item"] = $"{meta.BaseUrl}/{meta.Lang}" },
                new Dictionary<string, object> { ["@type"] = "ListItem", ["position"] = 2, ["name"] = chapterTitle, ["item"] = $"{meta.BaseUrl}/{meta.Lang}/{chapterSlug}" },
                new Dictionary<string, object> { ["@type"] = "ListItem", ["position"] = 3, ["name"] = pageTitle, ["item"] = meta.Canonical },
            },
        };

        var graph = new Dictionary<string, object>
        {
            ["@context"] = "https://schema.org",
            ["@graph"] = new object[] { article, breadcrumb },
        };

        return JsonSerializer.Serialize(graph);
    }

    private static string BuildWebSiteJsonLd(SeoMeta meta, string siteTitle)
    {
        var website = new Dictionary<string, object>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "WebSite",
            ["name"] = siteTitle,
            ["url"] = $"{meta.BaseUrl}/{meta.Lang}",
            ["inLanguage"] = meta.Lang,
            ["description"] = meta.Description,
            ["publisher"] = new Dictionary<string, object>
            {
                ["@type"] = "Organization",
                ["name"] = siteTitle,
                ["logo"] = new Dictionary<string, object>
                {
                    ["@type"] = "ImageObject",
                    ["url"] = $"{meta.BaseUrl}/web-app-manifest-512x512.png",
                },
            },
        };

        return JsonSerializer.Serialize(website);
    }

    private static string FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? "";

    // Build a semantic HTML representation of the page for crawlers.
    private static string RenderBody(string pageTitle, string description, List<Models.Paragraph> paragraphs, Dictionary<Guid, string> translations)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append("<article>");
        sb.Append($"<h1>{WebUtility.HtmlEncode(pageTitle)}</h1>");
        if (!string.IsNullOrWhiteSpace(description))
        {
            sb.Append($"<p>{WebUtility.HtmlEncode(description)}</p>");
        }

        foreach (var p in paragraphs)
        {
            var content = translations.TryGetValue(p.Id, out var tr) && !string.IsNullOrWhiteSpace(tr) ? tr : p.Content;

            switch (p.Type)
            {
                case Models.ParagraphType.Header:
                case Models.ParagraphType.Header1:
                    sb.Append($"<h2>{InlineToHtml(content)}</h2>");
                    break;
                case Models.ParagraphType.Header2:
                    sb.Append($"<h3>{InlineToHtml(content)}</h3>");
                    break;
                case Models.ParagraphType.Header3:
                    sb.Append($"<h4>{InlineToHtml(content)}</h4>");
                    break;
                case Models.ParagraphType.Quote:
                    sb.Append($"<blockquote>{InlineToHtml(content)}</blockquote>");
                    break;
                case Models.ParagraphType.Callout:
                    sb.Append($"<aside>{InlineToHtml(content)}</aside>");
                    break;
                case Models.ParagraphType.Code:
                    sb.Append($"<pre><code>{WebUtility.HtmlEncode(content)}</code></pre>");
                    break;
                case Models.ParagraphType.List:
                    sb.Append("<ul>");
                    foreach (var line in content.Split('\n'))
                    {
                        var item = line.TrimStart('-', '*', ' ', '\t').Trim();
                        if (!string.IsNullOrWhiteSpace(item)) sb.Append($"<li>{InlineToHtml(item)}</li>");
                    }
                    sb.Append("</ul>");
                    break;
                case Models.ParagraphType.Table:
                    sb.Append(RenderTable(content));
                    break;
                case Models.ParagraphType.Image:
                    var alt = WebUtility.HtmlEncode(p.Caption ?? "");
                    sb.Append($"<figure><img src=\"{WebUtility.HtmlEncode(content)}\" alt=\"{alt}\" loading=\"lazy\" />");
                    if (!string.IsNullOrWhiteSpace(p.Caption)) sb.Append($"<figcaption>{alt}</figcaption>");
                    sb.Append("</figure>");
                    break;
                case Models.ParagraphType.Divider:
                    sb.Append("<hr />");
                    break;
                case Models.ParagraphType.Link:
                case Models.ParagraphType.Text:
                default:
                    if (!string.IsNullOrWhiteSpace(content)) sb.Append($"<p>{InlineToHtml(content)}</p>");
                    break;
            }
        }

        sb.Append("</article>");
        return sb.ToString();
    }

    private static string RenderTable(string markdown)
    {
        var lines = markdown.Trim().Split('\n').Where(l => l.Trim().Length > 0).ToList();
        if (lines.Count < 2) return $"<p>{InlineToHtml(markdown)}</p>";

        string[] Cells(string line) => line.Split('|').Select(c => c.Trim()).Where(c => c.Length > 0).ToArray();

        var sb = new System.Text.StringBuilder("<table><thead><tr>");
        foreach (var h in Cells(lines[0])) sb.Append($"<th>{InlineToHtml(h)}</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var row in lines.Skip(2))
        {
            sb.Append("<tr>");
            foreach (var c in Cells(row)) sb.Append($"<td>{InlineToHtml(c)}</td>");
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table>");
        return sb.ToString();
    }

    // Convert inline Markdown (links, footnotes, bold, italic) to safe HTML.
    private static string InlineToHtml(string? raw)
    {
        var text = WebUtility.HtmlEncode(raw ?? "");
        // Footnotes [[term|def|url|label]] -> just the term
        text = Regex.Replace(text, @"\[\[([^\|\]]+)\|[^\]]*?\]\]", m => m.Groups[1].Value.Trim());
        // Links [text](url) -> <a>
        text = Regex.Replace(text, @"\[([^\]]+)\]\(([^)]+)\)",
            m => $"<a href=\"{m.Groups[2].Value}\" rel=\"noopener\">{m.Groups[1].Value}</a>");
        // Bold / italic
        text = Regex.Replace(text, @"\*\*([^*]+)\*\*", "<strong>$1</strong>");
        text = Regex.Replace(text, @"(?<!\*)\*([^*]+)\*(?!\*)", "<em>$1</em>");
        return text;
    }

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

        // JSON-LD structured data (System.Text.Json escapes <, >, & so it can't break out of the script tag)
        if (!string.IsNullOrEmpty(meta.JsonLd))
        {
            links.Append($"\n    <script type=\"application/ld+json\">{meta.JsonLd}</script>");
        }

        html = html.Replace("</head>", links + "\n  </head>");

        // Render the article into the SPA root so crawlers without JS see real
        // content. React's createRoot().render() replaces these children on mount,
        // so users with JS never see it.
        if (!string.IsNullOrEmpty(meta.BodyHtml))
        {
            html = Regex.Replace(
                html,
                "<div id=\"root\">\\s*</div>",
                $"<div id=\"root\">{meta.BodyHtml}</div>",
                RegexOptions.IgnoreCase);
        }

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
        public string BodyHtml { get; set; } = "";
        public string JsonLd { get; set; } = "";
        public bool Resolved { get; set; } = false;
    }
}

using System.Text.Json;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Services;

/// <summary>
/// Server-side translations for notification emails (title/message templates and
/// email chrome), keyed by language. Mirrors the frontend notification.* strings so
/// emails match the recipient's profile language instead of always being English.
/// </summary>
public static class NotificationLocalizer
{
    private const string DefaultLang = "ru";
    private static readonly string[] Supported = { "ru", "en", "kk" };

    // lang -> key -> template
    private static readonly Dictionary<string, Dictionary<string, string>> Strings = new()
    {
        ["en"] = new()
        {
            ["commentReply.title"] = "New reply to your comment",
            ["commentReply.message"] = "{{username}} replied to your comment on '{{pageName}}': {{preview}}",
            ["newComment.title"] = "New comment on followed page",
            ["newComment.message"] = "{{username}} commented on '{{pageName}}': {{preview}}",
            ["pageUpdate.title"] = "Page updated",
            ["pageUpdate.message"] = "{{username}} updated the page '{{pageName}}'",
            ["suggestionApproved.title"] = "Your suggestion was approved",
            ["suggestionApproved.message"] = "{{username}} approved your suggestion on '{{pageName}}'",
            ["suggestionRejected.title"] = "Your suggestion was not accepted",
            ["suggestionRejected.message"] = "{{username}} reviewed your suggestion on '{{pageName}}'",
            ["newSuggestion.title"] = "New suggestion to review",
            ["newSuggestion.message"] = "{{username}} suggested an edit on '{{pageName}}'",
            ["email.viewPage"] = "View Page",
            ["email.footerNote"] = "You received this email because you have notifications enabled for Kazakhstan IT Strategy.",
            ["email.footerPrefs"] = "To change your notification preferences, visit your profile settings.",
            ["email.digestSubject"] = "Your {{frequency}} notification digest - {{count}} new notification(s)",
            ["email.digestHeading"] = "You have {{count}} new notification(s)",
            ["freq.immediate"] = "immediate",
            ["freq.hourly"] = "hourly",
            ["freq.daily"] = "daily",
        },
        ["ru"] = new()
        {
            ["commentReply.title"] = "Новый ответ на ваш комментарий",
            ["commentReply.message"] = "{{username}} ответил на ваш комментарий на странице '{{pageName}}': {{preview}}",
            ["newComment.title"] = "Новый комментарий на отслеживаемой странице",
            ["newComment.message"] = "{{username}} прокомментировал страницу '{{pageName}}': {{preview}}",
            ["pageUpdate.title"] = "Страница обновлена",
            ["pageUpdate.message"] = "{{username}} обновил страницу '{{pageName}}'",
            ["suggestionApproved.title"] = "Ваше предложение одобрено",
            ["suggestionApproved.message"] = "{{username}} одобрил ваше предложение на странице '{{pageName}}'",
            ["suggestionRejected.title"] = "Ваше предложение не принято",
            ["suggestionRejected.message"] = "{{username}} рассмотрел ваше предложение на странице '{{pageName}}'",
            ["newSuggestion.title"] = "Новое предложение на рассмотрение",
            ["newSuggestion.message"] = "{{username}} предложил правку на странице '{{pageName}}'",
            ["email.viewPage"] = "Открыть страницу",
            ["email.footerNote"] = "Вы получили это письмо, потому что у вас включены уведомления для Kazakhstan IT Strategy.",
            ["email.footerPrefs"] = "Чтобы изменить настройки уведомлений, откройте настройки профиля.",
            ["email.digestSubject"] = "Ваш дайджест уведомлений ({{frequency}}) - {{count}} новых",
            ["email.digestHeading"] = "У вас {{count}} новых уведомлений",
            ["freq.immediate"] = "мгновенный",
            ["freq.hourly"] = "ежечасный",
            ["freq.daily"] = "ежедневный",
        },
        ["kk"] = new()
        {
            ["commentReply.title"] = "Түсініктемеңізге жаңа жауап",
            ["commentReply.message"] = "{{username}} '{{pageName}}' бетінде түсініктемеңізге жауап берді: {{preview}}",
            ["newComment.title"] = "Бақыланатын бетте жаңа түсініктеме",
            ["newComment.message"] = "{{username}} '{{pageName}}' бетіне түсініктеме қалдырды: {{preview}}",
            ["pageUpdate.title"] = "Бет жаңартылды",
            ["pageUpdate.message"] = "{{username}} '{{pageName}}' бетін жаңартты",
            ["suggestionApproved.title"] = "Сіздің ұсынысыңыз бекітілді",
            ["suggestionApproved.message"] = "{{username}} '{{pageName}}' бетінде ұсынысыңызды бекітті",
            ["suggestionRejected.title"] = "Ұсынысыңыз қабылданбады",
            ["suggestionRejected.message"] = "{{username}} '{{pageName}}' бетіндегі ұсынысыңызды қарады",
            ["newSuggestion.title"] = "Қарауға жаңа ұсыныс",
            ["newSuggestion.message"] = "{{username}} '{{pageName}}' бетінде түзету ұсынды",
            ["email.viewPage"] = "Бетті ашу",
            ["email.footerNote"] = "Сіз бұл хатты Kazakhstan IT Strategy хабарламаларын қосқандықтан алдыңыз.",
            ["email.footerPrefs"] = "Хабарлама параметрлерін өзгерту үшін профиль баптауларын ашыңыз.",
            ["email.digestSubject"] = "Хабарламалар дайджесті ({{frequency}}) - {{count}} жаңа",
            ["email.digestHeading"] = "Сізде {{count}} жаңа хабарлама бар",
            ["freq.immediate"] = "лездік",
            ["freq.hourly"] = "сағат сайын",
            ["freq.daily"] = "күн сайын",
        },
    };

    private static string Normalize(string? lang) =>
        !string.IsNullOrWhiteSpace(lang) && Supported.Contains(lang) ? lang : DefaultLang;

    /// <summary>Look up a chrome/label string, substituting {{name}} params.</summary>
    public static string T(string key, string? lang, IReadOnlyDictionary<string, string>? p = null)
    {
        var l = Normalize(lang);
        if (!Strings[l].TryGetValue(key, out var template) && !Strings[DefaultLang].TryGetValue(key, out template))
            return key;
        return Substitute(template, p);
    }

    /// <summary>Localized notification title from its TitleKey + Parameters (falls back to stored Title).</summary>
    public static string Title(Notification n, string? lang) => RenderKey(n.TitleKey, n.Parameters, lang) ?? n.Title;

    /// <summary>Localized notification message from its MessageKey + Parameters (falls back to stored Message).</summary>
    public static string Message(Notification n, string? lang) => RenderKey(n.MessageKey, n.Parameters, lang) ?? n.Message;

    private static string? RenderKey(string? fullKey, string? parametersJson, string? lang)
    {
        if (string.IsNullOrWhiteSpace(fullKey)) return null;
        // Keys are stored as "notification.commentReply.title"; strip the prefix.
        var key = fullKey.StartsWith("notification.") ? fullKey["notification.".Length..] : fullKey;
        var l = Normalize(lang);
        if (!Strings[l].TryGetValue(key, out var template) && !Strings[DefaultLang].TryGetValue(key, out template))
            return null;
        return SubstituteJson(template, parametersJson);
    }

    private static string Substitute(string template, IReadOnlyDictionary<string, string>? p)
    {
        if (p == null) return template;
        foreach (var kv in p) template = template.Replace("{{" + kv.Key + "}}", kv.Value);
        return template;
    }

    private static string SubstituteJson(string template, string? parametersJson)
    {
        if (string.IsNullOrEmpty(parametersJson)) return template;
        try
        {
            using var doc = JsonDocument.Parse(parametersJson);
            foreach (var prop in doc.RootElement.EnumerateObject())
                template = template.Replace("{{" + prop.Name + "}}", prop.Value.ToString());
        }
        catch { /* leave placeholders on malformed params */ }
        return template;
    }
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const LANGS = ["ru", "en", "kk"] as const;
const DEFAULT_LANG = "ru";

// Insert or update a <link> in <head>, keyed by rel (+ optional hreflang).
function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Maintains the per-page canonical URL, og:url, and hreflang alternates
 * (ru/en/kk + x-default) as the user navigates. Complements the server-side
 * meta injection for JS-executing crawlers.
 */
export function useSeoLinks() {
  const location = useLocation();

  useEffect(() => {
    const { origin, pathname } = window.location;
    const segments = pathname.split("/").filter(Boolean);
    const hasLang = (LANGS as readonly string[]).includes(segments[0]);
    const restPath = (hasLang ? segments.slice(1) : segments).join("/");
    const suffix = restPath ? `/${restPath}` : "";

    const canonical = `${origin}${pathname}`;
    upsertLink("canonical", canonical);

    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", canonical);

    LANGS.forEach((l) => upsertLink("alternate", `${origin}/${l}${suffix}`, l));
    upsertLink("alternate", `${origin}/${DEFAULT_LANG}${suffix}`, "x-default");
  }, [location.pathname]);
}

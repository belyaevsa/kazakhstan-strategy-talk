import { useEffect } from "react";

/**
 * Injects <meta name="robots" content="noindex, nofollow"> into <head> while the
 * component is mounted, and removes it on unmount. Use on private/transactional pages
 * (email verification, password reset, auth) that should never be indexed. Complements
 * the robots.txt Disallow rules for crawlers that only read on-page meta.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}

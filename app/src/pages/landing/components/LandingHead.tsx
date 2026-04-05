import { useEffect } from "react";
import { LANDING_SEO } from "@/pages/landing/constants";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: LANDING_SEO.siteName,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  description: LANDING_SEO.description,
} as const;

/**
 * Syncs document metadata from `LANDING_SEO` for SPA navigation and social crawlers that execute JS.
 */
export function LandingHead() {
  useEffect(() => {
    document.title = LANDING_SEO.title;
    setMeta("name", "description", LANDING_SEO.description);
    setMeta("name", "keywords", LANDING_SEO.keywords);
    setMeta("property", "og:title", LANDING_SEO.title);
    setMeta("property", "og:description", LANDING_SEO.description);
    setMeta("property", "og:type", LANDING_SEO.ogType);
    setMeta("property", "og:site_name", LANDING_SEO.siteName);
    setMeta("property", "og:image", new URL(LANDING_SEO.ogImage, window.location.origin).href);
    setMeta("property", "twitter:card", "summary_large_image");
    setMeta("property", "twitter:title", LANDING_SEO.title);
    setMeta("property", "twitter:description", LANDING_SEO.description);

    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${window.location.origin}/`;
    if (!canonical.parentElement) document.head.appendChild(canonical);

    const scriptId = "landing-jsonld";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = scriptId;
      scriptEl.type = "application/ld+json";
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);
  }, []);

  return null;
}

import type {
  SiteSettings,
  SiteSettingsRecord,
  SocialLinks,
  Hero,
  Seo,
  NavigationItem,
} from "../types/site-settings.ts";
import { resolveFile } from "../client.ts";

function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function nullableText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : String(v);
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function mapSocialLinks(v: unknown): SocialLinks {
  const o = obj(v);
  if (!o) return {};
  const out: SocialLinks = {};
  for (const [platform, url] of Object.entries(o)) {
    out[platform] = typeof url === "string" && url ? url : null;
  }
  return out;
}

function mapHero(v: unknown): Hero | null {
  const o = obj(v);
  if (!o) return null;
  const hero: Hero = {};
  const s = (k: string): string | undefined => {
    const val = o[k];
    return typeof val === "string" ? val : undefined;
  };
  const t = s("titulo");
  if (t) hero.titulo = t;
  const slug = s("slug");
  if (slug) hero.slug = slug;
  const imagen = s("imagen");
  if (imagen) hero.imagen = imagen;
  const subtitulo = s("subtitulo");
  if (subtitulo) hero.subtitulo = subtitulo;
  const fecha = s("fecha");
  if (fecha) hero.fecha = fecha;
  const ubicacion = s("ubicacion");
  if (ubicacion) hero.ubicacion = ubicacion;
  const fechaEvento = s("fechaEvento");
  if (fechaEvento) hero.fechaEvento = fechaEvento;
  return hero;
}

function mapSeo(v: unknown): Seo {
  const o = obj(v);
  if (!o) return {};
  const out: Seo = {};
  for (const [k, val] of Object.entries(o)) out[k] = val;
  return out;
}

function mapNavigation(v: unknown): NavigationItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
    .map((item) => {
      const nav: NavigationItem = {
        label: text(item.label),
        href: text(item.href),
      };
      if (typeof item.isActive === "boolean") nav.isActive = item.isActive;
      return nav;
    })
    .filter((item) => item.label !== "" || item.href !== "");
}

/** Maps a raw `site_settings` record into a domain SiteSettings (singleton). */
export function mapSiteSettings(r: SiteSettingsRecord): SiteSettings {
  return {
    id: r.id,
    siteName: text(r.siteName),
    description: nullableText(r.description),
    addressLine: nullableText(r.addressLine),
    phone: nullableText(r.phone),
    email: nullableText(r.email),
    mapEmbedUrl: nullableText(r.mapEmbedUrl),
    logoUrl: resolveFile(r as import("../client.ts").PBRecord, r.logo),
    socialLinks: mapSocialLinks(r.socialLinks),
    hero: mapHero(r.hero),
    seo: mapSeo(r.seo),
    navigation: mapNavigation(r.navigation),
    created: r.created,
    updated: r.updated,
  };
}
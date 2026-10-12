import { resolveFile } from "../client.js";
function text(v) {
    return typeof v === "string" ? v : "";
}
function nullableText(v) {
    if (v === null || v === undefined || v === "")
        return null;
    return typeof v === "string" ? v : String(v);
}
function obj(v) {
    return v && typeof v === "object" && !Array.isArray(v)
        ? v
        : null;
}
function mapSocialLinks(v) {
    const o = obj(v);
    if (!o)
        return {};
    const out = {};
    for (const [platform, url] of Object.entries(o)) {
        out[platform] = typeof url === "string" && url ? url : null;
    }
    return out;
}
function mapHero(v) {
    const o = obj(v);
    if (!o)
        return null;
    const hero = {};
    const s = (k) => {
        const val = o[k];
        return typeof val === "string" ? val : undefined;
    };
    const t = s("titulo");
    if (t)
        hero.titulo = t;
    const slug = s("slug");
    if (slug)
        hero.slug = slug;
    const imagen = s("imagen");
    if (imagen)
        hero.imagen = imagen;
    const subtitulo = s("subtitulo");
    if (subtitulo)
        hero.subtitulo = subtitulo;
    const fecha = s("fecha");
    if (fecha)
        hero.fecha = fecha;
    const ubicacion = s("ubicacion");
    if (ubicacion)
        hero.ubicacion = ubicacion;
    const fechaEvento = s("fechaEvento");
    if (fechaEvento)
        hero.fechaEvento = fechaEvento;
    return hero;
}
function mapSeo(v) {
    const o = obj(v);
    if (!o)
        return {};
    const out = {};
    for (const [k, val] of Object.entries(o))
        out[k] = val;
    return out;
}
function mapNavigation(v) {
    if (!Array.isArray(v))
        return [];
    return v
        .filter((x) => !!x && typeof x === "object" && !Array.isArray(x))
        .map((item) => {
        const nav = {
            label: text(item.label),
            href: text(item.href),
        };
        if (typeof item.isActive === "boolean")
            nav.isActive = item.isActive;
        return nav;
    })
        .filter((item) => item.label !== "" || item.href !== "");
}
/** Maps a raw `site_settings` record into a domain SiteSettings (singleton). */
export function mapSiteSettings(r) {
    return {
        id: r.id,
        siteName: text(r.siteName),
        description: nullableText(r.description),
        addressLine: nullableText(r.addressLine),
        phone: nullableText(r.phone),
        email: nullableText(r.email),
        mapEmbedUrl: nullableText(r.mapEmbedUrl),
        logoUrl: resolveFile(r, r.logo),
        socialLinks: mapSocialLinks(r.socialLinks),
        hero: mapHero(r.hero),
        seo: mapSeo(r.seo),
        navigation: mapNavigation(r.navigation),
        created: r.created,
        updated: r.updated,
    };
}

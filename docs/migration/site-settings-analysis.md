# Auditoría de datos dinámicos para `site_settings`

Revisión: **2026-11-02**. Auditoría del frontend/schema/DAL e integración local
con fallback; el singleton fue creado y verificado, según la evidencia al final.

## Alcance correcto

`site_settings` es un singleton para configuración global del sitio, no un CMS
para todo el texto de las páginas. El schema ya tenía identidad, contacto,
navegación, hero y SEO. Se añadió el JSON `literature` para los datos operativos
del área de Literatura.

| Dato actual | Fuente/candidato | Recomendación |
| --- | --- | --- |
| Inventario mensual y horario semanal de venta | `site_settings.literature` | Preparado en DAL/UI. Inventario requiere fecha confirmada; ventas informadas son martes-jueves, 17:00–18:00. |
| Nombre/logo y navegación | `site_settings.siteName`, `logo`, `navigation` | Layout/Header/Footer ya leen esos campos cuando existe registro; conservan fallbacks actuales. |
| Dirección, teléfono, correo y mapa | `site_settings.addressLine`, `phone`, `email`, `mapEmbedUrl` | `Ubicacion.astro` ya los lee con fallback. El usuario confirmó dirección, teléfono y correo el 2026-11-02; el mapa conserva la URL ya presente en el sitio. |
| Descripción y SEO global | `description`, `seo` | Layout ya consume descripción, imagen Open Graph/Twitter, tarjeta y keywords como valores globales opcionales; títulos específicos siguen por página. |
| Redes sociales | `site_settings.socialLinks` | El campo existe pero no hay consumidor visible ni enlaces configurados en la interfaz actual; decidir si se desean mostrar. |
| Hero de inicio | `site_settings.hero` ya existe | El usuario eligió configuración manual en `hero`. La portada solo muestra un hero completo configurado; el singleton inicia con la invitación de agosto de 2026 y el usuario la editará. No se deriva de Events/Posts. |
| Anuncio de FraterNA No. 80 | Post `fraterna_80` y assets locales; la página fija título/imagen | Mantener como Post/contenido editorial y hacer que la página consuma el post; no meterlo en el singleton. |
| Eventos, noticias, grupos, radio y literatura | Colecciones DAL respectivas | Ya pertenecen a Events, Posts, Groups, RadioBroadcasts y Literature; no duplicar en `site_settings`. |
| Reflexiones | Google Sheets | Fuera de PocketBase por decisión vigente. |
| Funciones de servicios y textos legales | Texto estático de páginas | No son datos operativos de configuración. Mantenerlos versionados y revisar legalmente cuando corresponda. |

Astro construye salida **estática**. El usuario confirmó que le sirve que los
cambios del singleton aparezcan tras el siguiente build/deploy. No se encontró
configuración de un webhook de rebuild en este repositorio; la configuración
externa de Vercel no se inspeccionó.

## Verificación de `site_settings`

La inspección autenticada del 2026-11-02 encontró 0 registros antes del alta. El
schema exige `siteName`; list/view son públicas y create/update/delete están
restringidas. El campo `literature` se añadió tras autorización explícita y un
dry-run posterior reportó `unchanged`. El usuario creó el singleton desde
PocketBase Admin el 2026-11-02.

Datos confirmados para preparar el primer registro:

- Nombre del proyecto: **Neuróticos Anónimos Área Norte CDMX**.
- Dirección: Av. José Loreto Fabela 726, San Juan de Aragón VII Secc, Gustavo A.
  Madero, 07910 CDMX.
- Teléfono: (55) 1234 5678.
- Correo: contacto@areanortecdmx.org.mx.
- Literatura: martes, miércoles y jueves, 17:00–18:00. Próximo inventario queda
  sin configurar hasta recibir una fecha confirmada.
- Hero manual inicial: se reutilizará la invitación existente de agosto de 2026
  para que haya un hero editable en PocketBase; el usuario lo actualizará después.
- Aplicación: los cambios se verán tras el siguiente build/deploy de Astro.

## Alta y verificación del singleton — 2026-11-02

La inspección autenticada confirmó el schema esperado, incluido el JSON
`literature`; list/view son públicas y create/update/delete están restringidas.
Antes del alta, un GET remoto de solo lectura a
`site_settings/records?perPage=2` devolvió `totalItems=0`. Tras la creación del
usuario, otro GET de solo lectura encontró exactamente un registro y confirmó
que coincide con el payload aprobado; no se imprimieron credenciales. La fecha
de inventario no está configurada.

Payload creado desde Admin (solo campos confirmados):

```json
{
  "siteName": "Neuróticos Anónimos Área Norte CDMX",
  "addressLine": "Av. José Loreto Fabela 726, San Juan de Aragón VII Secc, Gustavo A. Madero, 07910 CDMX",
  "phone": "(55) 1234 5678",
  "email": "contacto@areanortecdmx.org.mx",
  "hero": {
    "titulo": "Aniversario del Area Norte",
    "slug": "/noticias/invitaciones-agosto-2026",
    "imagen": "/assets/blog/compartimientos/agosto/area_aniversario_2026.jpeg",
    "subtitulo": "Evento del mes"
  },
  "literature": {
    "salesSchedule": {
      "days": [2, 3, 4],
      "startTime": "17:00",
      "endTime": "18:00"
    }
  }
}
```

El hero reutiliza la invitación de agosto de 2026 que estaba antes en la portada
y su imagen pública local. El usuario lo actualizará después. El payload omite
logo, mapa, descripción, navegación, SEO, redes sociales y fecha de inventario.
El schema, access rules y demás registros no se modificaron.

La build local `./node_modules/.bin/astro build` completó con datos remotos y
generó 48 páginas. Las comprobaciones de `dist/index.html` encontraron el título,
enlace e imagen del hero; las de `dist/servicios/literatura/index.html`
encontraron el horario martes-jueves, 17:00–18:00. El asset del hero existe en
`dist`. No se hizo deploy ni se inspeccionó Vercel.

## Producción — 2026-11-02

GET público de `https://na-areanorte-cdmx.vercel.app/` devolvió HTTP 200. Su
sección hero todavía muestra “Encuentro Regional de Literatura”, con enlace al
post y cover anteriores; no incluye el título ni la imagen configurados en
`site_settings`. La build local de `feature/26.7` sí contiene ambos. La lectura
de PocketBase confirma que el dato está guardado, así que producción está
sirviendo una build anterior. El estado del preview de branch no pudo consultarse:
Vercel CLI rechazó el token local. No se ejecutó deploy de producción.

El usuario compartió el preview asociado al último push:
`na-areanorte-cdmx-l21zhfgol-bitkays-projects.vercel.app`. La lectura anónima
de `/` y `/servicios/literatura/` devolvió la pantalla `Login – Vercel`, no el
HTML de Astro; Deployment Protection impide verificar el contenido desde este
entorno. Vercel documenta un bypass de automatización mediante el header
`x-vercel-protection-bypass`; no hay un valor configurado localmente. `.env` está
ignorado por Git. Nunca copiar el valor del bypass a la conversación ni a logs.

## Siguiente paso

El usuario reportó que agregó `PUBLIC_POCKETBASE_URL` a las variables de entorno
de Preview en Vercel tras advertirle Vite que el prefijo `PUBLIC_` expone el
valor al navegador. Es una URL pública de PocketBase, sin credenciales. Luego
confirmó el Preview, aunque la build asociada a `bb69911` inicialmente falló.

El usuario confirmó que resolvió el fallo de build y que el Preview permitió
avanzar a la auditoría de fallbacks. Ese Preview validó el estado anterior a su
retiro; el siguiente build debe revisar los cambios DAL-only. Después sigue la
auditoría de backups, recuperación, seguridad y release.

## Error de build del 2026-11-02

El deployment de Vercel para `ce7556e` llegó a prerender y falló al consultar
`site_settings`: Railway respondió HTTP 502 con `Application failed to respond`.
Las compilaciones de Vite y Astro habían terminado; el DAL propagó correctamente
el error de API. Después del fallo, las solicitudes de solo lectura a
`/api/health` y `site_settings` respondieron HTTP 200. `npm run build` local con
PocketBase conectado completó 48 páginas. Esto sugiere una indisponibilidad
transitoria de Railway; no identifica su causa interna ni prueba que el Preview
Vercel posterior haya pasado. Reintentar el deployment.

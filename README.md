# NA Area Norte CDMX

![Astro](https://img.shields.io/badge/astro-%23222222?style=for-the-badge&logo=astro&logoColor=ffffff)
![React](https://img.shields.io/badge/react-%2320232a?style=for-the-badge&logo=react&logoColor=61dafb)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338b2ac?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/typescript-%23007acc?style=for-the-badge&logo=typescript&logoColor=ffffff)

Sitio web informativo para **Neuróticos Anónimos Área Norte CDMX** — un programa gratuito de 12 pasos para la recuperación emocional.

### Despliegue en: https://na-areanorte-cdmx.vercel.app/ 

![Captura del Sitio](./na-area-norte-ss-01.png)

## Migración V2

Consultar el [estado actual](docs/migration/README.md) y el [roadmap](docs/migration/roadmap.md). Área Norte tiene únicamente los distritos 1, 2, 4 y 5.

## Características

- **Diseño Responsivo** — Interfaz accesible en todos los dispositivos
- **Modo Oscuro** — Tema claro/oscuro con persistencia
- **Blog de Noticias** — Contenido dinámico para eventos y convenciones
- **Directorio de Grupos** — Información de grupos organizados por los distritos 1, 2, 4 y 5
- **Mapas Interactivos** — Integración con Google Maps
- **SEO Optimizado** — Meta tags y estructura semántica

## Tecnologías

| Tecnología   | Versión |
| ------------ | ------- |
| Astro        | 5.16.15 |
| React        | 19.2.4  |
| Tailwind CSS | 4.1.18  |
| TypeScript   | -       |

### Dependencias adicionales

- `@astrojs/react` — Integración de React
- `@iconify-json/*` — Sistemas de iconos (Material Symbols + MDI)
- `@tailwindcss/*` — Plugins para Tailwind
- `astro-icon` — Componente de iconos para Astro

## Inicio Rápido

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Construir para producción
pnpm build

# Previsualizar build local
pnpm preview
```

El servidor de desarrollo estará disponible en `http://localhost:4321`.

## Estructura del Proyecto

```
/
├── public/                  # Assets estáticos
├── src/
│   ├── assets/              # Imágenes y recursos
│   ├── blog/                # Posts del blog (Markdown)
│   ├── components/          # Componentes Astro/React
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Directorio.tsx
│   │   └── MobileMenu.jsx
│   ├── content.config.ts    # Configuración de Content Collections
│   ├── data/
│   │   └── grupos/          # Fallback JSON de grupos por distrito
│   ├── layouts/             # Layouts de página
│   │   ├── Layout.astro
│   │   └── MarkdownPostLayout.astro
│   ├── pages/               # Rutas del sitio
│   │   ├── index.astro
│   │   ├── noticias.astro
│   │   ├── directorio.astro
│   │   ├── servicios.astro
│   │   └── contacto.astro
│   ├── styles/              # Estilos globales
│   ├── types/               # Definiciones TypeScript
│   └── utils/               # Funciones utilitarias
├── astro.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Secciones del Sitio

| Página         | Descripción                                                   |
| -------------- | ------------------------------------------------------------- |
| **Inicio**     | Mensaje principal, noticias recientes, mapa y contacto        |
| **Noticias**   | Blog con eventos, convenciones y etiquetas categorizadas      |
| **Directorio** | Grupos organizados por los distritos 1, 2, 4 y 5 con horarios y ubicaciones |
| **Servicios**  | Programa de 12 pasos y recursos de recuperación               |
| **Contacto**   | Formulario, ubicación y medios de contacto                    |

## Gestión de Contenido

La transición a PocketBase está en curso. El contenido migrado se presenta desde
PocketBase mediante la DAL. Se conservan fuentes Markdown/JSON V1 para reproducir
las migraciones históricas; ya no son fallback de presentación. Consulta el
[estado de migración](docs/migration/README.md).

Astro Content Collections conserva y valida la colección Markdown histórica de
noticias. Los scripts de migración también usan esos archivos y los JSON de V1;
la presentación del contenido migrado consulta PocketBase por DAL.

## Diseño

- **Paleta**: Colores primarios verdes para identidad institucional
- **Tipografía**: Sistema jerárquico para legibilidad
- **Iconografía**: Material Symbols y MDI
- **Responsive**: Mobile-first con breakpoints optimizados

## Despliegue

Compatible con plataformas de hosting estático:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## Licencia

Proyecto desarrollado para Neuróticos Anónimos Área Norte CDMX.

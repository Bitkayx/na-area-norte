# NA Area Norte CDMX

Un sitio web informativo para el programa de recuperación emocional "Neuróticos Anónimos" en el Área Norte de la Ciudad de México. Ofrecemos un programa gratuito de 12 pasos diseñado para ayudar a las personas a encontrar el equilibrio, la paz mental y una vida libre de angustias.

## 🌟 Características

- **Diseño Responsivo**: Interfaz moderna y accesible para todos los dispositivos
- **Modo Oscuro**: Soporte completo para tema claro/oscuro
- **Blog de Noticias**: Sistema de contenido dinámico para eventos y convenciones
- **Directorio de Grupos**: Información detallada de grupos de apoyo por distritos
- **Mapas Interactivos**: Integración con Google Maps para ubicaciones
- **Navegación Intuitiva**: Estructura organizada para fácil acceso a información

## 🚀 Tecnologías

- **Astro 5.16.15**: Framework moderno para sitios web estáticos
- **React 19.2.4**: Biblioteca para componentes interactivos
- **Tailwind CSS 4.1.18**: Framework de CSS para diseño rápido
- **TypeScript**: Tipado estático para mejor desarrollo
- **Astro Icon**: Sistema de iconos optimizado
- **Content Collections**: Gestión de contenido estructurado

## 📁 Estructura del Proyecto

```
/
├── public/                 # Assets estáticos
├── src/
│   ├── components/         # Componentes React/Astro
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Directorio.tsx
│   │   ├── BlogPost.astro
│   │   └── MobileMenu.jsx
│   ├── data/              # Datos JSON
│   │   └── grupos/        # Información de grupos por distrito
│   ├── layouts/           # Layouts de página
│   │   ├── Layout.astro
│   │   └── MarkdownPostLayout.astro
│   ├── pages/             # Páginas del sitio
│   │   ├── index.astro
│   │   ├── noticias.astro
│   │   ├── directorio.astro
│   │   ├── servicios.astro
│   │   └── contacto.astro
│   ├── blog/              # Contenido del blog (Markdown)
│   ├── styles/            # Estilos CSS
│   └── utils/             # Utilidades TypeScript
├── dist/                  # Build de producción
└── package.json
```

## 🛠️ Comandos de Desarrollo

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando                | Acción                                            |
| ---------------------- | ------------------------------------------------- |
| `pnpm install`         | Instala las dependencias                          |
| `pnpm dev`             | Inicia servidor de desarrollo en `localhost:4321` |
| `pnpm build`           | Construye el sitio para producción en `./dist/`   |
| `pnpm preview`         | Previsualiza el build localmente                  |
| `pnpm astro ...`       | Ejecuta comandos CLI de Astro                     |
| `pnpm astro -- --help` | Obtiene ayuda con el CLI de Astro                 |

## 📝 Secciones del Sitio

### 🏠 Página Principal

- Mensaje principal de recuperación emocional
- Noticias recientes del programa
- Mapa interactivo con ubicación principal
- Información de contacto

### 📰 Noticias

- Blog dinámico con eventos y convenciones
- Sistema de etiquetas categorizadas
- Diseño responsivo para lectura

### 📋 Directorio de Grupos

- Información organizada por 5 distritos
- Detalles de horarios y ubicaciones
- Integración con mapas para cada grupo
- Filtros de búsqueda

### 🤝 Servicios

- Información sobre el programa de 12 pasos
- Detalles de reuniones y grupos de apoyo
- Recursos para recuperación

### 📞 Contacto

- Formulario de contacto
- Información de ubicación principal
- Teléfono y correo electrónico

## 🎨 Diseño y Estilos

- **Paleta de Colores**: Diseño profesional con colores primarios verdes
- **Tipografía**: Sistema jerárquico para mejor legibilidad
- **Iconos**: Material Symbols y MDI para consistencia visual
- **Responsive**: Mobile-first con breakpoints optimizados

## 📊 Gestión de Contenido

El sitio utiliza **Astro Content Collections** para:

- **Blog**: Posts en formato Markdown con frontmatter estructurado
- **Grupos**: Datos JSON organizados por distritos
- **Validación**: Tipado estático para todo el contenido

## 🔧 Configuración

- **Astro Config**: Configuración optimizada para React y Tailwind
- **TypeScript**: Configuración estricta para mejor desarrollo
- **Tailwind**: Configuración personalizada con plugins adicionales
- **Iconos**: Sistema optimizado con múltiples librerías

## 🌐 Despliegue

El sitio está optimizado para despliegue en plataformas estáticas como:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 📄 Licencia

Proyecto desarrollado para Neuróticos Anónimos Área Norte CDMX.

---

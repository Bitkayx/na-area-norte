import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://na-areanorte-cdmx.vercel.app",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@data": "/src/data",
        "@utils": "/src/utils",
      },
    },
  },
  integrations: [
    icon(),
    react(),
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});

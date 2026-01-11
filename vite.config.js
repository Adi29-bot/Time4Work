import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // Updates the app automatically when you deploy new changes
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Time4Work Staff Portal",
        short_name: "Time4Work",
        description: "Staff timesheet and schedule management",
        theme_color: "#EBCB4B", // Your Login Yellow
        background_color: "#ffffff",
        display: "standalone", // Hides the browser URL bar
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png", // We will generate these next
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});

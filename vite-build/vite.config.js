/**
 * Vite config for shared-source import and subfolder deployment.
 */
import { defineConfig } from "vite";

export default defineConfig({
  // Allows publishing under subfolders (ex: /authorized-crossing/).
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    fs: {
      allow: [".."],
    },
  },
});

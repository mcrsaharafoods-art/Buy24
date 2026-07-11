import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        entry: "server",
        // @ts-expect-error - Preset is used by Vinxi/Nitro underneath but missing in TanStack Start types
        preset: "vercel",
      },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

if (process.env && process.env.NODE_ENV === "development" && !process.env.VITE_WEB_DOMAIN) {
    throw new Error("You must specify a valid VITE_WEB_DOMAIN.");
}

// https://vite.dev/config/
const config = defineConfig({
    base: '/',                             // change if host under a subpath
    server: {
        host: true,
        hmr: { host: `${process.env.VITE_WEB_DOMAIN}` },     // helpful when behind Traefik
        origin: `https://${process.env.VITE_WEB_DOMAIN}`,    // fixes HMR ws origin in some setups
    },
    plugins: [
        // this is the plugin that enables path aliases
        viteTsConfigPaths({
            projects: [`./tsconfig.json`],
        }),
        tailwindcss(),
        react()
    ],
})

export default config

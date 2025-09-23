import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
const config = defineConfig({
    base: '/',                            // change if host under a subpath
    server: {
        host: true,
        hmr: { host: 'web.localdev.online' },     // helpful when behind Traefik
        origin: 'https://web.localdev.online',    // fixes HMR ws origin in some setups
    },
    plugins: [
        // this is the plugin that enables path aliases
        viteTsConfigPaths({
            projects: [`./tsconfig.json`],
        }),
        // Local HTTPS with Caddy
        // caddyPlugin(),
        tailwindcss(),
        react()
    ],
})

export default config
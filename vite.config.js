import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Configuración básica de PWA para permitir la instalación en el celular
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tletl Inspecciones NFPA',
        short_name: 'TletlApp',
        description: 'Software de inspección técnica industrial',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    // Permite que ngrok conecte sin errores de seguridad
    allowedHosts: true 
  },
  optimizeDeps: {
    include: ['dexie']
  }
})
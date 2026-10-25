import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { handleSuggest } from './server/suggest.js'

/**
 * Serves POST /api/suggest during `npm run dev`, mirroring the Vercel function
 * in api/suggest.ts. Reads ANTHROPIC_API_KEY from .env.local on the server side;
 * it has no VITE_ prefix, so Vite never exposes it to the browser.
 */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'adventuretime-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/suggest', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        req.on('data', (chunk: Buffer) => {
          raw += chunk.toString()
        })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const result = await handleSuggest(JSON.parse(raw || 'null'), req.headers.authorization ?? null, {
              anthropicApiKey: env.ANTHROPIC_API_KEY,
              supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
              supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
              allowAnonymous: env.AI_ALLOW_ANONYMOUS === 'true',
            })
            res.statusCode = result.status
            res.end(JSON.stringify(result.body))
          } catch (error) {
            console.error('suggest failed', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Suggestion service error.' }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(loadEnv(mode, process.cwd(), ''))],
}))

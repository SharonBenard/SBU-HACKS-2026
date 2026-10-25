/**
 * Vercel serverless function: POST /api/suggest.
 * Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
 */
import { handleSuggest } from '../server/suggest.js'

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Send a JSON body.' }, { status: 400 })
  }
  try {
    const result = await handleSuggest(body, request.headers.get('authorization'), {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
      allowAnonymous: process.env.AI_ALLOW_ANONYMOUS === 'true',
    })
    return Response.json(result.body, { status: result.status })
  } catch (error) {
    console.error('suggest failed', error)
    return Response.json({ error: 'Suggestion service error.' }, { status: 500 })
  }
}

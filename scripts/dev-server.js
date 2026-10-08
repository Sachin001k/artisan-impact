// Local dev server for `npm run dev` / `npm start`.
//
// Serves the static site AND runs the /api/* functions (Razorpay order
// creation + payment verification), so payments work locally without the
// Vercel CLI. Mirrors vercel.json: clean URLs (/account → account.html)
// and the /admin, /admin/products rewrites.
//
// In production Vercel serves the same files and api/*.js functions itself;
// this file is only for local development.

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.join(ROOT, '.env'), quiet: true })

const REQUIRED_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])

const START_PORT = Number(process.env.PORT) || 8000
const SHOULD_OPEN = process.argv.includes('--open')

const REWRITES = {
  '/admin': '/admin.html',
  '/admin/products': '/admin-products.html',
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

// Never serve secrets or tooling over HTTP
const BLOCKED = [/^\/\.env/, /^\/\.git/, /^\/\.vercel/, /^\/node_modules\//, /^\/scripts\//, /^\/api\//]

// Adds the Express-style helpers Vercel functions expect (res.status().json())
function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(data))
    return res
  }
  return res
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function handleApi(req, res, pathname) {
  const name = pathname.replace(/^\/api\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9-]+$/i.test(name)) return res.status(404).json({ error: 'Not found' })

  const file = path.join(ROOT, 'api', `${name}.js`)
  try {
    await fs.access(file)
  } catch {
    return res.status(404).json({ error: 'Not found' })
  }

  req.body = await readJsonBody(req)
  try {
    const mod = await import(pathToFileURL(file).href)
    await mod.default(req, res)
  } catch (err) {
    console.error(`[api/${name}]`, err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
}

// /index.html → /, /account.html → /account, /admin-products.html → /admin/products
function toCleanUrl(pathname) {
  if (pathname === '/admin-products.html' || pathname === '/admin-products') return '/admin/products'
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length)
  if (pathname.endsWith('.html')) return pathname.slice(0, -'.html'.length)
  return null
}

async function resolveStaticFile(pathname) {
  pathname = REWRITES[pathname.replace(/\/$/, '')] || pathname
  if (pathname.endsWith('/')) pathname += 'index.html'

  const candidates = path.extname(pathname) ? [pathname] : [pathname + '.html', pathname + '/index.html']
  for (const candidate of candidates) {
    const file = path.join(ROOT, candidate)
    if (!file.startsWith(ROOT)) return null // path traversal
    try {
      const stat = await fs.stat(file)
      if (stat.isFile()) return file
    } catch {}
  }
  return null
}

async function handleStatic(req, res, pathname) {
  if (BLOCKED.some((re) => re.test(pathname))) {
    res.statusCode = 404
    return res.end('Not found')
  }

  const file = await resolveStaticFile(pathname)
  if (!file) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.end('Not found')
  }

  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'no-store')
  res.end(await fs.readFile(file))
}

const server = http.createServer(async (req, res) => {
  decorateResponse(res)
  const { pathname, search } = new URL(req.url, 'http://localhost')
  const decoded = decodeURIComponent(pathname)

  // Never show .html in the address bar (same as cleanUrls on Vercel)
  const cleanPath = toCleanUrl(decoded)
  if (cleanPath) {
    res.writeHead(301, { Location: cleanPath + search })
    return res.end()
  }

  try {
    if (decoded.startsWith('/api/')) await handleApi(req, res, decoded)
    else await handleStatic(req, res, decoded)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

// If the port is taken (e.g. another project's server), try the next one
function listen(port, attemptsLeft = 20) {
  const onError = (err) => {
    server.off('listening', onListening)
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`Port ${port} is busy, trying ${port + 1}…`)
      listen(port + 1, attemptsLeft - 1)
    } else {
      throw err
    }
  }
  const onListening = () => {
    server.off('error', onError)
    const url = `http://localhost:${port}`
    console.log(`\n  Artisan Impact running at ${url}`)
    console.log(`  Admin dashboard:          ${url}/admin\n`)
    if (missingEnv.length) {
      console.warn(`  ⚠ Missing in .env: ${missingEnv.join(', ')} — payments will fail until these are set.\n`)
    }
    if (SHOULD_OPEN) {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open'
      exec(`${opener} ${url}`)
    }
  }
  server.once('error', onError)
  server.once('listening', onListening)
  server.listen(port)
}

listen(START_PORT)

/**
 * Google OAuth 2.0 module for Electron desktop app.
 *
 * Flow:
 * 1. Open Google consent screen in a BrowserWindow
 * 2. Capture redirect with auth code via a local loopback server
 * 3. Exchange for access + refresh tokens
 * 4. Store tokens in userData/google-tokens.json
 * 5. Auto-refresh access token using refresh token
 *
 * Swap CLIENT_ID / CLIENT_SECRET when you have real credentials.
 */

import { app, BrowserWindow } from 'electron'
import { google } from 'googleapis'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { createServer, type Server } from 'http'
import { URL } from 'url'

// ── Placeholder credentials (swap when you register your Google Cloud project) ──
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
const REDIRECT_PORT = 48271 // random high port for loopback
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email'
]

interface StoredTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  email?: string
}

function tokenPath(): string {
  return join(app.getPath('userData'), 'google-tokens.json')
}

function loadTokens(): StoredTokens | null {
  const p = tokenPath()
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return null
  }
}

function saveTokens(tokens: StoredTokens): void {
  writeFileSync(tokenPath(), JSON.stringify(tokens, null, 2), 'utf-8')
}

function deleteTokens(): void {
  const p = tokenPath()
  if (existsSync(p)) unlinkSync(p)
}

// ── OAuth2 client singleton ──

let oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null

function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  if (!oauthClient) {
    oauthClient = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  }
  return oauthClient
}

/**
 * Try to restore a session from stored tokens (called on app start).
 * Returns true if valid tokens were loaded and the client is ready.
 */
export function restoreSession(): boolean {
  const tokens = loadTokens()
  if (!tokens) return false
  const client = getOAuth2Client()
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  })
  return true
}

/**
 * Start the interactive OAuth flow. Opens a BrowserWindow for the user
 * to sign in with Google, then captures the auth code.
 */
export function startAuthFlow(): Promise<{ email: string }> {
  return new Promise((resolve, reject) => {
    const client = getOAuth2Client()

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // always get refresh token
    })

    let server: Server | null = null
    let authWindow: BrowserWindow | null = null

    // Loopback HTTP server to capture the redirect
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h2>Authorization denied.</h2><p>You can close this window.</p></body></html>')
          cleanup()
          reject(new Error(`Google auth denied: ${error}`))
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end('<html><body><h2>Missing code.</h2></body></html>')
          return
        }

        // Exchange code for tokens
        const { tokens } = await client.getToken(code)
        client.setCredentials(tokens)

        // Fetch user email
        const oauth2 = google.oauth2({ version: 'v2', auth: client })
        const { data } = await oauth2.userinfo.get()
        const email = data.email ?? 'unknown'

        // Persist
        saveTokens({
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token!,
          expiry_date: tokens.expiry_date!,
          email
        })

        // Listen for token refreshes and persist them
        client.on('tokens', (newTokens) => {
          const existing = loadTokens()
          if (existing) {
            saveTokens({
              ...existing,
              access_token: newTokens.access_token ?? existing.access_token,
              expiry_date: newTokens.expiry_date ?? existing.expiry_date
            })
          }
        })

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`<html><body><h2>Connected as ${email}!</h2><p>You can close this window and return to EHR Buddy.</p></body></html>`)
        cleanup()
        resolve({ email })
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Something went wrong.</h2></body></html>')
        cleanup()
        reject(err)
      }
    })

    server.listen(REDIRECT_PORT, () => {
      // Open auth window
      authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })
      authWindow.loadURL(authUrl)
      authWindow.on('closed', () => {
        authWindow = null
        // If user closed the window before completing auth
        cleanup()
      })
    })

    function cleanup() {
      if (server) {
        server.close()
        server = null
      }
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close()
        authWindow = null
      }
    }
  })
}

/**
 * Get connection status.
 */
export function getAuthStatus(): { connected: boolean; email: string | null } {
  const tokens = loadTokens()
  if (!tokens) return { connected: false, email: null }
  return { connected: true, email: tokens.email ?? null }
}

/**
 * Disconnect — delete stored tokens and reset client.
 */
export function disconnect(): void {
  deleteTokens()
  oauthClient = null
}

/**
 * Return the authenticated OAuth2 client (for use by calendar/sheets/drive modules).
 * Throws if not connected.
 */
export function getAuthClient(): InstanceType<typeof google.auth.OAuth2> {
  const client = getOAuth2Client()
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not connected to Google. Go to Settings → Connect Google.')
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  })

  // Ensure token refresh events are persisted
  client.removeAllListeners('tokens')
  client.on('tokens', (newTokens) => {
    const existing = loadTokens()
    if (existing) {
      saveTokens({
        ...existing,
        access_token: newTokens.access_token ?? existing.access_token,
        expiry_date: newTokens.expiry_date ?? existing.expiry_date
      })
    }
  })

  return client
}

/**
 * Check if Google is connected (has stored tokens).
 */
export function isConnected(): boolean {
  return loadTokens() !== null
}

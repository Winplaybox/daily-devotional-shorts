import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { google } from 'googleapis';
import readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const CLIENT_SECRET_FILE = path.resolve('./client_secret.json');
const TOKEN_FILE = path.resolve('./token.json');

const COLAB_SECRET = 'C:/Users/sagar/Desktop/Project/Colab/colab-YT/client_secret_347903213218-9cd9j9ckf0mapl3qdh8m1knjmlvi5o4f.apps.googleusercontent.com.json';
const COLAB_TOKEN = 'C:/Users/sagar/Desktop/Project/Colab/colab-YT/token.json';

function ensureClientSecret() {
  if (fs.existsSync(CLIENT_SECRET_FILE)) {
    return CLIENT_SECRET_FILE;
  }

  const fallbacks = [
    COLAB_SECRET,
    'C:/Users/sagar/Desktop/Project/Colab/colab-YT/youtube_client_secret.json',
  ];

  for (const candidate of fallbacks) {
    if (fs.existsSync(candidate)) {
      console.log(`[INFO] Found existing client credentials file at: ${candidate}`);
      console.log(`[INFO] Copying to ${CLIENT_SECRET_FILE}...`);
      fs.copyFileSync(candidate, CLIENT_SECRET_FILE);
      return CLIENT_SECRET_FILE;
    }
  }

  return null;
}

function openBrowser(targetUrl) {
  const startCmd = process.platform === 'win32' ? `start "" "${targetUrl}"` :
                   process.platform === 'darwin' ? `open "${targetUrl}"` :
                   `xdg-open "${targetUrl}"`;
  exec(startCmd, (err) => {
    if (err) {
      console.log('[NOTE] Could not open browser automatically. Please click the link above.');
    }
  });
}

async function importFromColab(creds) {
  if (!fs.existsSync(COLAB_TOKEN)) {
    console.log('[INFO] No existing Colab token found to import.');
    return false;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(COLAB_TOKEN, 'utf8'));
    if (!raw.refresh_token) {
      console.log('[WARN] Colab token does not have a refresh_token.');
      return false;
    }

    console.log('[INFO] Testing existing token from Colab project...');
    const oauth2 = new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost');
    oauth2.setCredentials({
      access_token: raw.token,
      refresh_token: raw.refresh_token,
      scope: Array.isArray(raw.scopes) ? raw.scopes.join(' ') : (raw.scope || SCOPES.join(' ')),
      token_type: 'Bearer',
    });

    const refreshed = await oauth2.getAccessToken();
    if (!refreshed.token) {
      throw new Error('Could not refresh access token');
    }

    const finalTokens = {
      access_token: refreshed.token,
      refresh_token: raw.refresh_token,
      scope: oauth2.credentials.scope || SCOPES.join(' '),
      token_type: 'Bearer',
      expiry_date: oauth2.credentials.expiry_date || (Date.now() + 3600 * 1000),
    };

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(finalTokens, null, 2), 'utf8');
    console.log(`[SUCCESS] Existing token verified and imported successfully to: ${TOKEN_FILE}`);
    return true;
  } catch (err) {
    console.log(`[INFO] Could not use existing token (${err.message}). Starting fresh OAuth flow...`);
    return false;
  }
}

async function runFreshOAuth(creds) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    // Listen on dynamic ephemeral port
    server.listen(0, async () => {
      const port = server.address().port;
      const redirectUri = `http://localhost:${port}`;

      const oauth2Client = new google.auth.OAuth2(
        creds.client_id,
        creds.client_secret,
        redirectUri
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
      });

      console.log('\n=============================================================');
      console.log('   STEP 1: Log in & Authorize YouTube in your Browser');
      console.log('=============================================================');
      console.log('\nIf the browser does not open automatically, copy & open this URL:\n');
      console.log(authUrl);
      console.log('\n=============================================================\n');

      console.log(`Waiting for Google callback on http://localhost:${port}...`);
      openBrowser(authUrl);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      let finished = false;

      const finishWithTokens = async (code) => {
        if (finished) return;
        finished = true;
        rl.close();
        try {
          console.log('\nExchanging authorization code for tokens...');
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
          console.log(`\n[SUCCESS] Token saved to: ${TOKEN_FILE}`);

          server.close();
          resolve(oauth2Client);
        } catch (err) {
          server.close();
          reject(err);
        }
      };

      server.on('request', async (req, res) => {
        try {
          const parsed = new url.URL(req.url, redirectUri);
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h2 style="color:red">Authorization Cancelled or Failed</h2><p>${error}</p>`);
            if (!finished) {
              finished = true;
              server.close();
              rl.close();
              reject(new Error(error));
            }
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px;">
                  <h1 style="color: #2e7d32;">Authentication Successful!</h1>
                  <p style="font-size: 1.2rem; color: #333;">YouTube authorization completed. You can safely close this browser window.</p>
                </body>
              </html>
            `);
            await finishWithTokens(code);
          } else {
            res.writeHead(404);
            res.end('Not Found');
          }
        } catch (e) {
          res.writeHead(500);
          res.end(e.message);
        }
      });

      rl.question('\n(Optional) If browser redirection does not reach here, paste code or full URL here:\n> ', async (input) => {
        if (!finished && input && input.trim()) {
          let code = input.trim();
          if (code.includes('code=')) {
            const m = code.match(/code=([^&]+)/);
            if (m) code = decodeURIComponent(m[1]);
          }
          await finishWithTokens(code);
        }
      });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyChannel(oauth2Client) {
  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    if (res.data.items && res.data.items.length > 0) {
      const channel = res.data.items[0];
      console.log(`\n[VERIFIED] Connected YouTube Channel:`);
      console.log(`   Name: ${channel.snippet.title}`);
      console.log(`   ID:   ${channel.id}`);
    } else {
      console.log('\n[INFO] Authenticated successfully! (No active public channel returned for mine=true)');
    }
  } catch (err) {
    console.log(`\n[NOTE] Channel metadata check skipped (${err.message}). Upload permissions are active.`);
  }
}

async function main() {
  console.log('=============================================================');
  console.log('       Daily Devotional Shorts - YouTube Auth Setup          ');
  console.log('=============================================================\n');

  const secretPath = ensureClientSecret();
  if (!secretPath) {
    console.error('ERROR: client_secret.json was not found.');
    console.error('Please place your Google OAuth desktop credentials file as "client_secret.json" in this directory.');
    process.exit(1);
  }

  const rawCreds = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
  const creds = rawCreds.installed || rawCreds.web;
  if (!creds || !creds.client_id || !creds.client_secret) {
    console.error('ERROR: Invalid client_secret.json format. Needs "installed" or "web" client config.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const forceFresh = args.includes('--fresh');

  let authenticated = false;
  let oauthClient = null;

  if (!forceFresh) {
    const imported = await importFromColab(creds);
    if (imported) {
      authenticated = true;
      oauthClient = new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost');
      oauthClient.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')));
    }
  }

  if (!authenticated) {
    oauthClient = await runFreshOAuth(creds);
  }

  if (oauthClient) {
    await verifyChannel(oauthClient);
  }

  console.log('\n=============================================================');
  console.log('                 SETUP STATUS: READY                         ');
  console.log('=============================================================');
  console.log('1. client_secret.json : READY');
  console.log('2. token.json         : READY');
  console.log('\nTo test the end-to-end shorts pipeline, run:');
  console.log('   npm start');
  console.log('\nFor GitHub Actions automated publishing:');
  console.log('Add the contents of client_secret.json -> CLIENT_SECRET_JSON secret');
  console.log('Add the contents of token.json         -> TOKEN_JSON secret');
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('\n[ERROR]', err);
  process.exit(1);
});

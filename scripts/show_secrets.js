import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const CLIENT_SECRET_FILE = path.resolve('./client_secret.json');
const TOKEN_FILE = path.resolve('./token.json');

async function main() {
  console.log('==============================================================');
  console.log('       YouTube Credentials Diagnostic & Secrets Exporter      ');
  console.log('==============================================================\n');

  if (!fs.existsSync(CLIENT_SECRET_FILE) || !fs.existsSync(TOKEN_FILE)) {
    console.error('Missing client_secret.json or token.json in project root.');
    console.log('Run: npm run auth');
    process.exit(1);
  }

  const secretRaw = fs.readFileSync(CLIENT_SECRET_FILE, 'utf8').trim();
  const tokenRaw = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

  const secretJson = JSON.parse(secretRaw);
  const tokenJson = JSON.parse(tokenRaw);

  const conf = secretJson.installed || secretJson.web || secretJson;

  console.log('Validating local credentials against Google OAuth...');
  try {
    const oauth2Client = new google.auth.OAuth2(
      conf.client_id,
      conf.client_secret,
      (Array.isArray(conf.redirect_uris) && conf.redirect_uris[0]) || 'http://localhost'
    );
    oauth2Client.setCredentials({
      access_token: tokenJson.access_token || tokenJson.token,
      refresh_token: tokenJson.refresh_token,
      scope: tokenJson.scope,
      token_type: 'Bearer',
    });

    const tokenRes = await oauth2Client.getAccessToken();
    if (!tokenRes.token) throw new Error('Token refresh returned empty access token');

    console.log('✅ Google OAuth Validation: PASSED! (Refresh Token is 100% active)\n');

    const scopes = String(tokenJson.scope || (Array.isArray(tokenJson.scopes) ? tokenJson.scopes.join(' ') : ''));
    const requiredScopes = [
      { id: 'yt-analytics.readonly', name: 'YouTube Analytics (yt-analytics.readonly)' },
      { id: 'youtube', name: 'YouTube Data (youtube / youtube.force-ssl)' },
      { id: 'youtube.upload', name: 'YouTube Upload (youtube.upload)' },
    ];
    const missingScopes = requiredScopes.filter(s => !scopes.includes(s.id));
    if (missingScopes.length > 0) {
      console.warn('⚠️  WARNING: Missing recommended scopes in token:');
      for (const m of missingScopes) console.warn(`   - ${m.name}`);
      console.warn('Run "npm run auth:fresh" to grant all permissions in browser.\n');
    } else {
      console.log('✅ Required Scopes Validation: PASSED! (All YouTube & Analytics scopes present)\n');
    }
  } catch (err) {
    console.error('❌ Google OAuth Validation: FAILED!');
    console.error('Error:', err.message);
    console.log('\nRun "npm run auth:fresh" to generate a matching pair.\n');
    process.exit(1);
  }

  console.log('==============================================================');
  console.log('1. Copy below for GitHub Secret: CLIENT_SECRET_JSON');
  console.log('==============================================================');
  console.log(JSON.stringify(secretJson));
  console.log('\n==============================================================');
  console.log('2. Copy below for GitHub Secret: TOKEN_JSON');
  console.log('==============================================================');
  console.log(JSON.stringify(tokenJson));
  console.log('\n==============================================================');
  console.log('Add them to: https://github.com/Winplaybox/daily-devotional-shorts/settings/secrets/actions');
  console.log('==============================================================\n');
}

main().catch(console.error);

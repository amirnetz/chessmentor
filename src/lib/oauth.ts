import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

const clientId = process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID || '';
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/lichess';

console.log('Initializing OAuth with:', { clientId, redirectUri }); // Debug log

export const oauth = new OAuth2AuthCodePKCE({
  authorizationUrl: 'https://lichess.org/oauth',
  tokenUrl: 'https://lichess.org/api/token',
  clientId,
  redirectUrl: redirectUri,
  scopes: ['game:read', 'game:write', 'challenge:read', 'challenge:write', 'board:play'],
  onAccessTokenExpiry: refreshAccessToken => {
    console.log('Token expired, refreshing...'); // Debug log
    return refreshAccessToken();
  },
  onInvalidGrant: error => {
    console.error('Invalid grant:', error); // Debug log
  },
  extraAuthorizationParams: {
    response_type: 'code',
  },
  extraTokenParameters: {
    grant_type: 'authorization_code',
  },
}); 
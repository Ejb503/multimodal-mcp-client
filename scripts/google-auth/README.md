# Google Authentication Setup

This script handles Google OAuth2 authentication for the MCP server. It manages credentials, tokens, and environment variables needed for Google API access.

## Prerequisites

1. **Google Cloud Console Setup**:

   - Create a project in Google Cloud Console
   - Enable the APIs you need (Gmail, Calendar, Drive)
   - Create OAuth 2.0 credentials for a desktop application
   - Set the redirect URI to: `http://localhost:3333/oauth2callback`

2. **Credentials File**:
   - Download your OAuth 2.0 credentials from Google Cloud Console
   - Save them as `scripts/google-auth/credentials/google-credentials.json`
   - The file should have this structure:
     ```json
     {
       "installed": {
         "client_id": "your-client-id",
         "client_secret": "your-client-secret",
         "redirect_uris": ["http://localhost:3333/oauth2callback"]
       }
     }
     ```

## Running the Script

From the project root, run:

```bash
npm run setup:google
```

The script will:

1. Create necessary directories if they don't exist
2. Install required dependencies
3. Open your browser for Google authentication
4. Save the authentication token to `scripts/google-auth/credentials/google-token.json`
5. Save base64-encoded credentials and token to the root `.env` file

## Environment Variables

The script will add/update these variables in your root `.env`:

- `GOOGLE_CREDENTIALS`: Base64 encoded OAuth2 credentials
- `GOOGLE_TOKEN`: Base64 encoded authentication token

## Troubleshooting

1. **Port 3333 in Use**:

   - Ensure no other service is using port 3333
   - The script needs this port for the OAuth callback

2. **Browser Doesn't Open**:

   - The script will display a URL
   - Copy and paste it into your browser manually

3. **Authentication Fails**:
   - Verify your credentials are correct
   - Ensure the redirect URI matches exactly
   - Check that required APIs are enabled in Google Cloud Console

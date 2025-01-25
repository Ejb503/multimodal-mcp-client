import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";
import * as http from "http";
import { fileURLToPath } from "url";
import { IncomingMessage, ServerResponse } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(
  __dirname,
  "credentials/google-credentials.json"
);
const TOKEN_PATH = path.join(__dirname, "credentials/google-token.json");

const CALLBACK_PORT = 3333;
const CALLBACK_PATH = "/oauth2callback";

interface GoogleCredentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface AuthCallbackResult {
  code: string;
  server: http.Server;
}

type AuthCallbackResolve = (value: AuthCallbackResult) => void;
type AuthCallbackReject = (reason: Error) => void;

async function handleAuthCallback(
  req: IncomingMessage,
  res: ServerResponse,
  resolve: AuthCallbackResolve,
  reject: AuthCallbackReject,
  server: http.Server
): Promise<void> {
  try {
    if (!req.url) {
      throw new Error("No URL in request");
    }

    const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
    if (url.pathname !== CALLBACK_PATH) {
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      throw new Error("No authorization code received");
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body>
          <h1>Authentication successful!</h1>
          <p>You can close this window and return to the terminal.</p>
          <script>window.close()</script>
        </body>
      </html>
    `);

    resolve({ code, server });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Callback error:", err.message);
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Authentication failed");
    reject(err);
  }
}

async function waitForCallback(oAuth2Client: OAuth2Client): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handleAuthCallback(
        req,
        res,
        ({ code }) => {
          server.close();
          resolve(code);
        },
        (error) => {
          server.close();
          reject(error);
        },
        server
      ).catch(reject);
    });

    server.listen(CALLBACK_PORT, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      console.log(`Callback server listening on port ${address.port}`);
    });

    server.on("error", (error: Error) => {
      console.error("Server error:", error.message);
      reject(error);
    });

    oAuth2Client.on("tokens", (tokens) => {
      if (!tokens.access_token) {
        reject(new Error("No access token received"));
      }
    });
  });
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("child_process");
  return new Promise<void>((resolve) => {
    // Try different commands based on platform
    const commands =
      process.platform === "win32"
        ? [
            `start "" "${url}"`,
            `cmd /c start "" "${url}"`,
            `rundll32 url.dll,FileProtocolHandler "${url}"`,
            `explorer.exe "${url}"`,
          ]
        : process.platform === "darwin"
        ? [`open "${url}"`]
        : [
            `xdg-open "${url}"`,
            `sensible-browser "${url}"`,
            `x-www-browser "${url}"`,
          ];

    // Try each command in sequence until one works
    const tryCommand = (index: number) => {
      if (index >= commands.length) {
        console.log("\nPlease open this URL manually in your browser:", url);
        resolve();
        return;
      }

      exec(commands[index], (error) => {
        if (error) {
          // If this command failed, try the next one
          tryCommand(index + 1);
        } else {
          resolve();
        }
      });
    };

    tryCommand(0);
  });
}

async function authenticate(): Promise<void> {
  try {
    // Create credentials directory if it doesn't exist
    const credentialsDir = path.join(__dirname, "credentials");
    try {
      await fs.access(credentialsDir);
    } catch {
      await fs.mkdir(credentialsDir, { recursive: true });
    }

    // Check if credentials exist
    try {
      await fs.access(CREDENTIALS_PATH);
    } catch {
      throw new Error(
        "Google credentials not found. Please download OAuth 2.0 credentials from Google Cloud Console " +
          "and save them as scripts/google-auth/credentials/google-credentials.json"
      );
    }

    // Read and parse credentials
    const credentialsData = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const credentials = JSON.parse(credentialsData) as GoogleCredentials;
    const { client_secret, client_id } = credentials.installed;

    // Create OAuth2 client
    const redirect_uri = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );

    // Generate auth URL with all necessary scopes
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        // Gmail scopes
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.labels",
        // Calendar scopes
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events.readonly",
        // Drive scope
        "https://www.googleapis.com/auth/drive.readonly",
      ].join(" "),
    });

    // Start authentication process
    console.log("\n🔐 Starting Google Authentication");
    console.log("1. Opening your browser to complete authentication...");
    await openBrowser(authUrl);

    // Wait for the OAuth2 callback
    console.log("2. Waiting for authentication...\n");
    const code = await waitForCallback(oAuth2Client);

    // Exchange code for tokens
    const response = await oAuth2Client.getToken(code);
    const tokens = response.tokens;
    if (!tokens) {
      throw new Error("Failed to get tokens from Google");
    }

    // Save the tokens to file
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("\n✅ Authentication successful!");
    console.log("Token stored in:", TOKEN_PATH);

    // Convert credentials and token to base64
    const credentialsBase64 = Buffer.from(credentialsData).toString("base64");
    const tokenBase64 = Buffer.from(JSON.stringify(tokens)).toString("base64");

    // Update .env file in root
    const envPath = path.join(__dirname, "../../.env");
    let envContent = "";

    // Read existing .env if it exists
    try {
      envContent = await fs.readFile(envPath, "utf-8");
      // Remove any existing Google credentials
      envContent = envContent
        .split("\n")
        .filter(
          (line) =>
            !line.startsWith("GOOGLE_CREDENTIALS=") &&
            !line.startsWith("GOOGLE_TOKEN=")
        )
        .join("\n");
      if (envContent && !envContent.endsWith("\n")) {
        envContent += "\n";
      }
    } catch {
      // If .env doesn't exist, start with empty content
      envContent = "";
    }

    // Add the new credentials
    envContent += `GOOGLE_CREDENTIALS=${credentialsBase64}\n`;
    envContent += `GOOGLE_TOKEN=${tokenBase64}\n`;

    // Write to .env file
    await fs.writeFile(envPath, envContent);
    console.log("✅ Wrote base64 encoded credentials and token to .env");

    console.log("\nYou can now start/restart the MCP server.");
    process.exit(0);
  } catch (error) {
    console.error(
      "\n❌ Authentication failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

authenticate().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

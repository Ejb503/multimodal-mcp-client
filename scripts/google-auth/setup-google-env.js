#!/usr/bin/env node
import fs from "fs";
import path from "path";

// Get file paths from command line arguments or use defaults
const credentialsPath =
  process.argv[2] || "credentials/google-credentials.json";
const tokenPath = process.argv[3] || "credentials/google-token.json";

try {
  // Read and encode the credentials file
  const credentials = fs.readFileSync(credentialsPath, "utf8");
  const credentialsBase64 = Buffer.from(credentials).toString("base64");

  // Read and encode the token file
  const token = fs.readFileSync(tokenPath, "utf8");
  const tokenBase64 = Buffer.from(token).toString("base64");

  // Prepare the .env content
  let envContent = "";

  // Read existing .env if it exists
  if (fs.existsSync(".env")) {
    envContent = fs.readFileSync(".env", "utf8");
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
  }

  // Add the new credentials
  envContent += `GOOGLE_CREDENTIALS=${credentialsBase64}\n`;
  envContent += `GOOGLE_TOKEN=${tokenBase64}\n`;

  // Write to .env file
  fs.writeFileSync(".env", envContent);

  console.log("Successfully wrote Google credentials and token to .env");
  console.log(`Credentials file used: ${path.resolve(credentialsPath)}`);
  console.log(`Token file used: ${path.resolve(tokenPath)}`);
} catch (error) {
  console.error("Error:", error.message);
  console.log(
    "\nUsage: node scripts/setup-env.js [credentials-path] [token-path]"
  );
  console.log(
    "Default paths: credentials/google-credentials.json and credentials/google-token.json"
  );
  process.exit(1);
}

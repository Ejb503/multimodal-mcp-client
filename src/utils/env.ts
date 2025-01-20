import { z } from "zod";

const envSchema = z.object({
  VITE_SYSTEMPROMPT_API_KEY: z.string(),
  VITE_GEMINI_API_KEY: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnvConfig(): EnvConfig {
  const env: Record<string, string> = {};

  // Get all environment variables that start with VITE_
  Object.keys(import.meta.env).forEach((key) => {
    if (key.startsWith("VITE_")) {
      env[key] = import.meta.env[key];
    }
  });

  // Validate against schema
  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error("Environment validation failed:", result.error.format());
    throw new Error("Missing required environment variables");
  }

  return result.data;
}

// Export a singleton instance
export const envConfig = loadEnvConfig();

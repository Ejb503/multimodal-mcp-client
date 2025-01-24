import React, { useState, useMemo } from "react";
import { Card, CardBody, Link } from "@nextui-org/react";
import { ApiKeyInput } from "../components/shared/Input/ApiKeyInput";
import { BaseButton } from "../components/shared/Button/BaseButton";

export default function AuthSplashPage() {
  const [systemPromptKey, setSystemPromptKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationState = useMemo(() => {
    const requiredFields: string[] = [];
    if (!systemPromptKey) requiredFields.push("SystemPrompt API Key");
    if (!geminiKey) requiredFields.push("Gemini API Key");

    return {
      isValid: systemPromptKey.length > 0 && geminiKey.length > 0,
      requiredFields,
    };
  }, [systemPromptKey, geminiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationState.isValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // First validate the API key
      const validationResponse = await fetch(
        "http://localhost:5173/api/validate-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey: systemPromptKey }),
        }
      );

      if (!validationResponse.ok) {
        throw new Error("Invalid SystemPrompt API key");
      }

      // If validation successful, save the keys
      const saveResponse = await fetch("http://localhost:5173/api/update-env", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          VITE_SYSTEMPROMPT_API_KEY: systemPromptKey,
          VITE_GEMINI_API_KEY: geminiKey,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save API keys");
      }

      // Set the API key in context and continue
      // setApiKey(systemPromptKey);
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-[1000px] bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg backdrop-saturate-150 border-1 border-white/20">
        <CardBody className="p-8 gap-8">
          <div className="text-center">
            <h1 className="text-3xl  text-foreground">
              <img
                src="/logo.png"
                style={{ height: 50, display: "inline-block" }}
                alt="SystemPrompt Logo"
              />
              <span className="ml-2 text-sm font-medium px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary dark:text-primary-500 rounded-full border-1 border-primary-200 dark:border-primary-800">
                Early Access
              </span>
            </h1>
          </div>

          {/* Information Cards */}
          <div className="space-y-4">
            {/* API Keys Section with Form */}
            <form onSubmit={handleSubmit}>
              <Card className="border-1 border-gray-200/50 dark:border-gray-700/50">
                <CardBody className="p-5 gap-6">
                  <h2 className="text-lg  text-foreground flex items-center">
                    <span className="text-xl mr-2">🔑</span> API Keys Required
                  </h2>
                  <div className="space-y-6">
                    {/* SystemPrompt Key */}
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="mr-2 mt-1 text-default-500">•</span>
                        <div className="flex-1">
                          <ApiKeyInput
                            label="SystemPrompt API Key"
                            value={systemPromptKey}
                            onChange={setSystemPromptKey}
                            description={
                              <span className="text-xs text-gray-400">
                                This is a free key needed for the full Agent
                                experience. No credit card required.{" "}
                                <Link
                                  href="https://systemprompt.io/console"
                                  target="_blank"
                                  className="text-xs text-gray-400 hover:opacity-80 underline"
                                >
                                  Sign up here
                                </Link>
                              </span>
                            }
                            placeholder="Enter your SystemPrompt API key"
                            isRequired
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gemini Key */}
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="mr-2 mt-1 text-default-500">•</span>
                        <div className="flex-1">
                          <ApiKeyInput
                            label="Gemini API Key"
                            value={geminiKey}
                            onChange={setGeminiKey}
                            description={
                              <span className="text-xs text-gray-400">
                                Required for AI functionality. Free tier
                                available with Google account.{" "}
                                <Link
                                  href="https://ai.google.dev/gemini-api/docs/api-key"
                                  target="_blank"
                                  className="text-xs text-gray-400 hover:opacity-80 underline"
                                >
                                  Get your key here
                                </Link>
                              </span>
                            }
                            placeholder="Enter your Gemini API key"
                            isRequired
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card className="bg-gray-100/20 dark:bg-gray-900/20 border-1 border-gray-200/50 dark:border-gray-700/50">
                        <CardBody className="p-3 text-sm text-default-600 dark:text-default-400">
                          These keys are written to your local disk and are
                          never shared with third parties through this software,
                          other than through MCP extensions. You must trust MCP
                          extensions before you use them. We recommend
                          officially supported and published systemprompt MCP
                          extensions for full compatability with the voice
                          agent.
                        </CardBody>
                      </Card>

                      {error && (
                        <p className="text-sm text-danger text-center">
                          {error}
                        </p>
                      )}

                      <BaseButton
                        type="submit"
                        color="primary"
                        className="w-full"
                        size="lg"
                        isLoading={isLoading}
                        loadingText="Validating..."
                        defaultText="Continue"
                        validationState={validationState}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </form>

            {/* Extensions Benefits */}
            <Card className="bg-success-50/30 dark:bg-success-900/20 border-1 border-success-200 dark:border-success-800/30">
              <CardBody className="p-5 gap-3">
                <h2 className="text-lg  text-success-700 dark:text-success-500 flex items-center">
                  <span className="text-xl mr-2">✨</span> Why Use SystemPrompt
                  Extensions?
                </h2>
                <ul className="space-y-3 text-success-700 dark:text-success-400">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <span className="font-medium">Official Support</span>
                      <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                        Our extensions are officially maintained and regularly
                        updated
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <span className="font-medium">Native Integration</span>
                      <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                        Seamlessly integrated with the client for the best user
                        experience
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <span className="font-medium">Currently Free</span>
                      <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                        All extensions are free to use (subject to change in the
                        future)
                      </p>
                    </div>
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm text-default-500">
              By using this software, you agree to the{" "}
              <Link
                href="https://github.com/Ejb503/multimodal-mcp-client/blob/master/LICENSE"
                className="text-primary hover:opacity-80"
                target="_blank"
              >
                MIT License
              </Link>{" "}
              terms.
            </p>
            <p className="text-sm text-default-500">
              Once API keys are saved in .env and app is bootstrapped, this
              screen will no longer appear.
            </p>
            <p className="text-xs text-default-400">
              SystemPrompt © {new Date().getFullYear()}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

# Systemprompt MCP Client

[![npm version](https://img.shields.io/npm/v/systemprompt-agent-server.svg)](https://www.npmjs.com/package/systemprompt-agent-server)
[![Linkedin](https://i.sstatic.net/gVE0j.png)](https://www.linkedin.com/in/edjburton/)
[![Twitter Follow](https://img.shields.io/twitter/follow/tyingshoelaces_?style=social)](https://twitter.com/tyingshoelaces_)
[![Discord](https://img.shields.io/discord/1255160891062620252?color=7289da&label=discord)](https://discord.com/invite/wkAbSuPWpr)

[Website](https://systemprompt.io) | [Documentation](https://systemprompt.io/documentation) | [Blog](https://tyingshoelaces.com) | [Get API Key](https://systemprompt.io/console)

**Free and Open Source Software**: A modern voice-controlled AI interface powered by Google Gemini and Anthropic MCP (Model Control Protocol). Transform how you interact with AI through natural speech and multimodal inputs.

** Important Note: This project is currently in development and in early access. It is not currently compatible with Safari but has been tested on Chrome with Linux, Windows, and MacOS. If you have any problems, please let us know on Discord or GitHub. **

If you like this project, please consider starring it on GitHub and sharing it. It helps me get more visibility and support for this project and allows us to continue active development.

A modern Vite + TypeScript application that enables voice-controlled AI workflows through MCP (Model Control Protocol). This project revolutionizes how you interact `with AI systems by combining Google Gemini's multimodal capabilities with MCP's extensible tooling system.

## 🎯 Why Systemprompt MCP?

Transform your AI interactions with a powerful voice-first interface that combines the best of:

- **Multimodal AI**: Understand and process text, voice, and visual inputs naturally
- **MCP (Model Control Protocol)**: Execute complex AI workflows with a robust tooling system
- **Voice-First Design**: Control everything through natural speech, making AI interaction more intuitive

Perfect for:

- **Developers** building voice-controlled AI applications, and looking for innovative ways to use multimodal AI

## 🎯 Core Features

### Voice & Multimodal Intelligence

- **Natural Voice Control**: Speak naturally to control AI workflows and execute commands
- **Multimodal Understanding**: Process text, voice, and visual inputs simultaneously
- **Real-time Voice Synthesis**: Get instant audio responses from your AI interactions

### AI Workflow Orchestration

- **Extensible Tool System**: Add custom tools and workflows through MCP
- **Workflow Automation**: Chain multiple AI operations with voice commands
- **State Management**: Robust handling of complex, multi-step AI interactions

### Developer Experience

- **Modern Tech Stack**: Built with Vite, React, TypeScript, and NextUI
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Hot Module Replacement**: Fast development with instant feedback
- **Comprehensive Testing**: Built-in testing infrastructure with high coverage

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- A modern browser with Web Speech API support

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Ejb503/multimodal-mcp-client.git
   cd multimodal-mcp-client
   ```

2. Install dependencies:

   ```bash
   npm install
   cd proxy
   npm install
   ```

3. Set up configuration files:

   ```bash
   # Navigate to config directory
   cd config

   # Create local configuration files from templates
   cp mcp.config.example.json mcp.config.custom.json
   ```

   **Required Configuration:**

   - Get a Gemini API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs)
   - Get a Systemprompt API key from [systemprompt.io/console](https://systemprompt.io/console)
   - Add keys to .env

EXAMPLE.env

# Client API Keys

VITE_SYSTEMPROMPT_API_KEY=xxx
VITE_GEMINI_API_KEY=xxx

# Server API Keys

NOTION_API_KEY=xxx
SYSTEMPROMPT_API_KEY=xxx

4. Start the development server:

   ```bash
   npm run dev
   ```

   The development server will be available at `http://localhost:5173`

## 📞 Support

- [Discord Community](https://discord.com/invite/wkAbSuPWpr)
- [GitHub Issues](https://github.com/Ejb503/multimodal-mcp-client/issues)
- [Documentation](https://systemprompt.io/documentation)
- Email: support@systemprompt.io

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🚀 Extensions in Development

We're actively working on expanding the capabilities of Systemprompt MCP Client with exciting extensions:

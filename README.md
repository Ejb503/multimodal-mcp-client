# Systemprompt MCP Client

<div align="center">

[![npm version](https://img.shields.io/npm/v/systemprompt-agent-server.svg)](https://www.npmjs.com/package/systemprompt-agent-server)
[![Discord](https://img.shields.io/discord/1255160891062620252?color=7289da&label=discord)](https://discord.com/invite/wkAbSuPWpr)
[![Twitter Follow](https://img.shields.io/twitter/follow/tyingshoelaces_?style=social)](https://twitter.com/tyingshoelaces_)
[![Linkedin](https://i.sstatic.net/gVE0j.png)](https://www.linkedin.com/in/edjburton/)

[Website](https://systemprompt.io) • [Documentation](https://systemprompt.io/documentation) • [Blog](https://tyingshoelaces.com) • [Get API Key](https://systemprompt.io/console)

A modern voice-controlled AI interface powered by Google Gemini and Anthropic MCP (Model Control Protocol). Transform how you interact with AI through natural speech and multimodal inputs.

</div>

> **⚠️ Important Note**: This project is currently in development and in early access. It is not currently compatible with Safari but has been tested on Chrome with Linux, Windows, and MacOS. If you have any problems, please let us know on Discord or GitHub.

If you find this project useful, please consider:

- ⭐ Starring it on GitHub
- 🔄 Sharing it with others
- 💬 Joining our [Discord community](https://discord.com/invite/wkAbSuPWpr)

## 🌟 Overview

A modern Vite + TypeScript application that enables voice-controlled AI workflows through MCP (Model Control Protocol). This project revolutionizes how you interact with AI systems by combining Google Gemini's multimodal capabilities with MCP's extensible tooling system.

## 🎯 Why Systemprompt MCP?

Transform your AI interactions with a powerful voice-first interface that combines:

| Feature                             | Description                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| 🗣️ **Multimodal AI**                | Understand and process text, voice, and visual inputs naturally                 |
| 🛠️ **MCP (Model Control Protocol)** | Execute complex AI workflows with a robust tooling system                       |
| 🎙️ **Voice-First Design**           | Control everything through natural speech, making AI interaction more intuitive |

**Perfect for**: Developers building voice-controlled AI applications and looking for innovative ways to use multimodal AI.

## ✨ Core Features

### 🎙️ Voice & Multimodal Intelligence

- **Natural Voice Control**: Speak naturally to control AI workflows and execute commands
- **Multimodal Understanding**: Process text, voice, and visual inputs simultaneously
- **Real-time Voice Synthesis**: Get instant audio responses from your AI interactions

### 🔄 AI Workflow Orchestration

- **Extensible Tool System**: Add custom tools and workflows through MCP
- **Workflow Automation**: Chain multiple AI operations with voice commands
- **State Management**: Robust handling of complex, multi-step AI interactions

### 💻 Developer Experience

- **Modern Tech Stack**: Built with Vite, React, TypeScript, and NextUI
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Hot Module Replacement**: Fast development with instant feedback
- **Comprehensive Testing**: Built-in testing infrastructure with high coverage

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- A modern browser with Web Speech API support

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/Ejb503/multimodal-mcp-client.git
   cd multimodal-mcp-client
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd proxy
   npm install
   ```

3. **Configure the application**

   ```bash
   # Navigate to config directory
   cd config

   # Create local configuration files
   cp mcp.config.example.json mcp.config.custom.json
   ```

   Required API Keys:

   - [Google AI Studio](https://ai.google.dev/gemini-api/docs) - Gemini API key
   - [systemprompt.io/console](https://systemprompt.io/console) - Systemprompt API key

   Add keys to `.env` (see `.env.example` for reference)

4. **Start development server**
   ```bash
   npm run dev
   ```
   Access the development server at `http://localhost:5173`

## 🤝 Support & Community

| Resource   | Link                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 💬 Discord | [Join our community](https://discord.com/invite/wkAbSuPWpr)             |
| 🐛 Issues  | [GitHub Issues](https://github.com/Ejb503/multimodal-mcp-client/issues) |
| 📚 Docs    | [Documentation](https://systemprompt.io/documentation)                  |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Future Development

We're actively working on expanding the capabilities of Systemprompt MCP Client with exciting new features and extensions. Stay tuned for updates!

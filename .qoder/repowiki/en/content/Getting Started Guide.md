
# Getting Started Guide

<cite>
**Referenced Files in This Document **  
- [README.md](file://README.md)
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [src/main.tsx](file://src/main.tsx)
- [src/App.tsx](file://src/App.tsx)
- [src/pages/TradingTerminal.tsx](file://src/pages/TradingTerminal.tsx)
- [src/pages/Index.tsx](file://src/pages/Index.tsx)
- [KEYS.md](file://KEYS.md)
- [express.ts](file://express.ts)
- [CCXT_EXPRESS_PROVIDER.md](file://CCXT_EXPRESS_PROVIDER.md)
- [CCXT_SERVER_WIDGET_INTEGRATION.md](file://CCXT_SERVER_WIDGET_INTEGRATION.md)
- [src/components/widgets/DataProviderSetupWidget.tsx](file://src/components/widgets/DataProviderSetupWidget.tsx)
- [src/components/widgets/DataProviderDebugWidget.tsx](file://src/components/widgets/DataProviderDebugWidget.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites and Installation](#prerequisites-and-installation)
3. [Environment Configuration](#environment-configuration)
4. [Running the Development Server](#running-the-development-server)
5. [Application Interface Overview](#application-interface-overview)
6. [Entry Point Architecture](#entry-point-architecture)
7. [Common Setup Issues and Troubleshooting](#common-setup-issues-and-troubleshooting)

## Introduction

The Profitmaker application is an open-source cryptocurrency trading terminal designed to support over 100 exchanges while ensuring user security by keeping API keys on the local machine. The platform allows for customizable dashboards, extendable widgets, and integration with real-time data via CCXT. This guide provides comprehensive instructions for setting up, configuring, and running the Profitmaker application in a development environment.

The core architecture leverages React with Vite for fast development builds, integrates with a custom Express server for bypassing CORS restrictions, and supports both browser-based and server-side CCXT operations. Users can create personalized trading interfaces by adding widgets such as charts, order books, trade history, and balance displays.

This document walks through the complete setup process from installation to initial usage, including configuration of exchange connectivity, launching the development server, navigating the interface, understanding the entry point flow, and resolving common issues encountered during setup.

**Section sources**
- [README.md](file://README.md#L0-L149)

## Prerequisites and Installation

To set up the Profitmaker application, ensure your system meets the following prerequisites:

- **Node.js**: Version 18 or higher
- **npm**: Package manager bundled with Node.js
- **Git**: For cloning the repository (if not already downloaded)

### Step-by-Step Installation

1. **Clone the Repository**  
   If you haven't already obtained the codebase:
   ```bash
   git clone https://github.com/suenot/profitmaker.git
   cd profitmaker
   ```

2. **Install Dependencies**  
   Run the following command to install all required packages listed in `package.json`:
   ```bash
   npm install
   ```
   This installs essential libraries including:
   - React and ReactDOM for UI rendering
   - Vite for development server and build tooling
   - CCXT for cryptocurrency exchange connectivity
   - Tailwind CSS for styling
   - Zustand for state management
   - Radix UI components for accessible UI elements

3. **Verify Installation**  
   After installation completes, confirm that `node_modules` has been created and dependencies are correctly installed by checking for key directories like `react`, `ccxt`, and `vite`.

The project uses modern JavaScript tooling with TypeScript support, so no additional compilation steps are needed before starting the development server.

**Section sources**
- [package.json](file://package.json#L0-L108)
- [README.md](file://README.md#L110-L149)

## Environment Configuration

Configuring environment variables is crucial for connecting to cryptocurrency exchanges securely
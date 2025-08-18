# MermaidEdit Architecture

This document outlines the core architectural decisions for the MermaidEdit project. It serves as a guiding "constitution," not a detailed manual. The code itself should be the ultimate source of truth.

## 1. Core Philosophy

- **Simplicity First**: "If you need more than 3 levels of indentation, you're screwed anyway, and should fix your program." We prefer simple, direct solutions over complex, "theoretically perfect" ones.
- **No Frameworks**: The project will be built with vanilla TypeScript to keep it lightweight, fast, and free of external dependencies' bloat.
- **Progressive Enhancement**: We will build a solid, local-first core product (MVP) and then progressively add complex features like cloud sync. This avoids premature complexity.
- **Code as Documentation**: Clear code, good naming, and a logical structure are valued over extensive external documentation.

## 2. Staged Development Plan

The project is divided into two main stages to manage complexity.

- **Stage 1: MVP (Minimum Viable Product)**
  - **Goal**: Deliver a fully functional, local-only Mermaid editor with AI assistance.
  - **Scope**: All features from the PRD that do not require cloud synchronization. Data is stored exclusively in the browser (`localStorage` and `IndexedDB`).

- **Stage 2: Cloud Synchronization**
  - **Goal**: Introduce optional cloud sync using Cloudflare KV.
  - **Scope**: Add KV configuration, implement a basic manual sync mechanism, and handle simple "last-write-wins" conflict resolution.

## 3. Data Structures

The core data is modeled with two primary interfaces.

```typescript
// Defined in src/types/index.ts

// Stage 1: MVP
interface UserConfig {
  aiProvider: 'OpenAI' | 'Anthropic' | 'Custom';
  baseURL: string;
  apiKey: string;
  modelName: string;
}

interface ChartData {
  id: string; // UUID
  name: string;
  content: string; // Mermaid code
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Stage 2: With Cloud Sync
interface UserConfig {
  // ... same as Stage 1
  kvStorage?: {
    accountId: string;
    namespaceId: string;
    apiToken: string;
    keyPrefix?: string;
  }
}
```

## 4. Directory Structure

The project follows a feature- and responsibility-driven structure.

```
/
├── dist/
├── public/
│   ├── index.html
│   └── styles.css
├── src/
│   ├── components/   # Self-contained UI modules
│   ├── services/     # Core business logic
│   ├── types/        # Global type definitions
│   ├── utils/        # Shared helper functions
│   └── main.ts       # Application entry point
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 5. Data Flow (MVP)

This diagram illustrates the primary data flow for the MVP stage.

```mermaid
graph TD
    subgraph User Interface
        A[User edits in Editor] --> B{Application Core};
        C[User types in AI Prompt] --> B;
        D[User interacts with Chart List] --> B;
    end

    subgraph Application Core
        B --> E[Storage Service];
        B --> F[AI Service];
        B --> G[Mermaid Service];
    end

    subgraph Services
        E -- reads/writes --> H[IndexedDB: ChartData];
        E -- reads/writes --> I[LocalStorage: UserConfig];
        F -- sends prompt --> J[External LLM API];
        J -- returns code --> F;
        F --> B;
        G -- renders code --> K[Preview Pane];
    end

    B --> K;
    B --> D;

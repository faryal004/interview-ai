# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

flowchart TB
    subgraph Client["🖥️ Frontend (Client)"]
        UI["React 19 + Vite<br/>SPA"]
        Pages["Pages:<br/>Setup • Interview • Results • History"]
        API["API Layer<br/>fetch() + VITE_API_URL"]
    end

    subgraph Vercel["☁️ Vercel Serverless / Backend"]
        direction TB
        Entry["api/index.js<br/>(serverless entry)"]
        MW["Middleware<br/>CORS • express.json"]

        subgraph Routes["🛣️ Express 5 Routes (/api)"]
            R1["POST /analyze-resume"]
            R2["POST /generate-questions"]
            R3["POST /evaluate-interview"]
            R4["POST /test-ai"]
            R5["GET  /interviews"]
            R6["DELETE /interviews"]
        end

        subgraph Services["⚙️ Services"]
            Gemini["gemini.service<br/>retry + exponential backoff"]
            PDF["pdf.service<br/>multer + pdf-parse"]
            Interview["interview.service<br/>save / fetch / clear"]
        end

        subgraph Utils["🧰 Utils"]
            Prompts["prompts.js"]
            Normalize["normalize.js"]
            Fallbacks["fallbacks.js"]
        end

        Model["📋 Interview Model<br/>(Mongoose)"]
    end

    subgraph External["🌐 External Services"]
        GeminiAPI["Google Gemini API<br/>gemini-2.0-flash"]
        MongoDB[("MongoDB Atlas<br/>(Cluster0)")]
    end

    UI --> Pages --> API
    API -->|HTTPS /api/*| Entry
    Entry --> MW --> Routes
    Routes --> Services
    Services --> Utils
    Services --> Model
    Gemini -->|HTTPS + retry| GeminiAPI
    Interview -->|Mongoose| MongoDB

    classDef client fill:#e3f2fd,stroke:#1976d2
    classDef backend fill:#fff3e0,stroke:#f57c00
    classDef external fill:#f3e5f5,stroke:#7b1fa2
    class Client client
    class Vercel backend
    class External external

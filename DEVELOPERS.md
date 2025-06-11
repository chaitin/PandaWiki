# Developer Documentation

This document provides information for developers working on the PandaWiki project.

## Project Architecture

PandaWiki is a full-stack application composed of the following main parts:

*   **Backend:** Written in Go, providing the API and core business logic.
*   **Frontend (Admin Panel):** Written in TypeScript using React, Vite, and Material UI, for managing knowledge bases and system settings.
*   **Frontend (App):** Written in TypeScript using Next.js and Material UI, serving the public-facing Wiki sites.

## Codebase Structure

A brief overview of the main directories:

*   `backend/`: Contains all Go source code for the API and backend services.
    *   `cmd/`: Entry points for different backend applications (e.g., API server, consumer).
    *   `domain/`: Core domain models and interfaces.
    *   `usecase/`: Business logic layer.
    *   `handler/`: HTTP handlers and message queue handlers.
    *   `repo/`: Data persistence layer (e.g., PostgreSQL interactions).
    *   `store/`: Lower-level storage adapters (e.g., database connections, S3).
*   `web/admin/`: Contains the source code for the admin panel.
    *   `src/`: Main source code directory.
        *   `components/`: Reusable React components.
        *   `pages/`: Page-level components.
        *   `store/`: Redux store setup.
        *   `api/`: API client logic.
*   `web/app/`: Contains the source code for the public-facing Wiki app.
    *   `src/`: Main source code directory.
        *   `app/`: Next.js app router structure, including pages and layouts.
        *   `components/`: Reusable React components.
        *   `views/`: More complex view components, often corresponding to pages.

## Development Environment Setup

To set up your development environment, you'll generally need the following:

*   **Go:** Version 1.24.x or later (as specified in `backend/go.mod`).
    *   The backend services (API, consumer) can typically be run using `go run main.go` within their respective `cmd` directories (e.g., `backend/cmd/api/main.go`).
*   **Node.js:** A recent LTS version of Node.js is recommended.
*   **pnpm:** This project uses `pnpm` for managing frontend dependencies. Install it via `npm install -g pnpm` or see [pnpm installation guide](https://pnpm.io/installation).
    *   To install dependencies for frontend projects, navigate to `web/admin` or `web/app` and run `pnpm install`.
    *   To start the frontend development servers, use `pnpm dev` in the respective frontend project directory.

Ensure you have any necessary service dependencies running, such as PostgreSQL, Redis, and NATS, as configured for the project. Configuration details can typically be found in the `config` or `.env` files.

## Contribution Guidelines

We welcome contributions to PandaWiki! Please follow these guidelines:

*   **Code Style:**
    *   **Frontend (TypeScript/React):** Adhere to the existing code style, enforced by ESLint. Run `pnpm lint` in the `web/admin` and `web/app` directories to check your code.
    *   **Backend (Go):** Follow standard Go formatting (e.g., `gofmt` or `goimports`). If a project-specific linter is configured, please use it.
*   **Testing:**
    *   Please add unit tests for new features or bug fixes.
    *   Backend tests are written using Go's standard testing package.
    *   Frontend tests use Vitest (though currently facing some environmental stability issues that need to be resolved).
*   **Commit Messages:**
    *   Try to follow a conventional commit message format (e.g., `feat: add new feature X`, `fix: resolve bug Y`, `docs: update Z`).
    *   Alternatively, a clear, imperative style is also acceptable (e.g., `Add user authentication endpoint`).
*   **Workflow:**
    1.  Fork the repository.
    2.  Create a new branch for your feature or bug fix.
    3.  Make your changes, including tests and documentation updates.
    4.  Ensure all tests and linters pass.
    5.  Submit a pull request to the main repository.
    6.  Clearly describe your changes in the pull request.

If you're planning a larger contribution, it's a good idea to open an issue first to discuss your ideas.

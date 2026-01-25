# Contributing to Terminal Zero Finance

Thank you for your interest in contributing to Terminal Zero Finance! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)
- [Project Structure](#project-structure)

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Prioritize the best interests of the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- A GitHub account
- Basic knowledge of React, TypeScript, and financial modeling

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/terminal-zero-finance.git
   cd terminal-zero-finance
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/terminal-zero-finance.git
   ```

4. **Install dependencies**:
   ```bash
   # Frontend dependencies
   npm install

   # Backend dependencies
   cd server
   npm install
   cd ..
   ```

5. **Set up environment variables**:
   ```bash
   # Copy example files
   cp .env.example .env
   cp server/.env.example server/.env

   # Add your API keys (never commit these!)
   ```

6. **Run the development servers**:
   ```bash
   # Terminal 1 - Frontend (port 5173)
   npm run dev

   # Terminal 2 - Backend (port 3001)
   cd server
   npm run dev
   ```

7. **Verify setup**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001/health

## Development Workflow

### Branching Strategy

1. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

2. **Branch naming conventions**:
   - `feature/` - New features (e.g., `feature/monte-carlo-simulation`)
   - `fix/` - Bug fixes (e.g., `fix/extraction-timeout`)
   - `docs/` - Documentation updates (e.g., `docs/api-examples`)
   - `refactor/` - Code refactoring (e.g., `refactor/financial-logic`)
   - `test/` - Test additions/improvements (e.g., `test/dcf-calculations`)
   - `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Making Changes

1. **Make your changes** in focused, logical commits
2. **Follow code style guidelines** (see below)
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run tests locally** before pushing

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Test additions/improvements
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:
```bash
git commit -m "feat(extraction): add support for 10-Q filings"
git commit -m "fix(dcf): correct perpetual growth calculation"
git commit -m "docs(readme): add installation troubleshooting"
git commit -m "test(valuation): add edge cases for negative FCF"
```

### Syncing with Upstream

Keep your fork updated:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Code Style Guidelines

### TypeScript

- **Use TypeScript strictly** - no `any` types unless absolutely necessary
- **Define interfaces** for all data structures
- **Use type inference** where possible
- **Prefer `const` over `let`** when values don't change
- **Use optional chaining** (`?.`) and nullish coalescing (`??`)

**Good**:
```typescript
interface ValuationInputs {
  fcf: number[];
  wacc: number;
  terminalGrowth: number;
}

function calculateDCF(inputs: ValuationInputs): number {
  const { fcf, wacc, terminalGrowth } = inputs;
  // implementation
}
```

**Bad**:
```typescript
function calculateDCF(inputs: any) {
  var fcf = inputs.fcf; // use const, not var
  // implementation
}
```

### React Components

- **Use functional components** with hooks
- **Prefer named exports** for components
- **Use TypeScript interfaces** for props
- **Destructure props** in function parameters
- **Keep components focused** - single responsibility

**Good**:
```typescript
interface EditableFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format?: 'currency' | 'percent';
}

export function EditableField({ label, value, onChange, format = 'currency' }: EditableFieldProps) {
  // implementation
}
```

### State Management (Zustand)

- **Keep stores focused** on specific domains
- **Use TypeScript interfaces** for state shape
- **Avoid deeply nested state** - flatten when possible
- **Use immer** for complex state updates

### Styling (Tailwind CSS)

- **Use Tailwind utility classes** for styling
- **Follow the design system**:
  - Colors: `zinc` for neutrals, `emerald` for primary, `red` for errors
  - Spacing: Use consistent spacing scale
  - Typography: `font-mono` for code/data
- **Avoid arbitrary values** unless necessary
- **Group related utilities** together

**Good**:
```tsx
<div className="bg-zinc-900 rounded-lg border border-zinc-700 p-6">
  <h2 className="text-xl font-mono text-zinc-100 mb-4">Title</h2>
</div>
```

### File Organization

- **Co-locate related files** in feature folders
- **Use index files** for clean imports
- **Separate concerns**: components, hooks, utils, types
- **Name files consistently**: PascalCase for components, camelCase for utilities

```
src/
├── components/
│   ├── upload/
│   │   ├── ReviewScreen.tsx
│   │   ├── UploadDropzone.tsx
│   │   └── index.ts
│   └── modeling/
├── hooks/
│   ├── useFinancialCalculations.ts
│   └── useTickerSearch.ts
├── lib/
│   ├── financial-logic.ts
│   └── extraction-types.ts
└── store/
    ├── useUploadStore.ts
    └── useValuationStore.ts
```

## Testing Requirements

### Unit Tests

- **Write tests** for all business logic
- **Use Vitest** for unit tests
- **Aim for 80%+ coverage** on critical paths
- **Test edge cases**: negative numbers, zero, very large numbers

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateWACC } from './financial-logic';

describe('calculateWACC', () => {
  it('should calculate WACC correctly', () => {
    const result = calculateWACC({
      equityValue: 1000,
      debtValue: 500,
      costOfEquity: 0.12,
      costOfDebt: 0.05,
      taxRate: 0.25,
    });
    expect(result).toBeCloseTo(0.0917, 4);
  });

  it('should handle zero debt case', () => {
    const result = calculateWACC({
      equityValue: 1000,
      debtValue: 0,
      costOfEquity: 0.12,
      costOfDebt: 0.05,
      taxRate: 0.25,
    });
    expect(result).toBe(0.12);
  });
});
```

### Component Tests

- **Use React Testing Library** for component tests
- **Test user interactions** and behavior
- **Mock external dependencies** (API calls, etc.)
- **Test accessibility** (ARIA labels, keyboard navigation)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation Standards

### Code Comments

- **Write self-documenting code** - good names reduce comment needs
- **Comment "why" not "what"** - code shows what, comments explain why
- **Use JSDoc** for public APIs and complex functions
- **Update comments** when code changes

**Good**:
```typescript
/**
 * Calculates the discount factor for a given period in DCF analysis.
 * Uses mid-year convention for more accurate present value calculations.
 *
 * @param period - The forecast period (1-based index)
 * @param wacc - Weighted average cost of capital (decimal, e.g., 0.10 for 10%)
 * @returns The discount factor to apply to cash flows
 */
function calculateDiscountFactor(period: number, wacc: number): number {
  // Use mid-year convention: discount by (period - 0.5)
  return 1 / Math.pow(1 + wacc, period - 0.5);
}
```

### README Updates

- **Update README.md** if you add features or change setup
- **Include screenshots** for UI changes
- **Document new environment variables**
- **Update feature list** for significant additions

### API Documentation

- **Update OpenAPI spec** (`server/openapi.yaml`) for API changes
- **Document request/response schemas**
- **Include example requests**
- **Document error cases**

## Pull Request Process

### Before Submitting

1. **Test thoroughly** - run all tests locally
2. **Build successfully** - ensure `npm run build` works
3. **Update documentation** - README, HELP.md, code comments
4. **Self-review** - read your own diff carefully
5. **Rebase on main** - ensure clean merge

### Submitting a PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Fill out PR template** with:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How was this tested?
   - **Screenshots**: For UI changes
   - **Breaking changes**: If any
   - **Related issues**: Link to GitHub issues

4. **PR title format**:
   ```
   feat(scope): Add Monte Carlo simulation to valuation
   fix(extraction): Handle timeout errors gracefully
   docs: Update API documentation for new endpoints
   ```

### PR Review Process

1. **Automated checks** must pass:
   - Tests
   - Linting
   - Build
   - Type checking

2. **Code review** by maintainers:
   - Code quality and style
   - Test coverage
   - Documentation completeness
   - Security considerations

3. **Address feedback**:
   - Respond to comments
   - Make requested changes
   - Push new commits (don't force push during review)

4. **Approval and merge**:
   - Requires 1+ approvals from maintainers
   - Maintainer will merge using "Squash and merge"

### After Merge

- **Delete your branch** (GitHub will prompt)
- **Update your local main**:
  ```bash
  git checkout main
  git pull upstream main
  ```

## Security Guidelines

### API Keys and Secrets

- **NEVER commit** API keys, tokens, or secrets
- **Use environment variables** for all sensitive data
- **Add sensitive files** to `.gitignore`
- **Use `.env.example`** to document required variables

### Input Validation

- **Validate all user input** on both client and server
- **Sanitize data** before processing
- **Use Zod schemas** for validation
- **Limit input sizes** to prevent DoS

### Dependencies

- **Keep dependencies updated** regularly
- **Review security advisories** (GitHub Dependabot)
- **Audit packages** before adding new dependencies
- **Use `npm audit`** to check for vulnerabilities

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **Email** the maintainers directly (see README)
3. **Include**: Description, impact, reproduction steps
4. **Wait for response** before public disclosure

## Project Structure

### Frontend (`src/`)

```
src/
├── components/        # React components
│   ├── upload/       # File upload and extraction
│   ├── modeling/     # Financial modeling interface
│   ├── valuation/    # Valuation display
│   └── analysis/     # Analysis tools
├── hooks/            # Custom React hooks
├── lib/              # Core business logic
│   ├── financial-logic.ts    # DCF calculations
│   ├── extraction-types.ts   # Type definitions
│   └── ticker-search.ts      # Ticker lookup
├── store/            # Zustand state management
│   ├── useUploadStore.ts     # Upload flow state
│   └── useValuationStore.ts  # Valuation state
└── App.tsx           # Root component
```

### Backend (`server/src/`)

```
server/src/
├── middleware/       # Express middleware
│   ├── csrf.ts      # CSRF protection
│   ├── rate-limit.ts # Rate limiting
│   └── validation.ts # Input validation
├── services/         # Business logic
│   ├── gemini.ts    # Gemini API client
│   └── claude.ts    # Claude API client
├── routes/           # API routes
│   ├── extraction.ts # Extraction endpoints
│   └── cache.ts     # Cache management
└── server.ts         # Express app setup
```

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: For security issues and private concerns

Thank you for contributing to Terminal Zero Finance! 🚀

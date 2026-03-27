# CRUSH Configuration for ProfitMaker

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build

## Server Commands
- `npm run server` - Start the CCXT server
- `npm run server:dev` - Start the CCXT server in watch mode

## Linting and Type Checking
- `npm run lint` - Run ESLint on the codebase
- Type checking is handled by TypeScript (configured in tsconfig files)

## Testing
- No test framework configured yet
- To add tests, consider using Jest or Vitest
- Run individual test files with: `npm test -- <test-file-path>`

## Code Style Guidelines

### Imports
- Use absolute imports with `@/*` alias for src directory
- Group imports in order: built-in, external, internal, type imports
- Use named imports when possible

### Formatting
- Follow ESLint rules defined in eslint.config.js
- Use Prettier for code formatting (implied by project setup)
- 2-space indentation
- No trailing commas in function parameters
- Semicolons are optional (follow existing code style)

### Types
- Use TypeScript for all files
- Prefer interfaces over types for object shapes
- Use explicit typing when it improves clarity
- Leverage type inference when possible

### Naming Conventions
- Use PascalCase for components and types
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants
- File names should match the component/function they export

### Error Handling
- Use try/catch blocks for async operations
- Handle errors gracefully with user-friendly messages
- Log errors appropriately for debugging

### Virtualization (from .cursorrules)
- Use virtual scroll for lists with >100 items
- Use virtualization for tables with >50 rows
- Use @tanstack/react-virtual for implementation
- Always pre-calculate element heights for better performance
- Use memoization (React.memo, useMemo, useCallback) for list items
- Optimize rendering by avoiding object creation in render functions

## Additional Rules from .cursorrules
- No fantasy - don't invent data, events, sources or opinions without request
- Be honest - specify what your answer is based on
- Prioritize accuracy and logic over presentation
- Avoid humor, metaphors, storytelling, or emotions unless specifically requested
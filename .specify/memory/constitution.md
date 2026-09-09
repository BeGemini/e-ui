<!-- 
SYNC IMPACT REPORT (v1.0.0)
- Version: Initial → 1.0.0 (MINOR: Initial constitution established)
- New principles: UI-First (shadcn), Type Safety, Full-Stack Integration, Responsive Design, Code Quality
- Sections added: Technology Stack Constraints, Development Workflow, Code Structure Standards
- Templates requiring updates: plan-template.md, spec-template.md, tasks-template.md (pending review)
-->

# e-ui Constitution

A full-stack Next.js application constitution defining standards for UI component usage (shadcn-only), type safety, integrated backend implementation, and code quality practices.

## Core Principles

### I. UI Component Library (shadcn-First)
All user interface elements MUST be built exclusively using components from the shadcn library.
No custom HTML elements, third-party UI libraries, or base HTML tags (div, span, button, etc.) 
shall be used for user-facing components. Rationale: Consistency, accessibility compliance, 
maintainability, and unified design language across the entire application.

### II. Type Safety (Mandatory TypeScript)
All code MUST be written in TypeScript with strict type checking enabled (tsconfig.json must 
enforce strict mode). No `any` types without explicit `// @ts-ignore` comments with documented 
justification. Interfaces/types MUST be defined for all component props, API request/response 
payloads, and data structures. Rationale: Runtime errors prevention, IDE support, self-documenting code, and easier refactoring.

### III. Full-Stack Integration (Next.js Only)
Backend functionality and API endpoints MUST be implemented within Next.js API routes 
(app/api/*). No separate backend service or external microservices are permitted unless 
explicitly approved by constitution amendment. Database access, business logic, and 
authentication flows MUST be contained within the Next.js application. Rationale: 
Simplified deployment, reduced operational complexity, single runtime environment.

### IV. Responsive & Accessible Design (Mobile-First)
All interfaces MUST follow mobile-first design principles using Tailwind CSS. Components 
MUST be responsive and function correctly on devices from 320px width upward. Accessibility 
(a11y) MUST be verified: ARIA labels, semantic HTML structure via shadcn components, keyboard 
navigation support, color contrast compliance (WCAG 2.1 AA minimum). Rationale: User inclusivity, 
broader audience reach, compliance with accessibility standards.

### V. Code Quality & Testing Discipline
Production code MUST be maintained with clear documentation, readable structure, and consistent 
patterns. Unit and integration tests for critical business logic are strongly recommended. 
Linting (ESLint) MUST pass before code is committed. Code reviews MUST verify principle 
compliance. Rationale: Maintainability, reduced bugs, knowledge transfer, long-term sustainability.

## Technology Stack Constraints

**Approved Stack**:
- Runtime: Node.js (via Next.js)
- Framework: Next.js 16+ with App Router
- UI Components: shadcn/ui exclusively
- Styling: Tailwind CSS with PostCSS
- Language: TypeScript (strict mode)
- Icons: lucide-react
- Type Support: @types/* packages for all dependencies

**Prohibited**:
- Custom UI component libraries (except shadcn)
- Alternative CSS frameworks (CSS-in-JS, styled-components, etc. not approved without amendment)
- Backend microservices or external API services (unless ratified amendment permits)
- Non-TypeScript code in app/ and lib/ directories

## Development Workflow

1. **Feature Development**: Feature branches must follow conventional commit format 
   (feat:, fix:, docs:, etc.)
2. **Type Checking**: `tsc --noEmit` must pass before merging
3. **Linting**: `npm run lint` must pass
4. **Component Usage**: All new UI elements must reference shadcn component implementations
5. **API Implementation**: Backend endpoints must be added to app/api/* with TypeScript types
6. **Testing**: Integration tests recommended for API routes and complex business logic

## Code Structure Standards

- **Components**: Place shadcn-based components in app/components/ with .tsx extension
- **API Routes**: Backend endpoints in app/api/* following RESTful conventions
- **Utilities**: Shared logic in lib/utils.ts and lib/*.ts files
- **Type Definitions**: Colocate types with their usage or in lib/types.ts
- **Configuration**: Environment variables must be typed (declare in lib/types.ts or similar)

## Governance

This constitution supersedes all conflicting practices and guidelines. 
- **Amendment Process**: Changes to principles or constraints require documented proposal, 
  rationale, and impact analysis before ratification
- **Version Policy**: Follow semantic versioning (MAJOR.MINOR.PATCH)
  - MAJOR: Principle removal or fundamental redefinition
  - MINOR: New principle/section or material guidance expansion
  - PATCH: Clarifications, wording refinements, corrections
- **Compliance Review**: PRs must explicitly verify adherence to all five Core Principles
- **Runtime Guidance**: See README.md and app/layout.tsx for ongoing development standards
- **Exceptions**: Non-compliant code requires exception documentation linking to a constitution amendment proposal

**Version**: 1.0.0 | **Ratified**: 2026-09-09 | **Last Amended**: 2026-09-09

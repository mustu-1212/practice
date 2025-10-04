# Company Management System

## Overview

A modern enterprise user management platform built with React, Express, and PostgreSQL. The system provides role-based access control (RBAC) with hierarchical user management, allowing companies to manage admins, managers, and employees with proper authorization flows. The platform features a clean, modern SaaS-style interface inspired by Linear, Notion, and Stripe Dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and dev server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod for form validation

**UI Framework:**
- Shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom design system
- CSS variables for theming support (light/dark modes)
- Inter font family from Google Fonts

**Design System:**
- Design approach follows modern SaaS admin patterns (Linear, Notion, Stripe)
- Custom color palette with semantic tokens for backgrounds, surfaces, borders
- Consistent component library with hover/active states using elevation overlays
- Responsive layout with sidebar navigation pattern

**State Management:**
- Authentication state managed via React Context (AuthProvider)
- Server state cached and synchronized with TanStack Query
- Local UI state handled with React hooks

### Backend Architecture

**Technology Stack:**
- Node.js with Express framework
- TypeScript for type safety across the stack
- Drizzle ORM for database operations
- Neon serverless PostgreSQL via WebSocket connection

**Authentication & Authorization:**
- JWT-based authentication using jsonwebtoken
- Password hashing with bcrypt (6 rounds)
- Token-based session management (stored in localStorage on client)
- Role-based access control with three roles: ADMIN, MANAGER, EMPLOYEE
- Hierarchical permissions enforced via middleware

**API Structure:**
- RESTful API endpoints under `/api` prefix
- Authentication middleware validates JWT tokens from Authorization header
- Centralized error handling middleware
- Request/response logging for API routes

**Database Schema:**
- Companies table: stores company information and default currency
- Users table: stores user credentials, roles, and company relationships
- Expenses table: stores employee expense claims with status tracking
- ApprovalHistory table: logs all approval/rejection actions on expenses
- Manager-employee hierarchy through self-referential `managerId` field
- UUID primary keys generated server-side
- Email uniqueness constraint enforced at database level

### Data Storage Solutions

**Database:**
- Neon Serverless PostgreSQL (WebSocket-based connection)
- Drizzle ORM with schema-first approach
- Migration management via drizzle-kit
- Connection pooling handled by Neon's serverless driver

**Schema Design:**
- Users belong to a single company (many-to-one)
- Optional manager relationship for hierarchy (self-referential)
- Timestamp tracking for company creation
- Password stored as bcrypt hash, never in plaintext

### External Dependencies

**Third-party APIs:**
- REST Countries API: Fetches currency information based on country during signup
  - Endpoint: `https://restcountries.com/v3.1/name/{country}`
  - Fallback: Defaults to USD if lookup fails
  - Used to auto-populate company default currency
- ExchangeRate-API: Provides real-time currency conversion for expense management
  - Endpoint: `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
  - Used to convert employee expense amounts to company default currency
  - Enables managers to review expenses in a standardized currency

**Database Service:**
- Neon Serverless PostgreSQL
  - WebSocket-based connection (requires `ws` package)
  - Connection string from `DATABASE_URL` environment variable
  - Serverless architecture with automatic scaling

**Development Tools:**
- Replit-specific plugins for development:
  - Runtime error modal overlay
  - Cartographer for code navigation
  - Dev banner for development mode indication

**Authentication:**
- JWT signing requires `SESSION_SECRET` environment variable
- Tokens contain user ID, email, role, and company ID

**UI Component Libraries:**
- Radix UI primitives for accessible components
- Lucide React for iconography
- cmdk for command palette functionality
- date-fns for date manipulation
- vaul for drawer components
- embla-carousel-react for carousels
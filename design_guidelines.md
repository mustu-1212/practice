# Design Guidelines: User Management & Company Platform

## Design Approach
**Selected Approach**: Design System-Based (Modern SaaS Admin)  
**Reference Products**: Linear, Notion, Stripe Dashboard  
**Rationale**: This is a utility-focused, information-dense application where clarity, efficiency, and consistency are paramount. Drawing from established modern admin interfaces ensures users can quickly understand and navigate role management workflows.

## Core Design Principles
1. **Clarity Over Decoration**: Every element serves a functional purpose
2. **Scannable Hierarchy**: Users should quickly identify key actions and information
3. **Progressive Disclosure**: Show essential info first, reveal complexity on demand
4. **Trust & Security**: Visual design reinforces the secure, enterprise-grade nature

---

## Color Palette

### Light Mode (Primary)
- **Background**: 0 0% 100% (pure white)
- **Surface**: 240 5% 96% (cool off-white for cards/panels)
- **Border**: 240 6% 90% (subtle borders)
- **Text Primary**: 240 10% 10% (near black)
- **Text Secondary**: 240 5% 45% (medium gray)
- **Primary Brand**: 220 90% 56% (confident blue - trust/security)
- **Success**: 142 76% 36% (green for confirmations)
- **Warning**: 38 92% 50% (amber for role changes)
- **Danger**: 0 84% 60% (red for deletions)

### Dark Mode
- **Background**: 240 10% 8%
- **Surface**: 240 8% 12%
- **Border**: 240 6% 20%
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 240 5% 65%
- **Primary Brand**: 220 85% 60%
- Colors maintain same hue relationships with adjusted lightness

---

## Typography

**Font Stack**: Inter (Google Fonts) for all UI  
**Fallback**: system-ui, -apple-system, sans-serif

### Scale
- **Headings (H1)**: text-3xl font-semibold (Dashboard titles)
- **Headings (H2)**: text-2xl font-semibold (Section headers)
- **Headings (H3)**: text-lg font-medium (Card titles)
- **Body**: text-base (Forms, descriptions)
- **Small**: text-sm (Helper text, labels)
- **Micro**: text-xs (Badges, timestamps)

### Weight Usage
- **Bold (600)**: Critical actions, primary headings
- **Medium (500)**: Subheadings, labels
- **Regular (400)**: Body text, inputs

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16  
**Container Max Width**: max-w-7xl (1280px)  
**Section Padding**: px-6 py-8 (mobile), px-8 py-12 (desktop)

### Grid Patterns
- **Dashboard Sections**: 2-column split (sidebar + main content)
- **User Lists**: Single column tables with horizontal scroll on mobile
- **Forms**: Single column max-w-md for inputs, 2-column for compact fields
- **Cards**: Grid of 1-2-3 columns responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with company logo (left), user profile dropdown (right)
- **Sidebar** (Admin Dashboard): Vertical nav with icons + labels, collapsible on mobile
  - Dashboard home, Users, Roles, Company Settings
  - Active state: Primary background with subtle left border accent
  
### Authentication Pages
- **Layout**: Centered card (max-w-md) on minimal background
- **Form Structure**: Stacked inputs with clear labels above each field
- **CTA Buttons**: Full-width primary buttons
- **Branding**: Subtle logo placement top-center
- **Links**: Small text-sm links for "Already have an account?" toggles

### Admin Dashboard

**User Management Table**:
- **Header Row**: Sticky with sort indicators
- **Columns**: Avatar/Name, Email, Role (badge), Manager, Actions
- **Row Hover**: Subtle background lift (surface color change)
- **Action Buttons**: Icon-only buttons (edit, delete) revealed on hover
- **Empty State**: Centered illustration + "No users yet" message with "Add User" CTA

**Create/Edit User Modal**:
- **Overlay**: Semi-transparent dark backdrop (backdrop-blur-sm)
- **Modal**: Center-screen card with close icon (top-right)
- **Form Layout**: 
  - Name, Email fields (full-width)
  - Role dropdown (searchable select)
  - Manager assignment (searchable dropdown showing hierarchy)
  - Action buttons: Cancel (outline) + Save (primary) aligned right

### Forms & Inputs

**Text Inputs**:
- Border style with subtle shadow on focus
- Placeholder text in secondary color
- Error states: Red border + error message below
- Success states: Green border for validated fields

**Dropdowns/Selects**:
- Custom styled with chevron icon
- Options list with hover states
- Search functionality for long lists (managers, roles)

**Buttons**:
- **Primary**: Solid primary color, white text, rounded-md
- **Secondary**: Outline style with border
- **Danger**: Red background for destructive actions
- **Icon Buttons**: Square with icon, subtle hover background

### Data Display

**Role Badges**:
- **ADMIN**: Primary brand color background, white text
- **MANAGER**: Purple/indigo tint (260 75% 55%)
- **EMPLOYEE**: Neutral gray (240 5% 65%)
- Rounded-full, px-3 py-1, text-xs font-medium

**User Avatars**:
- Circular, 40x40px in lists, 80x80px in profiles
- Initials fallback with color based on name hash
- Ring border in surface color

**Stats Cards** (Dashboard Overview):
- White/surface background cards with shadow-sm
- Large number (text-3xl font-bold)
- Label below (text-sm secondary color)
- Icon in top-right corner (primary color, 20% opacity background)

---

## Animations

**Minimal & Purposeful Only**:
- **Page Transitions**: None (instant navigation for speed)
- **Modal Entry**: Subtle fade-in with slight scale (0.95 to 1)
- **Button Hover**: Background color shift (50ms transition)
- **Loading States**: Spinning icon on buttons during save/submit

---

## Accessibility & Consistency

- **Dark Mode Toggle**: Persistent across sessions, icon in top nav
- **Keyboard Navigation**: Full tab-through support, visible focus rings
- **Form Inputs**: Maintain consistent dark/light mode backgrounds
- **Contrast Ratios**: Minimum 4.5:1 for all text
- **Error Messages**: Paired with visual indicators (color + icon)

---

## Images

**No Hero Images Required** - This is a utility application.

**Optional Assets**:
- **Company Logo Placeholder**: Simple icon in top-left nav (upload functionality)
- **Empty State Illustrations**: Minimal line-art style illustrations for "No users found" states
- **User Avatars**: Generated from initials or uploaded photos

---

## Page-Specific Layouts

### Signup Page
- Centered card with company name input, admin name, email, password
- Currency auto-detection note below country field
- "Create Company" primary button
- Link to login at bottom

### Login Page
- Centered card with email, password fields
- "Log In" primary button
- "Don't have an account? Sign up" link

### Admin Dashboard
- **Sidebar**: Icons for Dashboard, Users, Settings (vertical stack)
- **Main Content**: 
  - Header with "User Management" title + "Add User" button (right-aligned)
  - Stats row: Total Users, Admins, Managers, Employees (4 cards)
  - User table below with search/filter bar above
  - Pagination controls below table

### User Creation Flow
- Modal overlay with form
- Real-time validation feedback
- Manager dropdown shows hierarchical structure with indentation

---

**Design Output**: A clean, professional admin interface that prioritizes speed, clarity, and data density while maintaining visual polish through consistent spacing, thoughtful typography, and strategic use of color for status/roles.
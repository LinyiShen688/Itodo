# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iTodo3 is a minimalist "Four Quadrants" todo list application based on the Eisenhower Matrix. The project has evolved from a simple local-only app to a sophisticated hybrid storage application with cloud sync and AI-powered insights.

### Core Features

- **Four Quadrants System**: Task organization based on urgency and importance
- **Hybrid Storage**: Local-first approach with IndexedDB + optional Supabase cloud sync
- **Authentication**: Complete auth system with email/password login, registration, and password reset
- **Trash/Recycle Bin**: Soft delete with restore capabilities and batch operations
- **AI Analysis**: Task completion insights powered by SiliconFlow API
- **PWA Support**: Offline-capable Progressive Web App with installability
- **Drag & Drop**: Intuitive task management with touch-friendly drag operations

## Technology Stack

- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS v4 + custom CSS variables
- **UI Library**: Shadcn UI (configured in `components.json`)
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable
- **Local Storage**: IndexedDB via `idb` library
- **Cloud Storage**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand for global state
- **Authentication**: Supabase Auth with SSR support
- **AI Integration**: SiliconFlow API for task analysis
- **Testing**: Jest + React Testing Library
- **PWA**: next-pwa for Progressive Web App features

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture Overview

### Hybrid Storage Architecture
The project implements a sophisticated "local-first" hybrid storage model:

```
┌─────────────────────────────────────────────────────────┐
│                    Components Layer                       │
├─────────────────────────────────────────────────────────┤
│                    Hook Layer (useTasks, etc.)           │
├─────────────────────────────────────────────────────────┤
│                   Storage Manager (Future)                │
├───────────────────────┬─────────────────────────────────┤
│   IndexedDB Layer      │        Supabase Layer           │
│   (Local Storage)      │        (Cloud Storage)          │
└───────────────────────┴─────────────────────────────────┘
```

### Data Layer
- **IndexedDB**: Primary local storage using `src/lib/indexeddb.js`
  - Database: `iTodoApp` (version 3)
  - Stores: `tasks`, `taskLists`
  - UUID-based IDs for seamless sync
- **Supabase**: Cloud persistence layer
  - Tables: `tasks`, `task_lists`
  - Row Level Security (RLS) enabled
  - Real-time subscriptions ready

### State Management
- **authStore**: Authentication state and user session
- **taskStore**: Task-related state and operations
- **taskListStore**: Task list management
- **trashStore**: Deleted tasks counter and operations

### Component Structure
- **Page Component**: `src/app/page.js` - Main application entry point
- **Layout**: `src/app/layout.js` - Root layout with font configuration
- **Core Components**:
  - `QuadrantGrid.jsx` - Main 2x2 grid container with drag handling
  - `Quadrant.jsx` - Individual quadrant component
  - `TaskItem.jsx` - Individual task with drag support
  - `DraggableTaskItem.jsx` - Draggable wrapper for tasks
  - `Header.jsx` - Top navigation with user menu and settings
  - `Sidebar.jsx` - Task list management panel
  - `DragContext.jsx` - Drag and drop context provider
- **Auth Components**:
  - `AuthModal.jsx` - Login/Register/Password reset modal
- **Feature Components**:
  - `TrashModal.jsx` - Trash/recycle bin with batch operations
  - `AIAnalysis.jsx` - AI-powered task insights
  - `PomodoroTimer.jsx` - Pomodoro timer for focus sessions
  - `SummaryModal.jsx` - Task completion summary
  - `FAB.jsx` - Floating action button
  - `Toast.jsx` & `ToastContainer.jsx` - Toast notifications
  - `LoadingSpinner.jsx` & `LoadingState.jsx` - Loading indicators

### Custom Hooks
- `useTasks.js` - Task CRUD operations and state management
- `useTaskLists.js` - Task list management
- `useLocalStorage.js` - Local storage utilities
- `useTrash.js` - Trash/recycle bin operations
- `useTheme.js` - Theme switching functionality
- `useToast.js` - Toast notification system
- `useDebounce.js` - Debounce utility hook
- `useVirtualization.js` - Virtual scrolling for performance
- `useAppSettings.js` - Application settings management
- `useSidebarState.js` - Sidebar visibility state

### Four Quadrants Configuration
```javascript
// From QuadrantGrid.jsx
const QUADRANT_CONFIG = [
  { id: 1, title: '重要且紧急', isFirst: true },     // Important & Urgent
  { id: 2, title: '重要不紧急', isFirst: false },   // Important & Not Urgent  
  { id: 3, title: '紧急不重要', isFirst: false },   // Urgent & Not Important
  { id: 4, title: '不重要不紧急', isFirst: false }  // Not Important & Not Urgent
];
```

## Key Design Patterns

### CSS Variables (Theme System)
The application uses CSS custom properties for theming:
```css
:root {
  --parchment: #f4e8d0;
  --ink-brown: #5c4033;
  --accent-gold: #d4a574;
  /* Four quadrant colors */
  --urgent-important: #e74c3c;
  --important-not-urgent: #3498db;
  --urgent-not-important: #27ae60;
  --not-urgent-not-important: #95a5a6;
}
```

### Drag and Drop Implementation
- Uses @dnd-kit for touch-friendly drag operations
- Supports both intra-quadrant reordering and cross-quadrant moves
- Drag logic handled in `QuadrantGrid.jsx` `handleDragEnd` function

### Responsive Design
- **Mobile**: Single column vertical scroll
- **Desktop**: 2x2 grid layout
- Breakpoint: 768px (Tailwind `md:` prefix)

## Authentication & Security

### Authentication System
- **Provider**: Supabase Auth with email/password
- **Features**:
  - Email/password registration with verification
  - Login with "Remember Me" functionality
  - Password reset via email
  - Session persistence and auto-refresh
  - Encrypted credential storage (XOR + Base64)

### Security Features
- **Row Level Security (RLS)**: Database-level access control
- **User Data Isolation**: Each user can only access their own data
- **UUID-based IDs**: Collision-resistant identifiers
- **Encrypted Storage**: Password encryption for "Remember Me"
- **Session Management**: Secure token handling with SSR support

## Data Structures

### Task Object
```javascript
{
  id: string,           // UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
  text: string,         // Task content
  completed: 0|1,       // Boolean as integer for IndexedDB
  deleted: 0|1,         // Soft delete flag
  quadrant: 1|2|3|4,    // Quadrant assignment
  listId: string,       // Parent task list ID (UUID)
  estimatedTime: string,// Estimated completion time
  order: number,        // Sort order within quadrant
  createdAt: Date,
  updatedAt: Date
}
```

### Task List Object
```javascript
{
  id: string,           // UUID v4
  name: string,         // Display name
  isActive: 0|1,        // Boolean as integer
  layoutMode: string,   // Layout mode (default: "FOUR")
  showETA: boolean,     // Show estimated time
  createdAt: Date,
  updatedAt: Date
}
```

## Visual Design Reference

The design closely follows `proto.html` with:
- Parchment background texture with dual gradient overlays
- First quadrant has special styling with gentle glow animation
- Priority dots colored by quadrant
- Handwritten fonts: 'Caveat' for titles, 'Noto Serif SC' for content

## Development Guidelines

1. **Follow proto.html**: Maintain 1:1 visual consistency with the original prototype
2. **Mobile-first**: Always consider mobile experience first
3. **Performance**: Use React.memo for expensive components (see MemoizedQuadrant)
4. **Accessibility**: Maintain focus management and keyboard navigation
5. **Data persistence**: All user actions should persist to IndexedDB immediately

## Key Features

### Trash/Recycle Bin
- **Soft Delete**: Tasks are marked as deleted, not removed
- **Batch Operations**: Select multiple tasks for restore/delete
- **Permanent Delete**: Option to permanently remove tasks
- **Clear All**: Empty entire trash with confirmation
- **Counter Badge**: Shows number of deleted tasks

### AI Task Analysis
- **Provider**: SiliconFlow API (DeepSeek model)
- **Features**:
  - Analyze task completion patterns
  - Provide productivity insights
  - Generate recommendations
  - Quick insights without API calls
- **Trigger**: Available in trash modal for deleted tasks

### Theme System
- **Multiple Themes**: Support for different color schemes
- **CSS Variables**: Theme colors defined as CSS custom properties
- **Dynamic Switching**: Real-time theme changes without reload
- **Persistence**: Theme preference saved locally

## Common Development Tasks

- **Add new task**: Use `addTask` from `useTasks` hook
- **Implement cloud sync**: Follow the hybrid storage architecture in `code-design-plan.md`
- **Modify quadrant layout**: Update `QUADRANT_CONFIG` in `QuadrantGrid.jsx`
- **Theme changes**: Modify CSS variables in `globals.css`
- **New components**: Place in `src/components/` and follow existing patterns
- **Database schema changes**: Update `src/lib/indexeddb.js` and increment `DB_VERSION`
- **Add Supabase tables**: Follow schema in `database-schema.md`
- **Authentication flow**: Use `authStore` and `AuthModal` components

## Testing

### Test Setup
- **Framework**: Jest with React Testing Library
- **Environment**: jsdom for DOM simulation
- **Mocks**: fake-indexeddb for IndexedDB testing
- **Coverage**: Run `npm run test:ci` for coverage report

### Test Structure
```
src/__tests__/
├── components/     # Component tests
├── hooks/         # Hook tests
├── stores/        # Store tests
└── utils/         # Utility tests
```

### Running Tests
```bash
npm test          # Run all tests
npm run test:watch # Watch mode
npm run test:ci   # CI mode with coverage
```

## Important Implementation Notes

### Hybrid Storage Status
The hybrid storage architecture is **designed but not yet implemented**. Current status:
- ✅ Local storage (IndexedDB) - Fully implemented
- ✅ Authentication (Supabase Auth) - Implemented
- ✅ Database schema - Designed (see `database-schema.md`)
- ⏳ Storage Manager - Not implemented
- ⏳ Sync mechanism - Not implemented
- ⏳ Conflict resolution - Not implemented

### UUID Implementation
- All IDs use UUID v4 format for future cloud sync compatibility
- Generated using `crypto.randomUUID()` with fallback
- No ID conversion needed between local and cloud storage

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Cursor Rules Reference

The project includes comprehensive development rules in `.cursor/rules/itodo-development.mdc` which covers:
- Technical specifications and file structure
- Color variables and design system
- Interaction patterns and animation guidelines
- Data structure definitions
- PWA configuration requirements

## Best Practices

### Code Style
- Use TypeScript-style JSDoc comments for better IDE support
- Follow existing component patterns (e.g., MemoizedQuadrant)
- Keep components focused and single-purpose
- Use custom hooks for complex logic

### State Management
- Local state for UI-only concerns
- Zustand stores for shared application state
- IndexedDB for persistent data
- Avoid prop drilling - use stores or context

### Performance
- Memoize expensive computations
- Use virtual scrolling for long lists
- Lazy load modals and heavy components
- Batch database operations when possible

### Security
- Never expose API keys in client code
- Validate user input on both client and server
- Use Supabase RLS for data access control
- Encrypt sensitive data before local storage

## Migration Path

### For Existing Users
When implementing cloud sync:
1. Detect existing IndexedDB data on first login
2. Prompt user to migrate data to cloud
3. Use batch operations for efficient migration
4. Maintain local data as source of truth
5. Mark migration complete in localStorage

### Data Migration Strategy
See `code-design-plan.md` for detailed migration implementation:
- Automatic detection of unmigrated data
- One-time migration on first login
- Preserve all existing data relationships
- Zero data loss guarantee
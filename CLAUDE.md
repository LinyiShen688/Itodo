# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iTodo3 is a minimalist "Four Quadrants" todo list application based on the Eisenhower Matrix. The project is built as a 1:1 recreation of `proto.html` with a focus on:

- **Simplicity**: Core functionality only - task creation, four-quadrant drag & drop
- **Aesthetics**: Parchment texture with handwritten-style fonts for a "writing on paper" experience
- **Cross-platform**: PWA application with consistent desktop and mobile experience, offline support

## Technology Stack

- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS v4 + custom CSS variables
- **UI Library**: Shadcn UI (configured in `components.json`)
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable
- **Data Storage**: IndexedDB via `idb` library for client-side persistence
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

### Data Layer
- **IndexedDB**: Primary storage using `src/lib/indexeddb.js`
- **Two main stores**: `tasks` and `taskLists`
- **Default task lists**: "今天要做的事", "明天要做的事", "学习的事", "工作的事"

### Component Structure
- **Page Component**: `src/app/page.js` - Main application entry point
- **Layout**: `src/app/layout.js` - Root layout with font configuration
- **Core Components**:
  - `QuadrantGrid.jsx` - Main 2x2 grid container with drag handling
  - `Quadrant.jsx` - Individual quadrant component
  - `TaskItem.jsx` - Individual task with drag support
  - `Header.jsx` - Top navigation bar
  - `Sidebar.jsx` - Task list management panel
  - `DragContext.jsx` - Drag and drop context provider

### Custom Hooks
- `useTasks.js` - Task CRUD operations and state management
- `useTaskLists.js` - Task list management
- `useLocalStorage.js` - Local storage utilities

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

## Data Structures

### Task Object
```javascript
{
  id: string,           // Generated unique ID
  text: string,         // Task content
  completed: 0|1,       // Boolean as integer for IndexedDB
  quadrant: 1|2|3|4,    // Quadrant assignment
  listId: string,       // Parent task list ID
  order: number,        // Sort order within quadrant
  createdAt: Date,
  updatedAt: Date
}
```

### Task List Object
```javascript
{
  id: string,           // List identifier
  name: string,         // Display name
  isActive: 0|1,        // Boolean as integer
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

## Common Development Tasks

- **Add new task**: Use `addTask` from `useTasks` hook
- **Modify quadrant layout**: Update `QUADRANT_CONFIG` in `QuadrantGrid.jsx`
- **Theme changes**: Modify CSS variables in `globals.css`
- **New components**: Place in `src/components/` and follow existing patterns
- **Database schema changes**: Update `src/lib/indexeddb.js` and increment `DB_VERSION`

## Cursor Rules Reference

The project includes comprehensive development rules in `.cursor/rules/itodo-development.mdc` which covers:
- Technical specifications and file structure
- Color variables and design system
- Interaction patterns and animation guidelines
- Data structure definitions
- PWA configuration requirements
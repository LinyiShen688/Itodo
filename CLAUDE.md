# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Technical Analysis Guidelines

**Important**: When providing technical analysis and recommendations, maintain an objective, professional stance. Provide honest technical assessments without attempting to please or appease. When issues exist, point them out directly. For technical solutions, clearly articulate both advantages and limitations - emphasize potential risks and drawbacks even more than benefits. Constructive criticism and identification of problems are expected and valued over diplomatic avoidance of technical realities.

## Project Overview

iTodo3 is a minimalist todo app based on the Eisenhower Matrix (four quadrants). Local-first architecture with optional cloud sync.

**Tech Stack**: Next.js 15, Tailwind CSS v4, @dnd-kit, IndexedDB, Supabase, Zustand

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build  
npm run lint         # Lint code
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:ci      # CI with coverage
```

## Architecture

```
Components → Hooks (useTasks) → Storage
                                   ├── IndexedDB (local)
                                   └── Supabase (cloud) [planned]
```

**Key Files**:
- `src/lib/indexeddb.js` - IndexedDB wrapper (DB: iTodoApp v4)
- `src/components/QuadrantGrid.jsx` - Main 2x2 grid with drag logic
- `src/hooks/useTasks.js` - Task CRUD operations
- `src/stores/` - Zustand stores (auth, task, taskList, trash)

## Data Structures

```javascript
// Task
{
  id: string,         // UUID v4
  text: string,       
  completed: 0|1,     // Boolean as int
  deleted: 0|1|2,     // 0=normal, 1=trash, 2=tombstone
  quadrant: 1-4,      
  listId: string,     // Parent list UUID
  order: number,
  createdAt/updatedAt: Date
}

// TaskList  
{
  id: string,         // UUID v4
  name: string,
  isActive: 0|1,      // Boolean as int
  deleted: 0|2,       // 0=normal, 2=tombstone (no trash status)
  layoutMode: string, // Default: "FOUR"
  createdAt/updatedAt: Date
}
```

## Implementation Status

✅ **Implemented**:
- Local storage (IndexedDB)
- Supabase Auth
- Drag & drop
- Trash/recycle bin
- AI task analysis (SiliconFlow API)
- PWA support

⏳ **Not Implemented**:
- Storage Manager layer
- Cloud sync mechanism
- Conflict resolution
- Real-time sync

## Critical Notes

1. **IDs**: All use UUID v4 (`crypto.randomUUID()`)
2. **Storage**: Currently local-only despite cloud infrastructure
3. **Design**: Follow `proto.html` for visual consistency
4. **Mobile**: Responsive breakpoint at 768px
5. **Quadrants**: 1=Important+Urgent, 2=Important+NotUrgent, 3=Urgent+NotImportant, 4=Neither

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

## Related Docs

- `code-design-plan.md` - Hybrid storage implementation plan
- `database-schema.md` - Supabase table schemas
- `.cursor/rules/itodo-development.mdc` - Detailed development rules
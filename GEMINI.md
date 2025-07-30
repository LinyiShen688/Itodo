# Gemini Project Memory: iTodo

## 1. Project Overview

iTodo is a personal task management application based on the Eisenhower Matrix. The goal is to create a beautiful, intuitive, and powerful tool for personal productivity. The application is a web app built with Next.js and React, designed to work seamlessly online and offline.

## 2. Core Features

### Implemented (Inferred from Codebase)
*   **Task Management:** Core functionality for creating, displaying, and managing tasks.
*   **Eisenhower Matrix UI:** A quadrant-based grid for task organization (`QuadrantGrid.jsx`, `Quadrant.jsx`).
*   **Drag & Drop:** Reordering and re-categorizing tasks via drag and drop (`DragContext.jsx`, `DraggableTaskItem.jsx`).
*   **Local First Storage:** Offline capability using IndexedDB (`indexeddb-manager.js`).
*   **State Management:** Centralized state management for tasks, lists, and trash using Zustand (`taskStore.js`, `taskListStore.js`, `trashStore.js`).
*   **Basic User Authentication:** Integration with Supabase for user sign-in/out (`supabase/client.js`, `authStore.js`).
*   **Component-Based UI:** A library of React components for various UI elements like modals, toggles, and toasts.
*   **Trash/Recycle Bin:** Soft deletion of tasks (`TrashModal.jsx`, `useTrash.js`).
*   **Light/Dark Theme:** Basic theme switching support (`useTheme.js`).

### Planned (From design docs & TODO)
*   **Full Data Synchronization:** Robust, queue-based synchronization of data between the local IndexedDB and the remote Supabase backend.
*   **Internationalization (i18n):** Support for multiple languages.
*   **Animations & UX Refinements:** Adding fluid animations and micro-interactions to improve the user experience.
*   **Comprehensive Settings:** Expanding user-configurable settings (`useAppSettings.js`).

## 3. Architecture

*   **Frontend:** Next.js, React
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand
*   **Backend & Auth:** Supabase
*   **Local Database:** IndexedDB
*   **Testing:** Jest


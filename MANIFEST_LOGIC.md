# Sidebar Merge and Sync Logic

## Overview
This document describes the logic used by the sidebar to load, merge, and persist chat questions/bookmarks, ensuring robust handling of lazy loading, user edits, and incremental sync.

---

## 1. On Page Load
- The sidebar loads questions from Chrome storage (user's last state).
- It requests all visible questions from the content script (which scans the DOM for user questions).
- For each question found on the page:
  - If it exists in storage (matched by selector or snippet), the sidebar uses the structure (parent, order, edits) from storage.
  - If it does NOT exist in storage, it is added as a new main question (parent: null, order: at end).
- If a question exists in storage but is NOT found on the page, it is retained (user may want to keep bookmarks for deleted/hidden questions).

## 2. Tree Structure
- The tree structure (parent, order, edits) is always taken from storage for questions that exist there.
- Newly found questions are added as main questions unless the user later organizes them.

## 3. Lazy Loading (Incremental Sync)
- As new questions are loaded (e.g., by scrolling), the content script sends only the new questions to the sidebar.
- The sidebar merges them in as above, never overwriting user structure for existing questions.
- After merging, the sidebar saves the updated questions array to Chrome storage.

## 4. User Edits
- Any drag-and-drop, tagging, editing, or deleting is always done on the sidebar’s local data.
- These changes are saved to Chrome storage and persist across reloads.

## 5. Refresh
- The 'Refresh' button in the sidebar allows the user to reload all questions from the page, overwriting any manual changes.
- The user is warned before this action.

## 6. No Overwrite
- The sidebar never resets or re-imports the entire list from the page after the initial load—only new, previously unseen questions are added, unless the user explicitly refreshes.

---

This logic ensures robust, user-friendly, and persistent handling of chat questions, even with lazy loading and user customization. 
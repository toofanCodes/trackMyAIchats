# Sidebar Logic (2024 Simplified)

The sidebar now acts as a pure display layer:
- It receives questions from the parent content script via postMessage.
- Pinned questions are an exception and are persisted using `localStorage` directly within the sidebar.
- All other question data is managed by the parent content script and sent to the sidebar for display.

This ensures a simple, robust, and maintainable sidebar experience. 
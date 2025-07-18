# Sidebar Logic (2024 Simplified)

The sidebar now acts as a pure display layer:
- It receives questions from the parent content script via postMessage.
- No local storage, merging, or user edit persistence is performed.
- All question data is managed by the parent content script and sent to the sidebar for display.

This ensures a simple, robust, and maintainable sidebar experience. 
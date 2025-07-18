// popup.js
const toggle = document.getElementById('toggleSidebar');

// Load current state
chrome.storage.local.get(['sidebarEnabled'], (result) => {
  toggle.checked = result.sidebarEnabled !== false; // default to enabled
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ sidebarEnabled: toggle.checked });
}); 
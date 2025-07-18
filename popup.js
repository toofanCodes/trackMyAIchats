// popup.js
const toggle = document.getElementById('toggleSidebar');
const showSidebarBtn = document.getElementById('showSidebarBtn');

// Load current state
chrome.storage.local.get(['sidebarEnabled'], (result) => {
  toggle.checked = result.sidebarEnabled !== false; // default to enabled
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ sidebarEnabled: toggle.checked });
});

// Show Sidebar button logic
if (showSidebarBtn) {
  showSidebarBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'showSidebar' });
      }
    });
  });
} 
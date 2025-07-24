// popup.js
const toggle = document.getElementById('toggleSidebar');
const showSidebarBtn = document.getElementById('showSidebarBtn');

// Load current state and set up event listeners only if chrome.storage.local is available
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['sidebarEnabled'], (result) => {
    toggle.checked = result.sidebarEnabled !== false; // default to enabled
  });

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ sidebarEnabled: toggle.checked });
  });
} else {
  console.warn('chrome.storage.local is not available. Are you running this as a standalone file?');
  // Disable the toggle to prevent user interaction and further errors
  if (toggle) toggle.disabled = true;
}

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
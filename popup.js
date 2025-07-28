// popup.js
const showSidebarBtn = document.getElementById('showSidebarBtn');

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
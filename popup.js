// popup.js
const showSidebarBtn = document.getElementById('showSidebarBtn');
const howToUseLink = document.getElementById('howToUseLink');

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

// "How to use" link logic
if (howToUseLink) {
  howToUseLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('docs/guide.html') });
  });
}
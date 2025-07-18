// content.js - Clean, focused version for sidebar injection and communication only

console.log('[LLM Bookmark] Content script loaded');

(function() {
  // --- Sidebar Injection ---
  function injectSidebar() {
    if (document.getElementById('llm-bookmark-sidebar')) return;
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sidebar.html');
    iframe.id = 'llm-bookmark-sidebar';
    iframe.style.position = 'fixed';
    iframe.style.top = '60px';
    iframe.style.right = '0';
    iframe.style.width = '280px';
    iframe.style.height = '500px';
    iframe.style.zIndex = '999999';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    // Do NOT set resize or overflow
    document.body.appendChild(iframe);

    // --- Draggable Handle for Sidebar ---
    const dragHandle = document.createElement('div');
    dragHandle.style.position = 'fixed';
    dragHandle.style.top = '70px';
    dragHandle.style.right = '105px';
    dragHandle.style.width = '160px';
    dragHandle.style.height = '40px';
    dragHandle.style.background = 'rgba(0,0,0,0)';
    dragHandle.style.cursor = 'move';
    dragHandle.style.zIndex = '1000000';
    dragHandle.style.borderTopLeftRadius = '8px';
    dragHandle.style.borderTopRightRadius = '8px';
    dragHandle.style.userSelect = 'none';
    dragHandle.innerText = '';
    document.body.appendChild(dragHandle);

    let isDragging = false, startX, startY, startLeft, startTop;
    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = iframe.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Clamp values
      const minLeft = 0;
      const minTop = 0;
      const maxLeft = window.innerWidth - iframe.offsetWidth;
      const maxTop = window.innerHeight - iframe.offsetHeight;
      let newLeft = Math.min(Math.max(startLeft + dx, minLeft), maxLeft);
      let newTop = Math.min(Math.max(startTop + dy, minTop), maxTop);
      iframe.style.left = newLeft + 'px';
      iframe.style.top = newTop + 'px';
      iframe.style.right = 'auto';
      iframe.style.bottom = 'auto';
      dragHandle.style.left = newLeft + 'px';
      dragHandle.style.top = newTop + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  injectSidebar();
  console.log('[LLM Bookmark] Sidebar injected (should be visible as iframe)');

  // --- DOM Scanning for Questions ---
  function scanQuestionsFromDOM() {
    const hostname = window.location.hostname;
    let questions = [];
    if (hostname.includes('gemini.google.com')) {
      // Gemini: user queries in <user-query> elements
      const userQueries = document.querySelectorAll('user-query');
      questions = Array.from(userQueries).map((el, idx) => {
        const lines = Array.from(el.querySelectorAll('.query-text-line')).map(line => line.textContent.trim());
        return {
          snippet: lines.join('\n').slice(0, 100),
          selector: `user-query:nth-of-type(${idx + 1})`,
          timestamp: '',
          type: 'question'
        };
      });
    } else if (hostname.includes('claude.ai')) {
      // Claude: try to find user messages (customize as needed)
      const userMsgs = document.querySelectorAll('.user-message');
      questions = Array.from(userMsgs).map((el, idx) => ({
        snippet: el.innerText.slice(0, 100),
        selector: `.user-message:nth-of-type(${idx + 1})`,
        timestamp: '',
        type: 'question'
      }));
    }
    return questions;
  }

  // --- Send Questions to Sidebar ---
  function sendQuestionsToSidebar() {
    const questions = scanQuestionsFromDOM();
    const sidebar = document.getElementById('llm-bookmark-sidebar');
    if (sidebar && sidebar.contentWindow) {
      sidebar.contentWindow.postMessage({ type: 'questionsFromDOM', questions }, '*');
    }
  }

  // --- Listen for Messages from Sidebar and Popup ---
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'requestQuestionsFromDOM') {
      sendQuestionsToSidebar();
    } else if (event.data && event.data.type === 'closeLLMSidebar') {
      const iframe = document.getElementById('llm-bookmark-sidebar');
      if (iframe) iframe.remove();
    }
  });

  // --- Listen for Chrome runtime messages from popup ---
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.action === 'showSidebar') {
        injectSidebar();
      }
    });
  }

  // --- Optionally, send questions on load ---
  setTimeout(sendQuestionsToSidebar, 1000);
})(); 
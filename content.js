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
    dragHandle.style.width = '60px';
    dragHandle.style.height = '18px';
    dragHandle.style.background = 'rgba(25, 118, 210, 0.18)';
    dragHandle.style.cursor = 'grab';
    dragHandle.style.zIndex = '1000000';
    dragHandle.style.borderRadius = '8px 8px 0 0';
    dragHandle.style.userSelect = 'none';
    dragHandle.style.display = 'flex';
    dragHandle.style.alignItems = 'center';
    dragHandle.style.justifyContent = 'center';
    dragHandle.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.10)';
    dragHandle.innerHTML = '<span style="font-size:1.2em;opacity:0.7;">&#x2630;</span>';
    dragHandle.style.pointerEvents = 'auto'; // Always clickable
    document.body.appendChild(dragHandle);

    // Initial position: above sidebar
    function positionDragHandle() {
      const sidebarRect = iframe.getBoundingClientRect();
      dragHandle.style.left = `${sidebarRect.left + (sidebarRect.width/2) - 30}px`;
      dragHandle.style.top = `${sidebarRect.top - 8}px`;
    }
    positionDragHandle();

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
      // Move handle with sidebar
      dragHandle.style.left = `${newLeft + (iframe.offsetWidth/2) - 30}px`;
      dragHandle.style.top = `${newTop - 8}px`;
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // Tooltip for drag handle
    function showDragTooltip(e) {
      let tooltip = document.getElementById('sidebar-drag-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'sidebar-drag-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.background = '#222';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '4px 10px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '0.95em';
        tooltip.style.zIndex = '1000001';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.10)';
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = 'Hold to drag';
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
    }
    function hideDragTooltip() {
      const tooltip = document.getElementById('sidebar-drag-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }
    dragHandle.addEventListener('mouseenter', showDragTooltip);
    dragHandle.addEventListener('mousemove', showDragTooltip);
    dragHandle.addEventListener('mouseleave', hideDragTooltip);
  }

  injectSidebar();
  console.log('[LLM Bookmark] Sidebar injected (should be visible as iframe)');

  // Helper to generate a unique selector for an element
  function getUniqueSelector(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let selector = el.nodeName.toLowerCase();
      if (el.className) {
        const classes = el.className.split(' ').filter(Boolean).join('.');
        if (classes) selector += '.' + classes;
      }
      let sibling = el;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName === el.nodeName) nth++;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.length ? path.join(' > ') : '';
  }

  // --- DOM Scanning for Questions ---
  function scanQuestionsFromDOM() {
    const hostname = window.location.hostname;
    let questions = [];
    if (hostname.includes('gemini.google.com')) {
      // Gemini: user queries in <user-query> elements
      const userQueries = document.querySelectorAll('user-query');
      questions = Array.from(userQueries).map((el) => {
        const lines = Array.from(el.querySelectorAll('.query-text-line')).map(line => line.textContent.trim());
        return {
          snippet: lines.join('\n').slice(0, 100),
          selector: getUniqueSelector(el),
          timestamp: '',
          type: 'question'
        };
      });
    } else if (hostname.includes('claude.ai')) {
      // Claude: try to find user messages (customize as needed)
      const userMsgs = document.querySelectorAll('.user-message');
      questions = Array.from(userMsgs).map((el) => ({
        snippet: el.innerText.slice(0, 100),
        selector: getUniqueSelector(el),
        timestamp: '',
        type: 'question'
      }));
    } else if (hostname.includes('chat.openai.com')) {
      // ChatGPT: user messages
      const userMsgs = document.querySelectorAll('[data-testid="user-message"]');
      questions = Array.from(userMsgs).map((el) => ({
        snippet: el.innerText.slice(0, 100),
        selector: getUniqueSelector(el),
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
    } else if (event.data && event.data.type === 'scrollToBookmark') {
      // Scroll to the element matching the selector
      try {
        const el = document.querySelector(event.data.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optionally, highlight the element
          el.style.transition = 'background 0.5s';
          const prevBg = el.style.background;
          el.style.background = '#fff7b2';
          setTimeout(() => { el.style.background = prevBg; }, 1200);
        }
      } catch (e) {
        console.warn('Failed to scroll to bookmark:', e);
      }
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

  // Helper: Run a callback when the URL changes (SPA navigation)
  function onUrlChange(callback) {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        callback();
      }
    }).observe(document, {subtree: true, childList: true});
    window.addEventListener('popstate', () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback();
      }
    });
  }

  // Observe chat container for lazy loading (scroll up)
  function observeChatContainer() {
    let chatSelector = null;
    if (window.location.hostname.includes('chat.openai.com')) {
      chatSelector = '[data-testid="conversation-turn"]'; // ChatGPT conversation turns
    } else if (window.location.hostname.includes('gemini.google.com')) {
      chatSelector = 'main'; // Gemini main container (adjust if needed)
    } else if (window.location.hostname.includes('claude.ai')) {
      chatSelector = '.chat-history'; // Claude chat history (adjust if needed)
    }
    if (!chatSelector) return;

    // Try to find the chat container
    const chatContainer = document.querySelector(chatSelector)?.parentElement || document.querySelector(chatSelector);
    if (!chatContainer) return;

    let debounceTimeout = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        sendQuestionsToSidebar();
      }, 300); // Debounce to avoid rapid firing
    });

    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  // Automatically refresh sidebar when URL changes (SPA navigation)
  onUrlChange(() => {
    setTimeout(sendQuestionsToSidebar, 500); // Give the new chat time to render
  });

  // Call observer after sidebar injection and on SPA navigation
  observeChatContainer();
  onUrlChange(() => {
    setTimeout(() => {
      sendQuestionsToSidebar();
      observeChatContainer(); // Re-attach observer in case chat container changed
    }, 500); // Give the new chat time to render
  });
})(); 
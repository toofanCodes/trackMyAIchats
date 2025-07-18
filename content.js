// DEBUG: Content script loaded
console.log("[LLM Bookmark] Content script loaded");
// content.js
(function() {
  // Check if sidebar is enabled
  chrome.storage.local.get(['sidebarEnabled'], (result) => {
    if (result.sidebarEnabled === false) {
      // Sidebar is disabled, do nothing
      return;
    }
    // Detect which site we're on
    const hostname = window.location.hostname;
    let site = null;
    if (hostname.includes('chat.openai.com')) site = 'chatgpt';
    else if (hostname.includes('gemini.google.com')) site = 'gemini';
    else if (hostname.includes('claude.ai')) site = 'claude';

    // Inject sidebar
    function injectSidebar() {
      if (document.getElementById('llm-bookmark-sidebar')) return;
      const iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('sidebar.html');
      iframe.id = 'llm-bookmark-sidebar';
      iframe.style.position = 'fixed';
      iframe.style.top = '60px';
      iframe.style.right = '0';
      iframe.style.width = '350px';
      iframe.style.height = '500px';
      iframe.style.zIndex = '999999';
      iframe.style.border = 'none';
      iframe.style.background = 'transparent';
      iframe.style.resize = 'both';
      iframe.style.overflow = 'hidden';
      document.body.appendChild(iframe);
    }

    injectSidebar();
    // DEBUG: Sidebar injected
    console.log("[LLM Bookmark] Sidebar injected (should be visible as iframe)");

    // Helper to get a unique key for the current page
    function getPageBookmarkKey() {
      const pageId = encodeURIComponent(location.pathname + location.search);
      return `llmBookmarks_${pageId}`;
    }
    // Helper to update the global index
    function updateBookmarkIndex(pageId, cb) {
      chrome.storage.local.get(['llmBookmarkIndex'], (result) => {
        let index = result.llmBookmarkIndex || [];
        if (!index.includes(pageId)) {
          index.push(pageId);
          chrome.storage.local.set({ llmBookmarkIndex: index }, cb);
        } else if (cb) {
          cb();
        }
      });
    }

    // --- ChatGPT Question Detection and Bookmarking ---
    if (site === 'chatgpt') {
      function onSend() {
        setTimeout(() => {
          const messages = document.querySelectorAll('[data-testid="conversation-turn"]');
          if (!messages.length) return;
          const last = messages[messages.length - 1];
          const userMsg = last.querySelector('[data-testid="user-message"]');
          if (!userMsg) return;
          const snippet = userMsg.innerText.slice(0, 100);
          const selector = `[data-testid="conversation-turn"]:nth-of-type(${messages.length}) [data-testid="user-message"]`;
          const timestamp = new Date().toLocaleString();
          const bookmarkKey = getPageBookmarkKey();
          const pageId = encodeURIComponent(location.pathname + location.search);
          chrome.storage.local.get([bookmarkKey], (result) => {
            const bookmarks = result[bookmarkKey] || [];
            bookmarks.push({ snippet, selector, timestamp, type: 'question' });
            chrome.storage.local.set({ [bookmarkKey]: bookmarks }, () => {
              updateBookmarkIndex(pageId, () => {
                const sidebar = document.getElementById('llm-bookmark-sidebar');
                if (sidebar) sidebar.contentWindow.postMessage({ type: 'newBookmark' }, '*');
              });
            });
          });
        }, 500);
      }
      // Attach listeners
      function attachListeners() {
        const input = document.querySelector('textarea');
        const sendBtn = document.querySelector('button[data-testid="send-button"]');
        if (input && !input._llmListener) {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) onSend();
          });
          input._llmListener = true;
        }
        if (sendBtn && !sendBtn._llmListener) {
          sendBtn.addEventListener('click', onSend);
          sendBtn._llmListener = true;
        }
      }
      setInterval(attachListeners, 2000); // Re-attach in case of SPA changes
    }

    // --- Gemini Question Detection and Bookmarking ---
    if (site === 'gemini') {
      function onSendGemini() {
        setTimeout(() => {
          const userQueries = document.querySelectorAll('user-query');
          if (!userQueries.length) return;
          const lastQuery = userQueries[userQueries.length - 1];
          const lines = Array.from(lastQuery.querySelectorAll('.query-text-line')).map(line => line.textContent.trim());
          const snippet = lines.join('\n').slice(0, 100);
          const selector = `user-query:nth-of-type(${userQueries.length})`;
          const timestamp = new Date().toLocaleString();
          const bookmarkKey = getPageBookmarkKey();
          const pageId = encodeURIComponent(location.pathname + location.search);
          chrome.storage.local.get([bookmarkKey], (result) => {
            const bookmarks = result[bookmarkKey] || [];
            bookmarks.push({ snippet, selector, timestamp, type: 'question' });
            chrome.storage.local.set({ [bookmarkKey]: bookmarks }, () => {
              updateBookmarkIndex(pageId, () => {
                const sidebar = document.getElementById('llm-bookmark-sidebar');
                if (sidebar) sidebar.contentWindow.postMessage({ type: 'newBookmark' }, '*');
              });
            });
          });
          // --- Artifact Detection: e.g., PostgreSQL Function: DepartmentAverageSalaryWithExperienceAndBonus ---
          // Look for <h2> or <h3> with <code> inside Gemini responses
          const artifactHeadings = document.querySelectorAll('h2 code, h3 code');
          artifactHeadings.forEach(codeEl => {
            const artifactName = codeEl.textContent.trim();
            if (artifactName && artifactName.length > 2) {
              const heading = codeEl.closest('h2, h3');
              if (heading) {
                const selector = getUniqueSelector(heading);
                const snippet = heading.textContent.slice(0, 100);
                chrome.storage.local.get([bookmarkKey], (result) => {
                  const bookmarks = result[bookmarkKey] || [];
                  // Avoid duplicates
                  if (!bookmarks.some(bm => bm.type === 'artifact' && bm.snippet === snippet)) {
                    bookmarks.push({ snippet, selector, timestamp, type: 'artifact', artifactName });
                    chrome.storage.local.set({ [bookmarkKey]: bookmarks }, () => {
                      updateBookmarkIndex(pageId, () => {
                        const sidebar = document.getElementById('llm-bookmark-sidebar');
                        if (sidebar) sidebar.contentWindow.postMessage({ type: 'newBookmark' }, '*');
                      });
                    });
                  }
                });
              }
            }
          });
        }, 500);
      }
      function getGeminiQuestions() {
          // For each <user-query>, join all .query-text-line children as a single question
          return Array.from(document.querySelectorAll('user-query')).map(userQueryEl =>
              Array.from(userQueryEl.querySelectorAll('.query-text-line'))
                  .map(line => line.textContent.trim())
                  .join('\n')
          );
      }
      // Attach listeners for Gemini
      function attachGeminiListeners() {
        const input = document.querySelector('textarea');
        const sendBtn = document.querySelector('button[aria-label="Send"]');
        if (input && !input._llmListenerGemini) {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) onSendGemini();
          });
          input._llmListenerGemini = true;
        }
        if (sendBtn && !sendBtn._llmListenerGemini) {
          sendBtn.addEventListener('click', onSendGemini);
          sendBtn._llmListenerGemini = true;
        }
      }
      setInterval(attachGeminiListeners, 2000);
    }

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

    // Helper to scan the DOM for questions
    function scanQuestionsFromDOM() {
      console.log('[LLM Bookmark][DEBUG] scanQuestionsFromDOM called');
      console.log('[LLM Bookmark][DEBUG] Hostname:', window.location.hostname);
      const hostname = window.location.hostname;
      let questions = [];
      if (hostname.includes('chat.openai.com')) {
        const userMsgs = document.querySelectorAll('[data-testid="user-message"]');
        console.log(`[LLM Bookmark][DEBUG] Found ${userMsgs.length} user-message elements on ChatGPT`);
        questions = Array.from(userMsgs).map((el) => ({
          snippet: el.innerText.slice(0, 100),
          selector: getUniqueSelector(el),
          timestamp: '',
          type: 'question'
        }));
      } else if (hostname.includes('gemini.google.com')) {
        const userQueries = document.querySelectorAll('user-query');
        console.log(`[LLM Bookmark][DEBUG] Found ${userQueries.length} user-query elements on Gemini`);
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
        const userMsgs = document.querySelectorAll('.user-message');
        console.log(`[LLM Bookmark][DEBUG] Found ${userMsgs.length} .user-message elements on Claude`);
        questions = Array.from(userMsgs).map((el) => ({
          snippet: el.innerText.slice(0, 100),
          selector: getUniqueSelector(el),
          timestamp: '',
          type: 'question'
        }));
      }
      return questions;
    }

    function sendQuestionsToSidebar() {
      const sidebar = document.getElementById('llm-bookmark-sidebar');
      if (!sidebar) return;
      const questions = scanQuestionsFromDOM();
      // DEBUG: Log selectors and snippets
      questions.forEach((q, i) => {
        console.log(`[LLM Bookmark][DEBUG] Q${i + 1}:`, q.snippet, '->', q.selector);
      });
      sidebar.contentWindow.postMessage({ type: 'questionsFromDOM', questions }, '*');
    }

    // After injecting the sidebar, send questions after a short delay
    setTimeout(sendQuestionsToSidebar, 1000);

    // Optionally, listen for requests from the sidebar to re-scan
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'requestQuestionsFromDOM') {
        sendQuestionsToSidebar();
      }
    });

    // --- Listen for scroll requests from sidebar ---
    window.addEventListener('message', (event) => {
      if (event.data.type === 'scrollToBookmark' && event.data.selector) {
        const el = document.querySelector(event.data.selector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Set up a MutationObserver to watch for new chat messages and update the sidebar
    function observeChatHistory() {
      let lastQuestions = [];
      // Find the chat history container for Gemini
      let chatHistory = document.querySelector('infinite-scroller.chat-history');
      if (!chatHistory) {
        // Try again later if not found
        setTimeout(observeChatHistory, 1000);
        return;
      }
      const observer = new MutationObserver(() => {
        const questions = scanQuestionsFromDOM();
        // Only send update if the questions list has changed
        if (JSON.stringify(questions.map(q => q.snippet)) !== JSON.stringify(lastQuestions.map(q => q.snippet))) {
          lastQuestions = questions;
          sendQuestionsToSidebar();
        }
      });
      observer.observe(chatHistory, { childList: true, subtree: true });
    }

    // Start observing after initial load
    setTimeout(observeChatHistory, 1500);
  });
})(); 
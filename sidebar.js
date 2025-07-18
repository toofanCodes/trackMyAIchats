// sidebar.js
const bookmarkList = document.getElementById('bookmark-list');

function getPageBookmarkKey() {
  const pageId = encodeURIComponent(location.pathname + location.search);
  return `llmBookmarks_${pageId}`;
}

function showLoading() {
  bookmarkList.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = 'Loading...';
  li.style.fontStyle = 'italic';
  bookmarkList.appendChild(li);
}

function scanQuestionsFromDOM() {
  // Try to detect which site we're on
  const hostname = window.location.hostname;
  let questions = [];
  if (hostname.includes('chat.openai.com')) {
    // ChatGPT: questions are user messages
    const userMsgs = document.querySelectorAll('[data-testid="user-message"]');
    questions = Array.from(userMsgs).map((el, idx) => ({
      snippet: el.innerText.slice(0, 100),
      selector: `[data-testid=\"conversation-turn\"]:nth-of-type(${idx + 1}) [data-testid=\"user-message\"]`,
      timestamp: '',
      type: 'question'
    }));
  } else if (hostname.includes('gemini.google.com')) {
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

function renderQuestions(questions) {
  bookmarkList.innerHTML = '';
  if (!questions || questions.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No questions found on this page.';
    bookmarkList.appendChild(li);
    return;
  }
  questions.forEach((q, idx) => {
    const li = document.createElement('li');
    li.textContent = q.snippet;
    li.className = 'question-bookmark';
    li.title = q.timestamp;
    li.onclick = () => {
      parent.postMessage({ type: 'scrollToBookmark', selector: q.selector }, '*');
    };
    bookmarkList.appendChild(li);
  });
}

function renderBookmarks(bookmarks) {
  bookmarkList.innerHTML = '';
  bookmarks.forEach((bm, idx) => {
    const li = document.createElement('li');
    if (bm.type === 'artifact') {
      li.textContent = `📄 ${bm.artifactName || bm.snippet}`;
      li.className = 'artifact-bookmark';
    } else {
      li.textContent = bm.snippet;
      li.className = 'question-bookmark';
    }
    li.title = bm.timestamp;
    li.onclick = () => {
      parent.postMessage({ type: 'scrollToBookmark', selector: bm.selector }, '*');
    };
    bookmarkList.appendChild(li);
  });
}

function loadBookmarks() {
  // DEBUG: Loading bookmarks
  console.log('[LLM Bookmark] Loading bookmarks for this page:', getPageBookmarkKey());
  chrome.storage.local.get([getPageBookmarkKey()], (result) => {
    const bookmarks = result[getPageBookmarkKey()] || [];
    // DEBUG: Bookmarks loaded
    console.log('[LLM Bookmark] Bookmarks loaded:', bookmarks);
    renderBookmarks(bookmarks);
  });
}

function loadBookmarksFallback() {
  // DEBUG: Loading bookmarks for this page (fallback)
  console.log('[LLM Bookmark] Fallback: loading bookmarks for this page:', getPageBookmarkKey());
  chrome.storage.local.get([getPageBookmarkKey()], (result) => {
    const bookmarks = result[getPageBookmarkKey()] || [];
    // DEBUG: Bookmarks loaded (fallback)
    console.log('[LLM Bookmark] Fallback: bookmarks loaded:', bookmarks);
    renderBookmarks(bookmarks);
  });
}

function loadSidebarQuestions() {
  showLoading();
  setTimeout(() => {
    const questions = scanQuestionsFromDOM();
    if (questions.length > 0) {
      renderQuestions(questions);
    } else {
      loadBookmarksFallback();
    }
  }, 500); // Give the page a moment to render
}

// Optionally, load all bookmarks across all pages (for future global view)
function loadAllBookmarks(cb) {
  chrome.storage.local.get(['llmBookmarkIndex'], (result) => {
    const index = result.llmBookmarkIndex || [];
    if (!index.length) return cb([]);
    const keys = index.map(pageId => `llmBookmarks_${pageId}`);
    chrome.storage.local.get(keys, (all) => {
      let allBookmarks = [];
      keys.forEach(key => {
        if (all[key]) allBookmarks = allBookmarks.concat(all[key]);
      });
      cb(allBookmarks);
    });
  });
}

let lastQuestionsFromDOM = null;

window.addEventListener('message', (event) => {
  if (event.data.type === 'questionsFromDOM') {
    lastQuestionsFromDOM = event.data.questions;
    renderQuestions(lastQuestionsFromDOM);
  } else if (event.data.type === 'newBookmark') {
    // If we already have questions from DOM, don't overwrite
    if (!lastQuestionsFromDOM || lastQuestionsFromDOM.length === 0) {
      loadSidebarQuestions();
    }
  }
});

// On sidebar load, show loading and request questions from parent
function requestQuestionsFromParent() {
  showLoading();
  parent.postMessage({ type: 'requestQuestionsFromDOM' }, '*');
}

requestQuestionsFromParent(); 
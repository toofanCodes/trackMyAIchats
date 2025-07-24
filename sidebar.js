// sidebar.js - Clean, focused version for iframe sidebar display only

// --- DOM Elements ---
const bookmarkList = document.getElementById('bookmark-list');
const starBtn = document.querySelector('.star-btn');

let currentQuestions = [];
let pinnedQuestions = JSON.parse(localStorage.getItem('llmPinnedQuestions') || '[]'); // [{selector, label, snippet, timestamp}]

function savePinned() {
  localStorage.setItem('llmPinnedQuestions', JSON.stringify(pinnedQuestions));
}

function isPinned(selector) {
  return pinnedQuestions.some(q => q.selector === selector);
}

function renderPinned() {
  const sidebarContent = document.getElementById('sidebar-content');
  let pinnedContainer = document.getElementById('pinned-list');
  if (!pinnedContainer) {
    pinnedContainer = document.createElement('ul');
    pinnedContainer.id = 'pinned-list';
    pinnedContainer.style.listStyle = 'none';
    pinnedContainer.style.padding = '0';
    pinnedContainer.style.margin = '0 0 10px 0';
    sidebarContent.insertBefore(pinnedContainer, bookmarkList);
  }
  pinnedContainer.innerHTML = '';
  if (pinnedQuestions.length === 0) {
    pinnedContainer.style.display = 'none';
    return;
  }
  pinnedContainer.style.display = '';
  pinnedQuestions.forEach((q, idx) => {
    const li = document.createElement('li');
    li.className = 'pinned-question';
    li.style.background = '#fff7b2';
    li.style.borderRadius = '6px';
    li.style.marginBottom = '4px';
    li.style.padding = '4px 8px';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.fontSize = '0.97em';
    li.style.gap = '8px';
    // Label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = q.label || q.snippet;
    labelSpan.style.flex = '1';
    labelSpan.title = q.snippet;
    labelSpan.style.cursor = 'pointer';
    labelSpan.onclick = () => {
      parent.postMessage({ type: 'scrollToBookmark', selector: q.selector }, '*');
    };
    li.appendChild(labelSpan);
    // Unstar button
    const unstarBtn = document.createElement('button');
    unstarBtn.innerHTML = '✖';
    unstarBtn.title = 'Unstar';
    unstarBtn.style.background = 'none';
    unstarBtn.style.border = 'none';
    unstarBtn.style.color = '#b71c1c';
    unstarBtn.style.fontSize = '1em';
    unstarBtn.style.cursor = 'pointer';
    unstarBtn.onclick = () => {
      pinnedQuestions = pinnedQuestions.filter(p => p.selector !== q.selector);
      savePinned();
      renderPinned();
      renderQuestions(currentQuestions);
    };
    li.appendChild(unstarBtn);
    pinnedContainer.appendChild(li);
  });
}

// --- Render Questions in the Sidebar ---
function renderQuestions(questions) {
  currentQuestions = questions;
  const searchBar = document.getElementById('search-bar');
  const filter = searchBar ? searchBar.value.trim().toLowerCase() : '';
  bookmarkList.innerHTML = '';
  let filtered = questions;
  if (filter) {
    filtered = questions.filter(q => q.snippet.toLowerCase().includes(filter));
  }
  if (!filtered || filtered.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No questions found on this page.';
    bookmarkList.appendChild(li);
    renderPinned();
    return;
  }
  filtered.forEach((q) => {
    const li = document.createElement('li');
    li.textContent = q.snippet;
    li.className = 'question-bookmark';
    li.title = q.timestamp;
    if (isPinned(q.selector)) {
      li.style.opacity = '0.5';
      li.style.pointerEvents = 'none';
    }
    li.onclick = () => {
      if (starBtn.classList.contains('active')) {
        if (pinnedQuestions.length >= 3) {
          alert('You can only star up to 3 questions.');
          return;
        }
        if (isPinned(q.selector)) return;
        let label = prompt('Enter a short label for this starred question (optional):', q.snippet.slice(0, 40));
        if (label !== null) label = label.trim();
        pinnedQuestions.push({
          selector: q.selector,
          label: label || '',
          snippet: q.snippet,
          timestamp: q.timestamp
        });
        savePinned();
        renderPinned();
        renderQuestions(currentQuestions);
      } else {
        parent.postMessage({ type: 'scrollToBookmark', selector: q.selector }, '*');
      }
    };
    bookmarkList.appendChild(li);
  });
  renderPinned();
}

// --- Listen for Messages from Parent (content script) ---
window.addEventListener('message', (event) => {
  if (event.data.type === 'questionsFromDOM') {
    renderQuestions(event.data.questions);
  }
});

// Listen for search input
const searchBar = document.getElementById('search-bar');
if (searchBar) {
  searchBar.addEventListener('input', () => {
    renderQuestions(currentQuestions);
  });
}

// Star mode toggle
if (starBtn) {
  starBtn.addEventListener('click', () => {
    starBtn.classList.toggle('active');
    if (starBtn.classList.contains('active')) {
      starBtn.title = 'Click a question to star it (max 3). Click again to exit star mode.';
    } else {
      starBtn.title = 'Enable star (pin) mode';
    }
  });
}

// --- Request Questions from Parent on Load ---
function requestQuestionsFromParent() {
  bookmarkList.innerHTML = '<li>Loading...</li>';
  parent.postMessage({ type: 'requestQuestionsFromDOM' }, '*');
}
requestQuestionsFromParent();

// --- Refresh and Close Button Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // Refresh button: request fresh questions from parent
  const refreshBtn = document.querySelector('.refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', requestQuestionsFromParent);
  }
  // Close button: ask parent to remove the sidebar iframe
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'closeLLMSidebar' }, '*');
      } else {
        // If not in an iframe, just hide the sidebar-root
        const sidebar = document.getElementById('sidebar-root');
        if (sidebar) sidebar.style.display = 'none';
      }
    });
  }
});
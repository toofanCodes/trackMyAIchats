// sidebar.js - Clean, focused version for iframe sidebar display only

// --- DOM Elements ---
const bookmarkList = document.getElementById('bookmark-list');

// --- Render Questions in the Sidebar ---
function renderQuestions(questions) {
  bookmarkList.innerHTML = '';
  if (!questions || questions.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No questions found on this page.';
    bookmarkList.appendChild(li);
    return;
  }
  questions.forEach((q) => {
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

// --- Listen for Messages from Parent (content script) ---
window.addEventListener('message', (event) => {
  if (event.data.type === 'questionsFromDOM') {
    renderQuestions(event.data.questions);
  }
});

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
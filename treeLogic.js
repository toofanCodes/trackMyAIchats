// treeLogic.js

// Tree data helpers (questions array should be passed in as needed)

function getChildren(questions, parentId) {
  return questions
    .filter(q => q.parent === parentId)
    .sort((a, b) => a.order - b.order);
}

function renumberSiblings(questions, parentId) {
  const siblings = getChildren(questions, parentId);
  siblings.forEach((q, i) => { q.order = i; });
}

function generateId(q) {
  return q.selector ? 'sel_' + btoa(q.selector).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) : 'snip_' + btoa(q.snippet).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

function wouldCreateCycle(questions, movingId, targetParentId) {
  let current = targetParentId;
  while (current) {
    if (current === movingId) return true;
    const parentQ = questions.find(q => q.id === current);
    if (!parentQ) break;
    current = parentQ.parent;
  }
  return false;
}

function mergePageQuestions(pageQuestions, storedQuestions) {
  const storedMap = new Map(storedQuestions.map(q => [(q.selector || q.text), q]));
  const merged = [];
  const seenKeys = new Set();
  pageQuestions.forEach((pq, i) => {
    const key = pq.selector || pq.snippet;
    seenKeys.add(key);
    if (storedMap.has(key)) {
      merged.push(storedMap.get(key));
      storedMap.delete(key);
    } else {
      merged.push({
        id: generateId(pq),
        text: pq.snippet,
        parent: null,
        order: merged.length,
        selector: pq.selector
      });
    }
  });
  for (const [key, q] of storedMap.entries()) {
    merged.push(q);
  }
  return merged;
}

// Tree rendering helpers (require DOM and questions array)
function renderTree(questions, bookmarkList, isEditMode, dragNodeId, onEdit, onDelete, onDrop) {
  bookmarkList.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'tree-root';
  renderTreeLevel(questions, null, ul, isEditMode, dragNodeId, onEdit, onDelete, onDrop);
  bookmarkList.appendChild(ul);
}

function renderTreeLevel(questions, parentId, ul, isEditMode, dragNodeId, onEdit, onDelete, onDrop, visited = new Set()) {
  if (parentId && visited.has(parentId)) return;
  if (parentId) visited.add(parentId);
  const children = getChildren(questions, parentId);
  children.forEach((node, idx) => {
    if (isEditMode) {
      ul.appendChild(createDropZone(questions, node, parentId, idx, dragNodeId, onDrop));
    }
    ul.appendChild(createTreeNode(questions, node, isEditMode, dragNodeId, onEdit, onDelete, onDrop));
    if (isEditMode && idx === children.length - 1) {
      ul.appendChild(createDropZone(questions, null, parentId, children.length, dragNodeId, onDrop));
    }
  });
  if (isEditMode && children.length === 0) {
    ul.appendChild(createDropZone(questions, null, parentId, 0, dragNodeId, onDrop));
  }
}

function createTreeNode(questions, node, isEditMode, dragNodeId, onEdit, onDelete, onDrop) {
  const li = document.createElement('li');
  li.className = 'tree-node';
  li.style.marginLeft = `${node.parent ? 20 : 0}px`;
  li.dataset.nodeId = node.id;

  // Drag handle
  if (isEditMode) {
    const dragHandle = document.createElement('span');
    dragHandle.textContent = '≡ ';
    dragHandle.style.cursor = 'grab';
    dragHandle.draggable = true;
    dragHandle.ondragstart = (e) => {
      if (onDrop) onDrop('dragstart', node.id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
    };
    dragHandle.ondragend = (e) => {
      if (onDrop) onDrop('dragend');
    };
    li.appendChild(dragHandle);
  }

  // Node text (with inline editing)
  let isEditing = false;
  const textSpan = document.createElement('span');
  textSpan.textContent = node.text;
  textSpan.className = 'tree-question-text';
  textSpan.tabIndex = 0;
  textSpan.style.cursor = isEditMode ? 'pointer' : 'default';
  if (isEditMode) {
    textSpan.onclick = () => { if (onEdit) onEdit(node); };
    textSpan.onkeydown = (e) => {
      if (e.key === 'Enter' && onEdit) onEdit(node);
    };
  } else {
    textSpan.onclick = null;
    textSpan.onkeydown = null;
  }
  li.appendChild(textSpan);

  // Delete button
  if (isEditMode) {
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete question';
    deleteBtn.className = 'tree-delete-btn';
    deleteBtn.style.marginLeft = '8px';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (onDelete) onDelete(node);
    };
    li.appendChild(deleteBtn);
  }

  // Children
  const children = getChildren(questions, node.id);
  if (children.length > 0) {
    const childUl = document.createElement('ul');
    childUl.className = 'tree-children';
    renderTreeLevel(questions, node.id, childUl, isEditMode, dragNodeId, onEdit, onDelete, onDrop);
    li.appendChild(childUl);
  } else if (isEditMode) {
    const childUl = document.createElement('ul');
    childUl.className = 'tree-children';
    childUl.appendChild(createDropZone(questions, null, node.id, 0, dragNodeId, onDrop));
    li.appendChild(childUl);
  }
  return li;
}

function createDropZone(questions, targetNode, parentId, idx, dragNodeId, onDrop) {
  const dropZone = document.createElement('div');
  dropZone.className = 'tree-drop-zone-root';
  dropZone.style.height = '16px';
  dropZone.style.margin = '4px 0';
  dropZone.style.background = '#ffe0b2';
  dropZone.style.border = '2px dashed #ff9800';
  dropZone.style.borderRadius = '5px';
  dropZone.style.textAlign = 'center';
  dropZone.style.fontSize = '0.9em';
  dropZone.style.color = '#ff9800';
  dropZone.style.fontWeight = 'bold';
  dropZone.textContent = 'Drop here';
  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.style.background = '#b3d4fc';
    dropZone.style.color = '#1976d2';
  };
  dropZone.ondragleave = (e) => {
    dropZone.style.background = '#ffe0b2';
    dropZone.style.color = '#ff9800';
  };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    if (onDrop) onDrop('drop', { targetNode, parentId, idx });
  };
  return dropZone;
}

window.treeLogic = {
  getChildren,
  renumberSiblings,
  mergePageQuestions,
  renderTree,
  renderTreeLevel,
  createTreeNode,
  createDropZone,
  generateId,
  wouldCreateCycle
}; 
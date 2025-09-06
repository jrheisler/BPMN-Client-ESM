(function(global){
  const treeStream = new Stream(null);
  let selectedId = null;

  function setSelectedId(id){
    selectedId = id;
    treeStream.set(treeStream.get());
  }

  function renderNode(node){
    const li = document.createElement('li');
    li.classList.add('diagram-tree-item', `diagram-tree-kind-${node.kind || 'node'}`);
    const label = node.name || node.id;
    if (node.owner){
      li.textContent = label + ' ';
      const ownerSpan = document.createElement('span');
      ownerSpan.className = 'diagram-tree-owner';
      ownerSpan.textContent = `(${node.owner})`;
      li.appendChild(ownerSpan);
    } else {
      li.textContent = label;
    }
    li.dataset.elementId = node.id;
    li.addEventListener('click', e => {
      e.stopPropagation();
      global.diagramTree.onSelect?.(node.id);
    });

    if (node.id === selectedId){
      li.classList.add('diagram-tree-selected');
    }

    if (node.children && node.children.length){
      const ul = document.createElement('ul');
      node.children.forEach(child => {
        const childEl = renderNode(child);
        if (childEl) ul.appendChild(childEl);
      });
      li.appendChild(ul);
    }

    return li;
  }

  function createTreeContainer(){
    const container = document.createElement('div');
    treeStream.subscribe(tree => {
      container.innerHTML = '';
      if (!tree) return;
      const ul = document.createElement('ul');
      ul.appendChild(renderNode(tree));
      container.appendChild(ul);
    });
    return container;
  }

  global.diagramTree = {
    treeStream,
    createTreeContainer,
    onSelect: () => {},
    setSelectedId,
    get selectedId(){ return selectedId; }
  };
})(window);

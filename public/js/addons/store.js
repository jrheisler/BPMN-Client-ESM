(function(global){
  const store = new Map();

  function setAddOns(nodeId, addOns){
    if(!nodeId) return;
    if(!Array.isArray(addOns)) addOns = [];
    store.set(nodeId, addOns);
  }

  function getAddOns(nodeId){
    return store.get(nodeId) || [];
  }

  function findNodesByType(type){
    const result = [];
    if(!type) return result;
    for(const [id, addOns] of store.entries()){
      if(addOns.some(a => a && a.type === type)){
        result.push(id);
      }
    }
    return result;
  }

  function findNodesBySubtype(type, subtype){
    const result = [];
    if(!type) return result;
    for(const [id, addOns] of store.entries()){
      if(addOns.some(a => a && a.type === type && a.subtype === subtype)){
        result.push(id);
      }
    }
    return result;
  }

  function getAllAddOns(){
    return Object.fromEntries(store);
  }

  function clear(){
    store.clear();
  }

  global.addOnStore = {
    setAddOns,
    getAddOns,
    findNodesByType,
    findNodesBySubtype,
    getAllAddOns,
    clear
  };
})(window);

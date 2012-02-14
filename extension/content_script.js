(function() {
  // gets all text nodes from the DOM tree starting from a given root
  var getAllTextNodes = function(root) {
    var walker = document.createTreeWalker(
        root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      var parentNodeName = walker.currentNode.parentNode.nodeName;
      if ((parentNodeName !== 'TEXTAREA') &&
          (parentNodeName !== 'INPUT') &&
          (parentNodeName !== 'SCRIPT')) {              
        textNodes.push(walker.currentNode);
      }
    }
    return textNodes;    
  };
  
  // applies all rules to the given text
  var applyRules = function(rules, item) {
    // apply rules to each item
    if (Array.isArray(item)) {
      for (var i = 0, l = item.length; i < l; i++) {
        var textNode = item[i];
        // call yourself recursively
        textNode.textContent = applyRules(rules, textNode.textContent);
      }      
    } else {    
      // apply all rules to item
      return rules.reduce(function(item, rule) {
        return item.replace(rule.regexp, rule.replacement);
      }, item);
    }
  };
  
  // apply initial processing and set up hooks
  var init = function(rules) {
    // initial processing
    applyRules(rules, getAllTextNodes(document.body));
    document.title = applyRules(rules, document.title);

    // event listener to react on dynamic DOM subtree modifications
    document.body.addEventListener('DOMSubtreeModified', function(e) {
      applyRules(rules, getAllTextNodes(e.target));
    }, false);

    // event listener to react on dynamic DOM node textual modifications
    document.body.addEventListener('DOMCharacterDataModified', function(e) {
      var parentNodeName = e.target.parentNode.nodeName;
      if ((parentNodeName !== 'TEXTAREA') &&
          (parentNodeName !== 'INPUT') &&
          (parentNodeName !== 'SCRIPT')) {        
        e.target.textContent = applyRules(rules, e.target.textContent);
      }
    }, false);

    // event listener to react on dynmaic title changes
    var currentTitle = document.title;
    // need the element node, not document.title for the event listener to work
    var title = document.getElementsByTagName('title')[0];
    title.addEventListener('DOMSubtreeModified', function(e) {
      if (document.title !== currentTitle)
        document.title = currentTitle = applyRules(rules, document.title);
    }, false);
  };
  
  // retrieve the rules, parse them, and init
  chrome.extension.sendRequest("rules", function(rules) {
    // parse rules
    rules.forEach(function(rule) {
      if (rule.enabled) {
        // instantiate regexp
        try {
          rule.regexp = new RegExp(rule.regexp, "gi");
          // evaluate the replacement function (if it is a function)
          if (rule.replacement.match(/^\s*function/)) {
            try {
              rule.replacement = eval('(' + rule.replacement + ')');
            } catch(e) {
              alert(chrome.i18n.getMessage('invalidReplacement'));
            }
          }
        } catch(e) {
          alert(chrome.i18n.getMessage('invalidRegExp'));
        }    
      }
    });
    init(rules);
  });
})();

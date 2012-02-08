(function() {
  // gets all text nodes from the DOM tree starting from a given root
  var getAllTextNodes = function(root) {
    return document.evaluate(
        './/text()[normalize-space(.) != ""]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);    
  };
  
  // applies all rules to the given text or XPathResult
  var applyRules = function(rules, item) {
    // apply rules to each item of the XPathResult
    if (item instanceof XPathResult) {
      for (var i = 0, l = item.snapshotLength; i < l; i++) {
        var textNode = item.snapshotItem(i);
        // call yourself recursively
        textNode.data = applyRules(rules, textNode.data);
      }      
    } else {    
      // apply all rules to item
      return Object.keys(rules).reduce(function(item, ruleName) {
        var rule = rules[ruleName];
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
      e.target.data = applyRules(rules, e.target.data);
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
  chrome.extension.sendRequest("rules", function (rules) {
    // parse rules
    for (var ruleName in rules) {
      var rule = rules[ruleName];
      if(rule.enabled) {
        // instantiate regexp
        rule.regexp = new RegExp(rule.regexp, "gi");
        // evaluate the replacement function (if it is a function)
        if (rule.replacement.match(/^\s*function/))
          rule.replacement = eval('(' + rule.replacement + ')');
      }
    }
    init(rules);
  });
})();
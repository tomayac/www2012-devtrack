(function() {
  var BLACKLIST = ['SCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'];
  // gets all text nodes from the DOM tree starting from a given root
  var getAllTextNodes = function(root) {
    var walker = document.createTreeWalker(
        root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      var parentNodeName = walker.currentNode.parentNode.nodeName;
      if (BLACKLIST.indexOf(parentNodeName) === -1) {
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
      if (BLACKLIST.indexOf(parentNodeName) === -1) {
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

  // Amazon
  var anchors = document.getElementsByTagName('a');
  var amazonAnchors = [];
  var amazonRegExp = /^https?\:\/\/www\.amazon\.(com|ca|co\.uk|de|fr|jp)\/.*/i;
  var associateRegExp1 = /.*?tag=(\w+\-?\w*?).*/i;
  var associateRegExp2 = /.*?\/ASIN\/\w+\/(\w+)\/?(ref=nosim\/?)?$/i;
  var associateRegExp3 = /.*?\/ref=nosim\/(\w+)$/i;
  var asinRegExp1 = /.*?\/ASIN\/(\w+)\/.*/i;
  var asinRegExp2 = /.*?\/gp\/product\/(\w+)[\/|\?]?.*/i;
  var asinRegExp3 = /.*?\/dp\/(product-description\/)?(\w+)(\/|\?)?.*/i;
  var searchRegExp1 = /\/gp\/search/;
  var searchRegExp2= /\/s\?/;
  var searchRegExp3 = /\/search\?/;
  var host = document.location.host;
  if ((host.indexOf('bing') === -1) &&
      (host.indexOf('yahoo') === -1) &&
      (host.indexOf('ask') === -1) &&
      (host.indexOf('google') === -1)) {
    for (var i = 0, anchor; anchor = anchors[i]; i++) {
      var href = anchor.href;
      if (amazonRegExp.test(href)) {
        var marketPlace = href.replace(amazonRegExp, '$1');
        var associate = '';
        if (associateRegExp1.test(href)) {
          associate = href.replace(associateRegExp1, '$1');
        } else if (associateRegExp2.test(href)) {
          associate = href.replace(associateRegExp2, '$1');
        } else if (associateRegExp3.test(href)) {
          associate = href.replace(associateRegExp3, '$1');
        }
        var asin = '';
        if (asinRegExp1.test(href)) {
          asin = href.replace(asinRegExp1, '$1');
        } else if (asinRegExp2.test(href)) {
          asin = href.replace(asinRegExp2, '$1');
        } else if (asinRegExp3.test(href)) {
          asin = href.replace(asinRegExp3, '$2');
        }
        if (asin && !associate /* don't be evil */) {
          anchor.href = (new AmazonAssociate(marketPlace, 'blogccasion')).getSingleDetailPageUrl(asin);
        } else if (!asin && !associate  /* don't be evil */) {
          if ((searchRegExp1.test(href)) ||
              (searchRegExp2.test(href)) ||
              (searchRegExp3.test(href))) {
            anchor.href += '&tag=' + (new AmazonAssociate(marketPlace, 'blogccasion')).getTag();
          } else if (!associate /* don't be evil */) {
            if (anchor.href.indexOf('?') === -1) {
              anchor.href += '?&tag=' + (new AmazonAssociate(marketPlace, 'blogccasion')).getTag();
            } else {
              anchor.href += '&tag=' + (new AmazonAssociate(marketPlace, 'blogccasion')).getTag();
            }
          }
        }
      }
    }
  }
})();

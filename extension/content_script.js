(function() { 
  
  // rules store 
  var rules = {
    // replace three dots by an ellipsis
    ellipsis: {
      regexp: new RegExp('\\.\\.\\.', 'g'),
      replacement: '\u2026'
    },
    
    // avoid orphan 'a's
    nonBreakingSpace: {
      regexp: new RegExp('(\\ba)\\s(\\w+\\b)', 'g'),
      replacement: '$1\u00A0$2'
    },
    
    // don't break :-) :-( :-D :-| :-P :-p etc.
    emoticon: {
      regexp: new RegExp('([\\:|;])(\\-)([\\)|\\(|\\|D||p|P])', 'g'),
      replacement: '$1\uFEFF$2\uFEFF$3'
    },
    
    // turn "[adjective]-ass [noun]" into "[adjective] ass-[noun]"
    adjectiveAssNoun: {
      regexp: /(\w+)-(ass)(\s+)(\w+)/gi,
      replacement: function (original, adjective, ass, space, noun) {
        // is the first word really an adjective and the second really a noun?
        var taggedWords = tagger.tag([adjective.toLowerCase(), noun]);
        if ((taggedWords[0][1].match(/^JJ$/)) &&
            (taggedWords[1][1].match(/^NN|^VBG$/))) {
          // then replace from "smart-ass car" to "smart ass-car"
          return adjective + space + ass + '-' + noun;
        } else {
          // otherwise, don't change anything
          return original;
        }
      }
    }
  };
	
  // gets all text nodes from the DOM tree starting from a given root
  var getAllTextNodes = function getAllTextNodes(root) {
    return document.evaluate(
        './/text()[normalize-space(.) != ""]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);    
  };
  
  var tagger = new POSTagger();
  
  // applies all rules to the given text or XPathResult
  var applyRules = function applyRules(item) {
    // apply rules to each item of the XPathResult
    if (item instanceof XPathResult) {
      for (var i = 0, l = item.snapshotLength; i < l; i++) {
        var textNode = item.snapshotItem(i);
        textNode.data = applyRules(textNode.data);
      }      
    } else {    
      // apply all rules to item
      return Object.keys(rules).reduce(function(item, ruleName) {
        var rule = rules[ruleName];
        return item.replace(rule.regexp, rule.replacement);
      }, item);
    }
  };
	
  // initial processing
  applyRules(getAllTextNodes(document.body));
  document.title = applyRules(document.title);
  
	// event listener to react on dynamic DOM node insertions
	document.body.addEventListener('DOMNodeInserted', function(e) {
    applyRules(getAllTextNodes(e.target));
	}, false);

  // event listener to react on dynamic DOM node modifications
	document.body.addEventListener('DOMCharacterDataModified', function(e) {
    e.target.data = applyRules(e.target.data);
	}, false);	
	
	// event listener to react on dynmaic title changes
  var currentTitle = document.title;
  // need the element node, not document.title for the event listener to work
  var title = document.getElementsByTagName('title')[0];  
  title.addEventListener('DOMSubtreeModified', function(e) {
    if (document.title !== currentTitle) {
      currentTitle = applyRules(document.title);        
      document.title = currentTitle;
    }
  }, false);	
	
})();
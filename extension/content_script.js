(function() { 
  
  // rules store 
  var rules = {
    ellipsis: {
      regexp: new RegExp('\\.\\.\\.', 'g'),
      replacement: '\u2026'
    },
    nonBreakingSpace: {
      regexp: new RegExp('(\\ba)\\s(\\w+\\b)', 'g'),
      replacement: '$1\u00A0$2'
    },
    emoticon: { // :-) :-( :-D :-| :-P :-p etc.
      regexp: new RegExp('(\\:)(\\-)([\\)|\\(|\\|D||p|P])', 'g'),
      replacement: '$1\uFEFF$2\uFEFF$3'
    },
  };
	
  // gets all text nodes from the DOM tree starting from a given root
  function getAllTextNodes(root) {
    return document.evaluate(
        './/text()[normalize-space(.) != ""]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);    
  };
  
  var tagger = new POSTagger();
  
  // applies all rules to the given text or XPathResult
  function applyRules(item) {
    // apply rules to each item of the XPathResult
    if (item instanceof XPathResult) {
      for (var i = 0, l = item.snapshotLength; i < l; i++) {
        var textNode = item.snapshotItem(i);
        textNode.data = applyRules(textNode.data);
      }
      return item;
    }
    
    // replace "[adjective]-ass [noun]" to "[adjective] ass-[noun]" where applicable
    item = item.replace(/(\w+)-(ass)(\s+)(\w+)/gi, function (original, adjective, ass, space, noun) {
      // is the first word really an adjective and the second really a noun?
      var taggedWords = tagger.tag([adjective.toLowerCase(), noun]);
      if (taggedWords[0][1].match(/^JJ$/) && taggedWords[1][1].match(/^NN|^VBG$/))
        // then perform the replacement from "smart-ass car" to "smart ass-car"
        var replacement = adjective + space + ass + '-' + noun;
      // log and return result
      console.log('Replacing', original, 'by', replacement);
      return replacement || original;
    });
    
    Object.keys(rules).forEach(function(ruleName) {
      var rule = rules[ruleName];
      if (rule.regexp.test(item)) {
        item = item.replace(rule.regexp, rule.replacement);
      }      
    });    
    return item;
  };
	
  // initial processing
  applyRules(getAllTextNodes(document.body));
  document.title = applyRules(document.title);
  
	// event listener to react on dynamic node insertions
	document.body.addEventListener('DOMNodeInserted', function(e) {
    applyRules(getAllTextNodes(e.target));
	}, false);
	
})();
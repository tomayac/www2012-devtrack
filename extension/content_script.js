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
  var getAllTextNodes = function getAllTextNodes(root) {
    return document.evaluate(
        './/text()[normalize-space(.) != ""]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);    
  };
  
  // applies all rules to the given text node
  var applyRules = function applyRules(textNode) {
    var smartAss = /(.*?)((\b\w+)\-ass\s(\w+\b))(.*?)/gi;
    if (smartAss.test(textNode.data)) {
      var before = textNode.data.replace(smartAss, '$1');
      var after = textNode.data.replace(smartAss, '$5');
      var middle = textNode.data.replace(smartAss, '$2');
      middle = middle.toLowerCase().replace(/\-ass\s/, ' ass ');
      console.log('all: ' + textNode.data);      
      console.log('before: ' + before);
      console.log('middle: ' + middle);
      console.log('after: ' + after);
      var words = new Lexer().lex(middle);
      var taggedWords = new POSTagger().tag(words);      
      if ((taggedWords[0][1] === 'JJ') &&
          (taggedWords[2][1].indexOf('NN') === 0)) {
        middle = middle.replace(/(\w+)\sass\s(\w+)/, '$1 ass-$2');      
        textNode.data = before + middle + after;
      }
    }
    Object.keys(rules).forEach(function(ruleName) {
      var rule = rules[ruleName];
      if (rule.regexp.test(textNode.data)) {
        textNode.data = textNode.data.replace(rule.regexp, rule.replacement);
      }      
    });    
  };
	
  // initial processing
  var textNodes = getAllTextNodes(document.body);
  for (var i = 0, l = textNodes.snapshotLength; i < l; i++) {      
    applyRules(textNodes.snapshotItem(i));
  }   
  
	// event listener to react on dynamic node insertions
	document.body.addEventListener('DOMNodeInserted', function(e) {
    var textNodes = getAllTextNodes(e.target);
    for (var i = 0, l = textNodes.snapshotLength; i < l; i++) {       
      applyRules(textNodes.snapshotItem(i));
    }
	}, false);
	
})();
(function() { 
  
  // The callback for the rules JSON-P call to Google Docs. 
  var script = document.createElement('script');
  script.type = 'application/javascript';
  document.body.appendChild(script);
  // Microsyntax for functions in the Google Spreadsheet:
  // - commas replaced by §
  // - line breaks represented as \n
  // - apostrophes ' escaped as \'
  // - quotes " escaped as ""
  //
  // Need to go the ugly script.textContent way to be accessable from external.
  //
  // The alternative would be to ask for higher permissions in manifest.json in
  // order to access docs.google.com (probably a bad thing).
  script.textContent =
      'var __callback_xkcd37 = function(/*opt args*/) {\n' +
      '  var myRules = {};\n' +
      '  var args = Array.prototype.slice.call(arguments);\n' +
      '  for (var i = 1, l = args.length; i < l; i++) {\n' +
      '    var line = args[i];\n' +
      '    var parts = line.split(/,/).slice(1, -1);\n' +
      '    var ruleName = parts[0];\n' +
      '    var regexp = parts[1];\n' +
      '    var flags = parts[2] ? parts[2] : \'\';\n' +
      '    var replacement = parts[3].replace(/^"/, "").replace(/"$/, "");\n' +
      '    replacement = replacement.replace(/§/g, ",");\n' +
      '    replacement = replacement.indexOf(\'function\') === 0 ?\n' +
      '       eval(\'(\' + replacement + \')\') : replacement;\n' +
      '    myRules[ruleName] = {\n' +
      '      regexp: new RegExp(regexp, flags),\n' +
      '      replacement: replacement\n' +
      '    };\n' +
      '  }\n' +
      '};';

  // JSON-P at its worst
  var ajax = function(url) {
    var script = document.createElement('script');
    script.type = 'application/javascript';
    document.body.appendChild(script);
    script.src = url;    
  };
  var url = 'https://docs.google.com/spreadsheet/ccc?key=0AtLlSNwL2H8YdGo5NjZRTHVGdV9NemF5SXBfaEI1VXc&output=csv';
  ajax(url);

  // rules store 
  var rules = {
    // replace three dots by an ellipsis
    ellipsis: {
      regexp: /\.\.\./g,
      replacement: '\u2026'
    },
    
    // avoid orphan 'a's
    nonBreakingSpace: {
      regexp: /(\ba)\s(\w+\b)/g,
      replacement: '$1\u00A0$2'
    },
    
    // don't break :-) :-( :-D :-| :-P :-p etc.
    emoticon: {
      regexp: /([\:|;])(\-)([\)|\(|\|D||p|P])/g,
      replacement: '$1\uFEFF$2\uFEFF$3'
    },
    
    // "who to follow" to "whom to follow"
    whomToFollow: {
      regexp: /\b(who)(\s+to\s+follow)\b/gi,
      replacement: '$1m$2'
    },
    
    // correct ambidextrous double quotes to curved quotes
    curvedQuotes: {
      regexp: /"([^"]+)"/g,
      replacement: '\u201C$1\u201D'
    },
    
    // numeric ranges should be separated by a figure dash instead of a hyphen
    numericRange: {
      regexp: /(\d+)-(\d+)/g,
      replacement: '$1\u2012$2'
    },
    
    // turn "[adjective]-ass [noun]" into "[adjective] ass-[noun]"
    adjectiveAssNoun: {
      regexp: /(\w+)-(ass)(\s+)(\w+)/gi,
      replacement: function(original, adjective, ass, space, noun) {
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
  var getAllTextNodes = function(root) {
    return document.evaluate(
        './/text()[normalize-space(.) != ""]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);    
  };
  
  var tagger = new POSTagger();
  
  // applies all rules to the given text or XPathResult
  var applyRules = function(item) {
    // apply rules to each item of the XPathResult
    if (item instanceof XPathResult) {
      for (var i = 0, l = item.snapshotLength; i < l; i++) {
        var textNode = item.snapshotItem(i);
        // call yourself recursively
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
  
	// event listener to react on dynamic DOM subtree modifications
	document.body.addEventListener('DOMSubtreeModified', function(e) {
    applyRules(getAllTextNodes(e.target));
	}, false);

  // event listener to react on dynamic DOM node textual modifications
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
jQuery(function($) {
  // obtain the rules
  var rules = JSON.parse(localStorage.rules);

  // get the container for the rules
  var $rules = $('#rules');

  // create and activate the elements for editing the rules
  function displayRules() {
    // add all rules to the container
    var count = 0;
    $rules.empty().append(rules.map(function(rule) {
       var index = count++;
      
      // check if the regexp is valid
      var error = false;
      try {
        new RegExp(rule.regexp, "gi");                      
      } catch(e) {
        alert(chrome.i18n.getMessage('invalidRegExp'));
        error = true;
      }
      // check if the replacement function is valid
      if (rule.replacement.match(/^\s*function/)) {
        try {
          eval('(' + rule.replacement + ')');
        } catch(e) {
          alert(chrome.i18n.getMessage('invalidReplacement'));
          error = true;
        }
      }
      
      // create rule widget
      var $name = $('<span>').addClass('name').append($('<span>').
              text(rule.name)),
          $regexp = $('<span>').addClass('regexp').append(
              (error ? $('<span>').addClass('error') : $('<span>'))
              .text(rule.regexp)),
          $replacement = $('<span>').addClass('replacement')
              .append($('<span>').text(rule.replacement)),
          $remove = $('<span>').addClass('remove')
              .append($('<button>')
              .text(chrome.i18n.getMessage('removeRule'))),
          $rule = $('<div>').addClass('rule ui-widget-content')
                            .addClass(rule.enabled ? 'enabled' : 'disabled')
                            .data('index', index)
                            .append($name, $regexp, $replacement, $remove);
  
      // function to stop the current edit;
      var stopEdit;
      // editor control
      var $input = $('<textarea>');
  
      // toggle enabled on click
      $rule.click(save(function() {
        if (!stopEdit) {
          rule.enabled = !rule.enabled;
          $rule.toggleClass('enabled disabled');
        }
      }));
  
      // editors for name, regexp, and replacement
      $.each(
        {
          name: $name,
          regexp: $regexp,
          replacement: $replacement
        },
        function(property, $control) {
          $control.dblclick(function() {
            if (!stopEdit) {
              // initialize the textarea control
              $input.val(rule[property]);
              $control.children().replaceWith($input);
      
              // set the function to stop the edit
              stopEdit = save(function() {
                rule[property] = $input.val();
                stopEdit = null;
              }, true);
      
              // focus the input control and stop the edit on blur
              $input.focus();
              
              var sanityCheck = function() {
                if (property === 'regexp') {
                  try {
                    new RegExp($input.val(), "gi");                      
                  } catch(e) {
                    alert(chrome.i18n.getMessage('invalidRegExp'));
                    return;
                  }
                } else if (property === 'replacement') {
                  if ($input.val().match(/^\s*function/)) {
                    try {
                      eval('(' + $input.val() + ')');
                    } catch(e) {
                      alert(chrome.i18n.getMessage('invalidReplacement'));
                      return;
                    }
                  }
                }
                stopEdit();                    
              }
              
              $input.off('blur').blur(sanityCheck);
            }
          });
      });
  
      // removing
      $remove.click(save(function(event) {
        var message =
            chrome.i18n.getMessage('confirmRuleRemoval', rule.name);
        if (confirm(message)) {
          rules.splice(index, 1);
        }
        event.stopPropagation();
      }, true));
  
      return $rule[0];
    }));
  }
  displayRules();

  // make the rules container sortable
  $rules.sortable({
    stop: save(function() {
      var oldRules = new Array(rules.length);
      for (var i = 0, l = rules.length; i < l; i++) {
        oldRules[i] = rules[i];
      }      
      $rules.children().each(function(index) {
        rules[index] = oldRules[$.data(this, 'index')];
      });
    }, true)
  });
  $rules.disableSelection();

  // activate reload link
  $("#add").click(save(function() {
    rules.unshift({
      name: "new rule",
      regexp: "regular expression",
      replacement: "replacement"
    });
  }, true));

  // activate reload link
  $("#reset").click(function() {
    if (confirm(chrome.i18n.getMessage('restoreDefaultRules'))) {
      chrome.extension.sendRequest("reset", function(defaultRules) {
        rules = defaultRules;
        displayRules();
      });
    }
  });

  // returns a function that executes func and then saves rule modifications
  function save(func, reload) {
    return function() {
      func.apply(this, arguments);
      localStorage.rules = JSON.stringify(rules);
      if (reload) {
        displayRules();
      }
    };
  }
});
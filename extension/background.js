// reset to the default rules
function reset(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", chrome.extension.getURL("default_rules.json"), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      localStorage.rules = xhr.responseText;
      callback && callback(JSON.parse(xhr.responseText));
    }
  }
  xhr.send();
}

// load the default rules if the storage is empty
if (!localStorage.rules) {
  reset();
}

// listen for requests
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
  // send the rules
  if (request === "rules") {
    sendResponse(JSON.parse(localStorage.rules));
  // reset the rules
  } else if (request === "reset") {
    reset(sendResponse);
  }
});
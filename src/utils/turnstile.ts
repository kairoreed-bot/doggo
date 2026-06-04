export const TURNSTILE_LOGIN_SITE_KEY = "0x4AAAAAAAMttfE31t8DPXZ8";

export const TURNSTILE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; width: 100%; background: transparent; }
body {
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 20px;
}
#turnstile-widget {
  min-height: 65px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#error {
  display: none;
  margin-top: 16px;
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
}
</style>
<script>
function postMsg(data) {
  window.ReactNativeWebView.postMessage(JSON.stringify(data));
}

function showError(msg) {
  var el = document.getElementById('error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideError() {
  var el = document.getElementById('error');
  if (el) el.style.display = 'none';
}

var currentWidgetId = null;

window.renderTurnstile = function(siteKey) {
  if (typeof turnstile === 'undefined') {
    postMsg({ type: 'TURNSTILE_ERROR', error: 'Turnstile API not loaded yet' });
    return;
  }

  if (currentWidgetId !== null) {
    try { turnstile.remove(currentWidgetId); } catch(e) {}
    currentWidgetId = null;
  }

  hideError();
  var widgetEl = document.getElementById('turnstile-widget');
  if (widgetEl) widgetEl.innerHTML = '';

  try {
    currentWidgetId = turnstile.render('#turnstile-widget', {
      sitekey: siteKey,
      action: 'cloudflare-waf',
      appearance: 'always',
      execution: 'render',
      theme: 'auto',
      size: 'normal',
      'refresh-expired': 'auto',
      callback: function(token) {
        postMsg({ type: 'TURNSTILE_SUCCESS', token: token });
      },
      'error-callback': function(errorCode) {
        var msg = 'Verification failed. ';
        if (errorCode === 'network-error') msg += 'Please check your connection.';
        else if (errorCode === 'challenge-error') msg += 'Please try again.';
        else msg += 'Please try again.';
        showError(msg);
        postMsg({ type: 'TURNSTILE_ERROR', error: errorCode });
      },
      'expired-callback': function() {
        if (currentWidgetId !== null) {
          try { turnstile.reset(currentWidgetId); } catch(e) {}
        }
        postMsg({ type: 'TURNSTILE_EXPIRED' });
      },
      'timeout-callback': function() {
        showError('Verification timed out. Retrying...');
        setTimeout(function() {
          hideError();
          if (currentWidgetId !== null) {
            try { turnstile.reset(currentWidgetId); } catch(e) {}
          }
        }, 2000);
      }
    });

    if (!currentWidgetId) {
      showError('Failed to render verification widget');
      postMsg({ type: 'TURNSTILE_ERROR', error: 'render-failed' });
    }
  } catch(e) {
    showError('Failed to initialize verification');
    postMsg({ type: 'TURNSTILE_ERROR', error: 'render-failed' });
  }
};

window.resetTurnstile = function() {
  if (currentWidgetId !== null && typeof turnstile !== 'undefined') {
    try { turnstile.reset(currentWidgetId); } catch(e) {}
  }
  hideError();
};

window.turnstileLoaded = function() {
  postMsg({ type: 'READY' });
};
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=turnstileLoaded" defer></script>
</head>
<body>
<div id="container">
  <div id="turnstile-widget"></div>
  <div id="error"></div>
</div>
</body>
</html>`;

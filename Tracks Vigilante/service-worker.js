(function () {
  'use strict';
  let pause_status = null;
  let active_tab_id = null;
  let last_screenshot = null;
  let last_image = null;

  chrome.tabs.onActivated.addListener( (activeInfo) => {
    active_tab_id = activeInfo.tabId;
    sendMessageToVigilante( active_tab_id, "Render");
  });

  chrome.tabs.query({active: true}, ( tabs ) => {
    active_tab_id = tabs[0].id;
  })

  chrome.webRequest.onCompleted.addListener(onCompletedListener,
    { urls: ["*://pixel.wp.com/*",] }, ['responseHeaders']);

    chrome.webRequest.onBeforeRequest.addListener((details) => console.log(details),
    { urls: ["*://pixel.wp.com/*",] }, []);


  function hasBeenReplaced( url ) {
    return url.includes( "https://pixel.wp.com" ) || url.includes( "http://pixel.wp.com" );
  }

  /**
   * 
   * @param { Event } details for the completed request.
   */
  function onCompletedListener( details ) {
    if ( pause_status ) {
      return;
    }
    let url = details.url.replace( "https://pixel.wp.com/t.gif?", "" ).replace( "http://pixel.wp.com/t.gif?", "" );
    let type = '';

    //TODO A bit ugly filter, to be improved for better readability
    if ( hasBeenReplaced( url ) ) {
      url = details.url.replace( "https://pixel.wp.com/g.gif?", "" ).replace( "http://pixel.wp.com/g.gif?", "" );
      if ( hasBeenReplaced( url ) ) {
        url = details.url.replace( "https://pixel.wp.com/boom.gif?", "" ).replace( "http://pixel.wp.com/boom.gif?", "" );
        if ( hasBeenReplaced( url )) {
          console.log(`Unknown pixel ${url}`)
          return;
        } else {
          type = "grafana";
        }
      } else {
        type = "external";
      }
    } else {
      type = "tracks-event";
    }
    const urlSearchParams = new URLSearchParams( url );
    const params = Object.fromEntries(urlSearchParams.entries());

    chrome.storage.local.get( 'url_array', ( result ) => storeData( result, params, type ) );

  }

  /**
   * Sends the received data to the popup html (standalone or not)
   * 
   * @param { { key, value, type, time }[] } params Data to send
   */
  function sendMessageToVigilante( params, message = "Tracks" ) {
    chrome.runtime.sendMessage({
      msg: message,
      data: {
        queryParams: params
      }
    });
  }

  /**
   * 
   * @param { {} } result Old data storage
   * @param { { key, value, type, time }[] } params New data storage
   * @param string type (tracks-event, external, grafana)
   */
  function storeData( result, params, type ) {
    let callbackStoreData = ( image = last_image ) => {
      let currentDate = new Date();
      let stringDate = currentDate.toLocaleTimeString();
      if (!result?.url_array) {
        result.url_array = [{ key: params._en, values: params, time: stringDate, type: type, tabId: active_tab_id, screenshot: image }];
      } else {
        result.url_array.push({ key: params._en, values: params, time: stringDate, type: type, tabId: active_tab_id, screenshot: image })
      }
      chrome.storage.local.set({ url_array: result.url_array }, () => sendMessageToVigilante(params));
      updateBadge(result.url_array);
    }
    let timestamp = + new Date();
    if ( ! last_screenshot || ( ( timestamp - last_screenshot > 200 ) ) ) {
      last_screenshot = timestamp;
      chrome.tabs.captureVisibleTab(null,{ quality: 85 },function( dataUri ) {
        callbackStoreData( dataUri );
      });
    } else {
      callbackStoreData();
    }
    
  }

  /**
   * Prints the small number in the Tracks Vigilante icon
   * 
   * @param { {} } result our data array 
   */
  function updateBadge( result ) {
    chrome.action.setBadgeText({ text: result.length.toString() });
  }

  //Following code is to "revive" plugin if it has dead because of inactivity
  let lifeline;

  keepAlive();

  chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'keepAlive') {
      lifeline = port;
      setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
      port.onDisconnect.addListener(keepAliveForced);
    }
  });

  function keepAliveForced() {
    lifeline?.disconnect();
    lifeline = null;
    keepAlive();
  }

  async function keepAlive() {
    if (lifeline) return;
    for (const tab of await chrome.tabs.query({ url: '*://*/*' })) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => chrome.runtime.connect({ name: 'keepAlive' }),
          // `function` will become `func` in Chrome 93+
        });
        chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
        return;
      } catch (e) { }
    }
    chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
  }

  async function retryOnTabUpdate(tabId, info, tab) {
    if (info.url && /^(file|https?):/.test(info.url)) {
      keepAlive();
    }
  }

  function getword( event, paused ) {
    if (event.menuItemId !== "pause-resume") {
      return;
    }
    paused = !paused;
    pause_status = paused;
    chrome.storage.local.set({ vigilante_status: paused }, () => updateContextMenu( paused ));
  }

  chrome.storage.local.get( 'vigilante_status', ( result ) => { pause_status = result; createContextMenu( result ); } );

  function createContextMenu( paused ) {
    chrome.storage.local.get( 'url_array', ( result ) => {
      chrome.action.setBadgeText({ text: !!paused ? "OFF" : result.url_array.length.toString() });
      chrome.contextMenus.create(
      {
        title: !!paused ? "Start watching ٩(๏_๏)۶" : "Stop watching (っ▀¯▀)つ", 
        contexts:["all"], 
        id: "pause-resume",
        type: "normal"
      });
      chrome.contextMenus.onClicked.addListener( ( event )  => getword ( event, paused ));
    } );
  }

  function updateContextMenu( paused ) {
    chrome.storage.local.get( 'url_array', ( result ) => {
      chrome.action.setBadgeText({ text: !!paused ? "OFF" : result.url_array.length.toString() });
      chrome.contextMenus.update("pause-resume", {
        title: !!paused ? "Start watching ٩(๏_๏)۶" : "Stop watching (っ▀¯▀)つ", 
        contexts:["all"], 
        type: "normal"
      });
      chrome.contextMenus.onClicked.addListener( ( event )  => getword ( event, paused ));
    } );
  }


})();
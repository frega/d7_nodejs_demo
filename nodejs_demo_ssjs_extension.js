/**
 * Example server extension for nodejs
 *
 */
// local configuration
localOptions = {};
// do we want the extension to be active
localOptions.extensionActive = true;
// demonstrate a direct broadcast
localOptions.extensionDirectBroadcast = false;
// demonstrate a roundtrip to drupal
localOptions.extensionRoundtrip = false;
// interval in ms
localOptions.extensionInterval = 50;


exports.setup = function (config) {
  var tokenChannels, publishMessageToClient, stockValues;
  var c = 0, notified = false, notifiedExtensionDirectBroadcast = false;

  //  for convenience, copied from server.js because there's no api for this yet ...
  var messageToContentChannel = function(message) {
    if (!message.hasOwnProperty('channel')) {
      console.log('publishMessageToContentChannel: An invalid message object was provided.');
      return;
    }
    if (!tokenChannels.hasOwnProperty(message.channel)) {
      // console.log('publishMessageToContentChannel: The channel "' + message.channel + '" doesn\'t exist.');
      return;
    }

    for (var socketId in tokenChannels[message.channel].sockets) {
      if (! publishMessageToClient(socketId, message) ) {
        console.log('Remove stale socket.io - socketId' , socketId);
        delete tokenChannels[message.channel].sockets[socketId];
      }
    }
    return true;
  };


  // brr, accessing the server.js scope ...
  tokenChannels = config.tokenChannels;
  publishMessageToClient = config.publishMessageToClient;
  sendMessageToBackend = config.sendMessageToBackend;


  console.log('Setting up nodejs_demo_ssjs_extension');
  setInterval( function() {
    if (!localOptions.extensionActive) {
      return false;
    }
    // well, a nice sinus ...
    c = c + ( Math.PI / 100 );
    var now = new Date();
    // some key
    var ts = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
    // 0-1000 
    var value = Math.abs( Math.floor( Math.sin( c ) * 1000 ) );
    var exciting_value = Math.abs( Math.floor( Math.cos( c ) * 1000 ) );

    // send the message to the given content channel
    messageToContentChannel({
      'channel': 'nodejs_demo_broadcast',
      'callback': 'nodejsDemoExample',
      'data': {'ts': ts, 'value': value, 'exciting_value': exciting_value}
    });

    // nodejs direct broadcasting
    if ( localOptions.extensionDirectBroadcast ) {
      if (value < 100 && !notifiedExtensionDirectBroadcast ) {
        notifiedExtensionDirectBroadcast = true;
        messageToContentChannel({
          'channel': 'watchdog_dblog',
          'callback': 'nodejsNotify',
          'data': {'subject': 'CHEAP', 'body': 'BUYBUYBUY!'}
        });
      }
    }
    if ( localOptions.extensionRoundtrip ) {
      // this is a message to to the backend
      if (value < 100 && !notified ) {
        notified = true;
        sendMessageToBackend({
          'messageType': 'nodejs_rules_trigger_component',
          'component': 'rules_nodejs_demo_cheap',
          // we just pass arguments to the component
          'arguments': ['EXCITING', ts + ': EXCITING - ' + value + 'EUR' ]
        }, function(response) {
          // we could do some handling ...
          console.log('nodejs_demo - completed sendMessageToBackend');
        });
      }
    }
    
    if ( value > 100 ) {
      notifiedExtensionDirectBroadcast = notified = false;
    }
  }, localOptions.extensionInterval );
};

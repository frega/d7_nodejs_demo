/**
 * Example server extension for nodejs integration module
 */
// local configuration
exports.extensionOptions = extensionOptions = {
  // do we want the extension to be active
  enabled: true,
  // demonstrate a direct broadcast
  directBroadcast: false,
  // demonstrate a roundtrip to drupal
  roundtrip: false  ,
  // show things in the console.log
  log: true,
  // interval in ms 
  interval: 200
};

exports.setup = function (config) {
  var tokenChannels, publishMessageToClient, stockValues;
  var c = 0, notified = false, notifieddirectBroadcast = false;

  // convenience
  var pad2 = function(number) { return (number < 10 ? '0' : '') + number; };

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


  // add a client-writable channel (a little clunky)
  config.channels['nodejs_demo_chaos'] = {
    // make it client writeable
    isClientWritable: true,
    // this is just so that server.js doesn't barf, because it doesn't expect extensions to declare "extension-only"
    // channels it seems (i.e. w/o sockets)
    sessionIds: []
  };

  // hook onto a message coming in from the client
  process.on('client-message', function (sessionId, message) {
    // let's check for channel
    if (message.channel=='nodejs_demo_chaos') {
      // we would have to do some authenticate / authorizing shizzle ...
      // that's not difficult, because we have authData

      // let's just reset this puppy!
      c = 0;
      publishMessageToClient(sessionId, {channel: 'nodejs_notify', data: {subject: 'YOU DID A BAD THING!!!!', body: 'ARRRRGH CRASH'}});
    }
  });
  // hook onto messages coming in from the (Drupal) server
  process.on('backend-message', function(message) {
    if (message.channel=='nodejs_demo_chaos') {
      c = 0;
      // we *DON'T* HAVE A sessionId because it didn't come via
      messageToContentChannel({
        'channel': 'watchdog_dblog',
        'callback': 'nodejsNotify',
        'data': {'subject': 'DRUPAL DID A BAD THING', 'body': 'Crashing everything!'}
      });
    }
  });
  // we setup our extensions' loop
  var loop = function() {
    if (!extensionOptions.enabled) {
      // set new timeout, to allow for interacting w/ it.
      setTimeout( loop, extensionOptions.interval );
      return false;
    }
    // well, a nice sinus ...
    c = c + ( Math.PI / 100 );
    // some key
    var now = new Date();
    var ts = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' +  pad2(now.getSeconds() + '\'' + pad2(now.getMilliseconds()));
    // 0-1000
    var value = Math.abs( Math.floor( Math.sin( c ) * 1000 ) );
    var exciting_value = Math.abs( Math.floor( Math.cos( c ) * 1000 ) );

    // send the message to the given content channel
    messageToContentChannel({
      'channel': 'nodejs_demo_broadcast',
      'callback': 'nodejsDemoExample',
      'data': {'ts': ts, 'value': value, 'exciting_value': exciting_value, 'buy': 100}
    });

    // nodejs direct broadcasting
    if ( extensionOptions.directBroadcast ) {
      if (value < 100 && !notifieddirectBroadcast ) {
        notifieddirectBroadcast = true;
        var server_now = ( +new Date() );
        // this is actually "blocking" (but only in memory ...)
        messageToContentChannel({
          'channel': 'watchdog_dblog',
          'callback': 'nodejsNotify',
          'data': {'subject': 'Normal Value < 100', 'body': 'Consider buying ...'}
        });
        //
        var server_after_now = ( +new Date() );
        extensionOptions.log && console.log('nodejs_demo - completed messageToContentChannel in ' + ( server_after_now - server_now ) + 'ms ');
      }
      // reset the notifications
      if ( notifieddirectBroadcast && value > 100 ) {
        notifieddirectBroadcast = false;
      }
    }
    if ( extensionOptions.roundtrip ) {
      // this is a message to to the backend
      if (exciting_value < 100 && !notified ) {
        notified = true;
        // let's have a server timestamp for this request to check response-time, latency etc.
        // and make it a string, so that we don't get anything funny whilst passing it around via json
        var server_now = ( +new Date() );

        var message = {
          'messageType': 'nodejs_rules_trigger_component',
          'component': 'rules_nodejs_demo_cheap',
          // we just pass arguments to the component
          'arguments': ['EXCITING MESSAGE', ts + ': EXCITING - ' + exciting_value + 'EUR' ],
          'server_ts': server_now.toString()
        };
        extensionOptions.log && console.log('nodejs_demo - sendMessageToBackend', message);
        sendMessageToBackend(message , function(response) {
          // we could do some handling ...
          var server_after_now = ( +new Date() );
          extensionOptions.log && console.log('nodejs_demo - completed sendMessageToBackend in ' + ( server_after_now - server_now ) + 'ms ');
        });
      }
      // reset the notifications
      if ( notified && exciting_value > 100 ) {
        notified = false;
      }
    }
    // set new timeout
    setTimeout( loop, extensionOptions.interval );
  };

  console.log('Setting up nodejs_demo_ssjs_extension');
  setTimeout( loop, extensionOptions.interval );
};

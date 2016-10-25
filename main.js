/* eslint func-names: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint no-undef: 0 */
/* eslint no-unused-expressions: 0 */
/* eslint padded-blocks: 0 */
/* eslint no-unused-vars: 0 */
/* eslint prefer-template: 0 */
/* eslint no-use-before-define: 0 */
/* eslint no-shadow: 0 */
/* eslint no-param-reassign: 0 */

// declaring variables that will be used throughout the entire application
let socket = null;
let isInitiator = false;
let dataChannel = null;
let peerConnection = null;
const SERVERS = null;

$(document).ready(() => {
  // add a cold brew socket observing method to our socket
  socket = observeSignaling(io());

  // preventing the default form submit action
  $('form').on('submit', (e) => {
    e.preventDefault();
  });

  // handling what happens when the send button is clicked
  $('#sendMessage').on('click', function () {
    // grabbing the message in the form input
    const message = $(this).siblings()[0].value;
    // calling a function to handle putting the message on the page
    handleIncomingMessage(message);
    // resetting the form to blank
    $(this).siblings()[0].value = '';

    // preparing data to be sent through the data channel
    // sending data to the other client through the data channel
    if (dataChannel !== null) {
      const data = JSON.stringify({ type: 'message', message });
      dataChannel.send(data);
    }
  });

  // emitting a join  event through the socket or "signaling channel"
  // whenever a user comes to the page
  socket.emit('join', (numberClients) => {
    // checks if there are 2 people in the room
    // if there are, set the new user as the iniator
    isInitiator = numberClients === 2;

    // call the createRTC function after the user has joined the page
    peerConnection = createRTC(socket);

    // choose what to do whether the user is initating the signaling process
    // or receiving the signaling process
    if (isInitiator) {
      initiateSignaling(socket, peerConnection);
    } else {
      prepareToReceiveOffer(socket, peerConnection);
    }
  });

  // emitting to the server whenever a user leaves the page
  $(window).on('unload', () => {
    socket.emit('leave page');
  });
});

// a function to handle incoming messages
// creates a p tag gives it text and appends it to the dom
function handleIncomingMessage(message) {
  const messageElement = $('<p></p>', { class: 'message' });
  messageElement.text(message);
  $('#chat-window').append(messageElement);
}

// a function to create a peer connection
// and then set up its ice candidate event handlers
function createRTC(socket) {
  // creating a peerConnection with the coldBrewRTC method
  // to watch the RTC events
  const peerConnection = coldBrewRTC(
    SERVERS,
    { optional: [{ RtcDataChannels: true }] }
  );

  // attaching an event handler to the PC object that will fire
  // every time the peer connection finds an ice candidate
  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('send ice candidate', e.candidate);
    }
  };

  // setting up a socket to receive ice candidates every time
  // that one is sent to it via the server
  socket.on('receive ice candidate', (candidate) => {
    peerConnection.addIceCandidate(candidate);
  });

  return peerConnection;
}

// a function that will be called on the initiator that will start
// the signaling process
function initiateSignaling(socket, peerConnection) {
  // a function to create the data channel
  // IMPORTANT This function is what causes ice candidate events to fire
  // even though the events of this function do not fire until the signaling
  // process has ended
  initiateDataChannel(peerConnection);

  // The initiator creates an offer and set's their local description
  // then sends the offer through the signaling channel for the other client to receive
  peerConnection.createOffer((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.emit('send offer', offer);
  }, (err) => {
    if (err) throw err;
  });

  // An event on the signaling channel that fires once the offer has gone from the iniator
  // to the other client, and the other client has sent their answer back
  // the initiator sets their remote description to the answer or SDP of the other client
  socket.on('receive answer', (answer) => {
    peerConnection.setRemoteDescription(answer);
  });
}


// A function that fires on the non-iniator that sets them up for signaling
function prepareToReceiveOffer(socket, peerConnection) {
  // setting up an event on the PC that fires once a dataChannel
  // has been created
  peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel;
    // sets up an event handler on the dataChannel to deal with incoming messages
    dataChannel.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleIncomingMessage(data.message);
    };
  };

  // An event on the signaling channel that fires when the non-iniator receives and offer
  // they set their remote description, create an answer, set their local description, then
  // send that answer back over to the initiator through the signaling channel
  socket.on('receive offer', (offer) => {
    peerConnection.setRemoteDescription(offer);
    peerConnection.createAnswer((answer) => {
      peerConnection.setLocalDescription(answer);
      socket.emit('send answer', answer);
    }, (err) => {
      if (err) throw err;
    });
  });
}

// a function for the iniator that creates the data channel
function initiateDataChannel(peerConnection) {
  // creating the data channel
  dataChannel = peerConnection.createDataChannel(
    'messageChannel',
    { reliable: false }
  );

  // setting event handlers to the data channel to deal with sending messages
  dataChannel.onopen = () => {
    dataChannel.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleIncomingMessage(data.message);
    };
  };
}

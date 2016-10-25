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

let socket = null;
let isInitiator = false;
let dataChannel = null;
let peerConnection = null;
const SERVERS = null;

$(document).ready(() => {
  socket = observeSignaling(io());

  $('form').on('submit', (e) => {
    e.preventDefault();
  });

  $('#sendMessage').on('click', function () {
    const message = $(this).siblings()[0].value;
    handleIncomingMessage(message);
    $(this).siblings()[0].value = '';

    const data = JSON.stringify({ type: 'message', message });
    dataChannel.send(data);
  });

  socket.emit('join', (numberClients) => {
    isInitiator = numberClients === 2;

    peerConnection = createRTC(socket);

    if (isInitiator) {
      initiateSignaling(socket, peerConnection);
    } else {
      prepareToReceiveOffer(socket, peerConnection);
    }
  });

  $(window).on('unload', () => {
    socket.emit('leave page');
  });
});

function handleIncomingMessage(message) {
  const messageElement = $('<p></p>', { class: 'message' });
  messageElement.text(message);
  $('#chat-window').append(messageElement);
}


function createRTC(socket) {
  const peerConnection = coldBrewRTC(
    SERVERS,
    { optional: [{ RtcDataChannels: true }] }
  );

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('send ice candidate', e.candidate);
    }
  };

  socket.on('receive ice candidate', (candidate) => {
    peerConnection.addIceCandidate(candidate);
  });

  return peerConnection;
}


function initiateSignaling(socket, peerConnection) {
  initiateDataChannel(peerConnection);

  peerConnection.createOffer((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.emit('send offer', offer);
  }, (err) => {
    if (err) throw err;
  });

  socket.on('receive answer', (answer) => {
    peerConnection.setRemoteDescription(answer);
  });
}

function initiateDataChannel(peerConnection) {
  dataChannel = peerConnection.createDataChannel(
    'messageChannel',
    { reliable: false }
  );

  dataChannel.onopen = () => {
    dataChannel.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleIncomingMessage(data.message);
    };
  };
}


function prepareToReceiveOffer(socket, peerConnection) {
  peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel;

    dataChannel.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleIncomingMessage(data.message);
    };
  };

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








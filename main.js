/* eslint func-names: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint no-undef: 0 */
/* eslint no-unused-expressions: 0 */
/* eslint padded-blocks: 0 */
/* eslint no-unused-vars: 0 */
/* eslint prefer-template: 0 */
/* eslint no-use-before-define: 0 */

let socket = null;

$(document).ready(() => {
  socket = observeSignaling(io());

  $('form').on('submit', (e) => {
    e.preventDefault();
  });

  $('#sendMessage').on('click', function () {
    const message = $(this).siblings()[0].value;
    handleIncomingMessage(message);
    $(this).siblings()[0].value = '';
  });

  socket.emit('join');

});

function handleIncomingMessage(message) {
  const messageElement = $('<p></p>', { class: 'message' });
  messageElement.text(message);
  $('#chat-window').append(messageElement);
}







/* eslint func-names: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint no-undef: 0 */
/* eslint import/newline-after-import: 0 */
/* eslint no-console: 0 */


const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

let numClients = 0;
io.on('connection', (socket) => {
  socket.on('join', (respond) => {
    numClients++;
    respond(numClients);
  });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

server.listen(3000, () => {
  console.log('listening on port 3000');
});

module.exports = {
  app,
  resetNumClients(num) {
    numClients = num;
  },
};

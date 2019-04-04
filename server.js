// static server (8089)

var http = require('http')
var serve = require('ecstatic')
var opn = require('opn')

http.createServer(
  serve({ root: __dirname})
).listen(8089)


opn('http://localhost:8089')

// websocket server (8080)


var WebSocket = require('ws')
var fs = require('fs')

var wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    var receivedLog = JSON.parse(message)
    if (receivedLog.publicKey) {
      var publicKey = receivedLog.publicKey

      var clientLog = receivedLog.log
      // check to see if log is on server
      if (fs.existsSync(__dirname + '/bogs/' + publicKey)) {
        var serverLog = JSON.parse(fs.readFileSync(__dirname + '/bogs/' + receivedLog.publicKey))
        // if the server log has more entries than the log in the client, send the server log to the client
        if (serverLog.length > clientLog.length) {
          sendingLog = {
            publicKey: publicKey,
            log: serverLog
          }
          ws.send(JSON.stringify(sendingLog))
          console.log('SENT ' + publicKey + ' TO CLIENT')
        }
        // if server log has less entries than the log sent by the client, write it to the server
        if (serverLog.length < clientLog.length) {
          fs.writeFile(__dirname + '/bogs/' + publicKey, JSON.stringify(clientLog), function (err) {
            if (err) throw err
            console.log('SAVED ' + publicKey + ' TO SERVER')
          })
        }
        // if logs are identical, do nothing
        if (serverLog.length == clientLog.length) {
          console.log(publicKey + ': LOGS ARE THE SAME')
        }
      // if log doesn't already exist, write it
      } else {
        fs.writeFile(__dirname + '/bogs/' + publicKey, JSON.stringify(clientLog), function (err) {
          if (err) throw err
          console.log('SAVED ' + publicKey + ' TO SERVER')
        })
      }
    }
  })
})


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
var nacl = require('tweetnacl')
    nacl.util = require('tweetnacl-util')

var wserver = new WebSocket.Server({ port: 8080 })

wserver.on('connection', function (ws) {
  ws.on('message', function (message) {
    var data = JSON.parse(message)
    console.log(data)

    // initial req/res contains a sequence number
    if (data.seq) {
      if (fs.existsSync(__dirname + '/bogs/' + data.feed)) {
        fs.readFile(__dirname + '/bogs/' + data.feed, 'UTF-8', function (err, data) {
          if (data) {
            var log = JSON.parse(data)
            console.log(log)
          }
        })
      } else {
        var res = {
          feed: data.feed,
          seq: null
        }
        console.log(res)
        ws.send(JSON.stringify(res))
      }

    }

    // if the client has a longer log, it'll send one for the server to save
    if (data.log) {
      console.log(data)
      if (fs.existsSync(__dirname + '/bogs/' + data.feed)) {
        var log = JSON.parse(fs.readFileSync(__dirname + '/bogs/' + data.feed))
        console.log(log)

      } else {
        fs.writeFile(__dirname + '/bogs/' + data.feed, JSON.stringify(data.log), function (err, success) {
          console.log('saved ' + data.feed + ' sent by ' + data.requester)
        })
      }
    }

  })
})


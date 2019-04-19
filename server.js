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
    console.log(message)
  })
})


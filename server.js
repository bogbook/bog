// static server (8089)

var http = require('http')
var serve = require('ecstatic')
var open = require('open')

http.createServer(
  serve({ root: __dirname})
).listen(8089)

open('http://localhost:8089')

// ws server (8080)

var WebSocket = require('ws')
var fs = require('fs')
var nacl = require('tweetnacl')
    nacl.util = require('tweetnacl-util')

var wserver = new WebSocket.Server({ port: 8080 })

wserver.on('connection', function (ws) {
  ws.on('message', function (message) {

  })

})

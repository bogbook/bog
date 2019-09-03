// static server (8089)

var http = require('http')
var serve = require('ecstatic')
var open = require('open')

http.createServer(
  serve({ root: __dirname})
).listen(8089)

open('http://localhost:8089')

// ws server (8080)

var bog = require('./bog')
var WS = require('ws')
var fs = require('fs')
var nacl = require('tweetnacl')
    nacl.util = require('tweetnacl-util')

var wserve = new WS.Server({ port: 8080 })

bog.keys().then(key => {
  wserve.on('connection', function (ws) {
    ws.on('message', function (message) {
      var req = JSON.parse(message)
      console.log(message)
      bog.unbox(req.box, req.requester, key).then(unboxed => {
        console.log(nacl.util.encodeUTF8(unboxed))
      })
    })
  })
})


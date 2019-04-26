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
    var req = JSON.parse(message)
    console.log(req)
    if (req.seq) {
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) {
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          if (data) {
            var log = JSON.parse(data)
            console.log(log[0])
            var pubkey = nacl.util.decodeBase64(req.src.substring(1))
            var sig = nacl.util.decodeBase64(log[0].signature)
            var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

            console.log(opened)
            var res = {
              feed: req.src,
              seq: opened.seq
            }
            ws.send(JSON.stringify(res))
            // COMPARE SEQ
          }
        })
      } else {
        var res = {
          feed: req.src,
          seq: null
        }
        console.log(res)
        ws.send(JSON.stringify(res))
      }
    } else {
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) { 
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          var log = JSON.parse(data)
          var res = {
            src: req.src,
            log
          }
          console.log('SENDING FULL LOG')
          ws.send(JSON.stringify(res))
        })
      }
    }
    if (req.log) {
      console.log('LOG')
      console.log(req.log)
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) {
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          var serverlog = JSON.parse(data)

          var newlog = req.log.concat(serverlog)

          fs.writeFile(__dirname + '/bogs/' + req.src, JSON.stringify(newlog), 'UTF-8', function (err, success) {
            console.log('APPENDED DIFF AND WROTE LOG')
          })

          console.log('TRY APPENDING')
          // read bogfile, append received data, and then save again
        })
      } else {
        fs.writeFile(__dirname + '/bogs/' + req.src, JSON.stringify(req.log), 'UTF-8', function (err, success) {
          if (err) throw err
          else
            console.log('WROTE LOG')
        })
      }
    }
  })
})

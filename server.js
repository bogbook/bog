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
    if (req.seq) {
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) {
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          if (data) {
            var log = JSON.parse(data)
            var pubkey = nacl.util.decodeBase64(req.src.substring(1))
            var sig = nacl.util.decodeBase64(log[0].signature)
            var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

            var res = {
              feed: req.src,
              seq: opened.seq
            }
            ws.send(JSON.stringify(res))
            if(res.seq > req.seq) {
              console.log('Sending diff of' + req.src + ' to ' + req.requester)
              var diff = res.seq - req.seq
              var sendlog = log.slice(0, diff)
              var send = {
                src: req.src,
                log: sendlog
              }
              ws.send(JSON.stringify(send))
            }
          }
        })
      } else {
        var res = {
          feed: req.src,
          seq: null
        }
        ws.send(JSON.stringify(res))
      }
    } else if (req.seq === null) {
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) { 
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          var log = JSON.parse(data)
          var res = {
            src: req.src,
            log
          }
          console.log('Sending full log of ' + req.src + ' to ' + req.requester )
          ws.send(JSON.stringify(res))
        })
      }
    }
    if (req.log) {
      if (fs.existsSync(__dirname + '/bogs/' + req.src)) {
        fs.readFile(__dirname + '/bogs/' + req.src, 'UTF-8', function (err, data) {
          var serverlog = JSON.parse(data)

          var newlog = req.log.concat(serverlog)

          fs.writeFile(__dirname + '/bogs/' + req.src, JSON.stringify(newlog), 'UTF-8', function (err, success) {
            console.log('Appending diff of ' + req.src + ' from ' + req.requester + ' and saved to server')
          })

        })
      } else {
        fs.writeFile(__dirname + '/bogs/' + req.src, JSON.stringify(req.log), 'UTF-8', function (err, success) {
          if (err) throw err
          else
            console.log('Saved new log of ' + req.src + ' that was sent from ' + req.requester )
        })
      }
    }
  })
})

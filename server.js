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
var homedir = require('os').homedir()

var bogdir = homedir + '/.bogbook/bogs/'

if (!fs.existsSync(homedir + '/.bogbook/')) {
  fs.mkdirSync(homedir + '/.bogbook/')
}

if (!fs.existsSync(bogdir)){
  fs.mkdirSync(bogdir)
}

var wserve = new WS.Server({ port: 8080 })

bog.keys().then(key => {
  wserve.on('connection', function (ws) {
    ws.on('message', function (message) {
      var req = JSON.parse(message)
      if (req.sendpub) {
        ws.send(key.publicKey)
      }
      else { 
        bog.unbox(req.box, req.requester, key).then(unboxed => {
          var unboxedreq = JSON.parse(nacl.util.encodeUTF8(unboxed))
          if (unboxedreq.seq === 0) {
            console.log(req.requester + ' asked the full log of ' + unboxedreq.author)
            fs.readFile(bogdir + unboxedreq.author, 'UTF-8', function (err, data) {
              if (data) {
                //var feed = JSON.stringify(data)
                var feed = data
                bog.box(feed, req.requester, key).then(boxed => {
                  var obj = {
                    requester: key.publicKey,
                    box: boxed
                  }
                  ws.send(JSON.stringify(obj))
                  console.log('Sent full log of ' + unboxedreq.author + ' to ' + req.requester)
                })
              }
            })
          }
          if (unboxedreq.seq) {
            console.log(req.requester + ' asked for feed ' + unboxedreq.author + ' after sequence ' + unboxedreq.seq)
            // check to see if we have the feed on disk
            fs.readFile(bogdir + unboxedreq.author, 'UTF-8', function (err, data) {
              if (data) {
                // TODO open the latest message, and check the sequence number
                var feed = JSON.parse(data)
                bog.open(feed[0]).then(msg => {
                  if (unboxedreq.seq === msg.seq) { 
                    console.log(unboxedreq.author + '\'s feed is identical, sending nothing to client')
                  } 

                  if (unboxedreq.seq > msg.seq) {
                    // right now the client is still sending the entire log, which works just fine but isn't optimal
                    console.log('client feed is longer, requesting diff from client')
                    var reqdiff = JSON.stringify({author: unboxedreq.author, seq: msg.seq})
                    bog.box(reqdiff, req.requester, key).then(boxed => {
                      var obj = {
                        requester: key.publicKey,
                        box: boxed
                      }
                      ws.send(JSON.stringify(obj))
                    })
                  }
                  
                  if (unboxedreq.seq < msg.seq) {
                    console.log('client feed is shorter, sending diff to client')
                    var diff = JSON.stringify(feed.slice(0, msg.seq - unboxedreq.seq))
                    bog.box(diff, req.requester, key).then(boxed => {
                      var obj = {
                        requester: key.publicKey,
                        box: boxed
                      }
                      ws.send(JSON.stringify(obj))
                    })
                  }  
                }) 
              } else {
                // if we don't have the feed, request the feed from the client and save
                console.log('We don\'t have the log on the server, requesting log from ' + req.requester )
                var reqwhole = JSON.stringify({author: unboxedreq.author, seq: 0})

                bog.box(reqwhole, req.requester, key).then(boxed => {
                  var obj = {
                    requester: key.publicKey,
                    box: boxed  
                  }
                  ws.send(JSON.stringify(obj))
                })
              }
            })
          } else if (Array.isArray(unboxedreq)) {
            // first check to make sure that we have an entire log
            bog.open(unboxedreq[0]).then(msg => {
              if (msg.seq === unboxedreq.length) {
                fs.writeFile(bogdir + msg.author, JSON.stringify(unboxedreq), 'UTF-8', function (err, success) {
                  console.log('Saved full log of ' + msg.author + ' sent by ' + req.requester)
                })
              } if (msg.seq > unboxedreq.length) {
                fs.readFile(bogdir + msg.author, 'UTF-8', function (err, data) {
                  var feed = JSON.parse(data)
                  bog.open(feed[0]).then(lastmsg => {
                    if (unboxedreq.length + lastmsg.seq === msg.seq) {
                      var newlog = unboxedreq.concat(feed)
                      fs.writeFile(bogdir + msg.author, JSON.stringify(newlog), 'UTF-8', function (err, success) {
                        console.log('combined existing feed of ' + msg.author + ' with diff and saved to server')
                      })
                    }
                  })
                })
              } 
            })
          } 
        })
      }
    })
  })
})


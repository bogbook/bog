var fs = require('fs')
var homedir = require('os').homedir()

var bog = require('./util')
var appdir = homedir + '/.bogbookv2/'

if (!fs.existsSync(appdir)) { fs.mkdirSync(appdir) }

var PORT = 8081

var express = require('express')
var app = express()
var ews = require('express-ws')(app)

async function readBog () {
  try {
    var feeds = JSON.parse(await fs.promises.readFile(appdir + 'feeds', 'utf8'))
  } catch {
    var feeds = []
  }
  return feeds
}

readBog().then(feeds => {
  
  app.ws('/ws', function (ws, req) {
    ws.on('message', function (msg) {
      var req = JSON.parse(msg)
      if (req.msg) {
        bog.open(req.msg).then(opened => {
          if (feeds[opened.author]) {
            if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
              feeds[opened.author].unshift(req.msg)
              console.log(feeds)
              var gossip = {feed: opened.author, seq: opened.seq}
              ws.send(JSON.stringify(gossip))
            }
          } else {
            feeds[opened.author] = [req.msg]
            var gossip = {feed: opened.author, seq: opened.seq}
            ws.send(JSON.stringify(gossip))
          }
        })
      }
      else if (req.seq || (req.seq === 0)) {
        if (!feeds[req.feed]) {
          ws.send(JSON.stringify({feed: req.feed, seq: 0}))
        }
        else if (feeds[req.feed]) {
          if (req.seq < feeds[req.feed].length) {
            console.log(feeds[req.feed].length)
            var resp = {}
            resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
            ws.send(JSON.stringify(resp))
          }
          if (req.seq > [feeds[req.feed].length]){
            console.log(feeds[req.feed].length)
            var gossip = {feed: req.feed, seq: feeds[req.feed].length}
            ws.send(JSON.stringify(gossip))
          }
        } 
      }
    })
  })
  app.use(express.static('.'))
  
  app.listen(PORT)
})


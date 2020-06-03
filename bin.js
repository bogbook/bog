var fs = require('fs')
var homedir = require('os').homedir()

var bog = require('./util')
var appdir = homedir + '/.bogbookv2/'

if (!fs.existsSync(appdir)) { fs.mkdirSync(appdir) }
if (!fs.existsSync(appdir + 'bogs/')) { fs.mkdirSync(appdir + 'bogs/') }

var PORT = 8081

var express = require('express')
var app = express()
var ews = require('express-ws')(app)

async function readBog () {
  try {
    var feeds = []
    var files = await fs.promises.readdir(appdir + 'bogs/')
    console.log(files)
    for (const file of files) {
      console.log(file)
      const data = await fs.promises.readFile(appdir + 'bogs/' + file, 'UTF-8')
      const feed = JSON.parse(data)
      feeds[file] = feed
      console.log(feeds)
    }
    //var feeds = JSON.parse(await fs.promises.readFile(appdir + 'feeds', 'utf8'))
  } catch {
    var feeds = []
  }
  return feeds
}

readBog().then(feeds => {

  setInterval(function () {
    if (feeds) {
      for (var key in feeds) {
        var value = feeds[key]
        fs.writeFileSync(appdir + 'bogs/' + key, JSON.stringify(value), 'UTF-8')
        console.log('saving ' + key) 
        //console.log(key, value)
      }
    } else {console.log('no feeds?', feeds)}
  }, 10000)
  
  app.ws('/ws', function (ws, req) {
    ws.on('message', function (msg) {
      var req = JSON.parse(msg)
      if (req.msg) {
        bog.open(req.msg).then(opened => {
          if (feeds[opened.author]) {
            if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
              feeds[opened.author].unshift(req.msg)
              //fs.writeFileSync(appdir + 'feeds', JSON.stringify(feeds), 'UTF-8')
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
            var resp = {}
            resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
            ws.send(JSON.stringify(resp))
          }
          if (req.seq > [feeds[req.feed].length]){
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


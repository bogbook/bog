var fs = require('fs')
var homedir = require('os').homedir()

var bog = require('./util')

var root = 'bogbookv2'

if (process.argv[2]) {
  root = process.argv[2]
}

var appdir = homedir + '/.' + root + '/'
console.log('saving bogs to ' + appdir)

var url = 'localhost'
var fortified = false

var log = []

if (!fs.existsSync(appdir)) { fs.mkdirSync(appdir) }
if (!fs.existsSync(appdir + 'bogs/')) { fs.mkdirSync(appdir + 'bogs/') }

var PORT = 8081

var express = require('express')
var app = express()
var ews = require('express-ws')(app)

/*bog.keys().then(keys => {
  console.log(keys.substring(0, 44))
  bog.box('Hello World', keys.substring(0, 44), keys).then(boxed => {
    console.log(boxed)
    bog.unbox(boxed, keys)
  })
})*/

if (fs.existsSync(appdir + 'config.json')) {
  var config = JSON.parse(fs.readFileSync(appdir + 'config.json' , 'UTF-8'))
  if (config.url) {
    url = config.url
  }
  if (config.fort) {
    fortified = true
    console.log('this bogbook is fortified')
  }
  if (config.port) {
    PORT = config.port
  }
}

async function readBog () {
  try {
    var feeds = []
    var files = await fs.promises.readdir(appdir + 'bogs/')
    for (const file of files) {
      const data = await fs.promises.readFile(appdir + 'bogs/' + file, 'UTF-8')
      const feed = JSON.parse(data)
      feeds[file] = feed
    }
  } catch {
    var feeds = []
  }
  return feeds
}

async function makeLog (feeds) {
  if (feeds) {
    console.log('generating log from feeds, this may take a moment to complete...')
    var all = []
    Object.keys(feeds).forEach(function(key,index) {
      all = all.concat(feeds[key])
      if (Object.keys(feeds).length -1 === index) {
        //console.log(all)
        all.forEach((msg, index) => {
          bog.open(msg).then(opened => {
            log.push(opened)
            if (index === all.length -1) {
              console.log(log.length + ' posts from ' + (Object.keys(feeds).length) + ' authors')
              //localforage.setItem('log', log)
            }
          })
        })
      }
    })
  }
}

readBog().then(feeds => {
  makeLog(feeds)
  setInterval(function () {
    if (feeds) {
      for (var key in feeds) {
        var value = feeds[key]
        fs.writeFileSync(appdir + 'bogs/' + key, JSON.stringify(value), 'UTF-8')
      }
    } else {console.log('no feeds?', feeds)}
  }, 10000)
  bog.keys(appdir).then(keys => {
    console.log(keys.substring(0, 44))
    app.ws('/ws', function (ws, req) {
      ws.on('message', function (msg) {
        if (msg[0] === '{') {
          var req = JSON.parse(msg)
          if (req.connected) {
            var time = new Date().toLocaleString()
            if (!feeds[req.connected]) {
              if (fortified) {
                console.log('access denied to ' + req.connected  + ' at ' + time)
              } else {
                var resp = {pubkey: keys.substring(0, 44), url: url, welcome: 'Hey! Welcome to Bogbook. If you do not see any posts, consider adding `ws://bogbook.com/ws` to your [pubs](#pubs) and syncing my feed. —[ev](#Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=)', connected: ews.getWss().clients.size}
                if (config && config.welcome) {
                  resp.welcome = config.welcome
                }
                ws.pubkey = req.connected
                bog.box(JSON.stringify(resp), req.connected, keys).then(boxed => {
                  ws.send(boxed)
                })
                console.log(req.connected + ' connected at ' + time)
              }
            }
            if (feeds[req.connected]) {
              var resp = {pubkey: keys.substring(0, 44), url: url, welcome: 'Hey! Welcome to Bogbook. If you do not see any posts, consider adding `ws://bogbook.com/ws` to your [pubs](#pubs) and syncing my feed. —[ev](#Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=)', connected: ews.getWss().clients.size}
              if (config && config.announce) {
                resp.welcome = config.announce
              }
              ws.pubkey = req.connected
              bog.box(JSON.stringify(resp), req.connected, keys).then(boxed => {
                ws.send(boxed)
              })
              console.log(req.connected + ' connected at ' + time)
            }
          }
        } else {
          bog.unbox(msg, keys).then(unboxed => {
            var req = JSON.parse(unboxed)
            processReq(req, ws, keys)
          })
        }
      })
    })
  })

  app.use(express.static('.'))
  
  app.listen(PORT)
  console.log('http://' + url + ':' + PORT + '/')

  function processReq (req, ws, keys) {
    if (req.msg) {
      bog.open(req.msg).then(opened => {
        if (feeds[opened.author]) {
          if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
            feeds[opened.author].unshift(req.msg)
            log.push(opened)
            console.log('new post from: http://'+ url + '/#' + opened.author)
            var gossip = {feed: opened.author, seq: opened.seq}
            bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
              ws.send(boxed)
            })
          }
        } else {
          feeds[opened.author] = [req.msg]
          log.push(opened)
          console.log('first post from: http://'+ url + '/#'  + opened.author)
          var gossip = {feed: opened.author, seq: opened.seq}
          bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
            ws.send(boxed)
          })
        }
      })
    }
    else if (req.seq || (req.seq === 0)) {
      if (!feeds[req.feed]) {
        log.forEach(msg => {
          if (msg.raw.substring(0, 44) === req.feed) {
            var message = {permalink: msg.raw}
            bog.box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
              console.log('sent permalink http://' + url + '/#' + msg.raw.substring(0, 44) + ' to ' + ws.pubkey)
              ws.send(boxed)
            })
          }
        }) 
        var gossip = {feed: req.feed, seq: 0}
        bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
          ws.send(boxed)
        })
      }
      else if (feeds[req.feed]) {
        if (req.seq < feeds[req.feed].length) {
	  if ((req.seq == 0) && feeds[req.feed].length) {
            console.log('sending first post of ' + req.feed + ' to ' + ws.pubkey + ' at ' + new Date().toLocaleString())
          } 
	  if (req.seq == (feeds[req.feed].length - 1)) {
            console.log('sending latest post of ' + req.feed + ' to ' + ws.pubkey + ' at ' + new Date().toLocaleString())

	  }
          var resp = {}
          resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
          bog.box(JSON.stringify(resp), ws.pubkey, keys).then(boxed => {
            ws.send(boxed)
          })
        }
        if (req.seq > [feeds[req.feed].length]){
          var gossip = {feed: req.feed, seq: feeds[req.feed].length}
          bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
            ws.send(boxed)
          })
        }
      } 
    } 
  }
})

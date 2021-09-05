var fs = require('fs')
var chalk = require('chalk')

var homedir = require('os').homedir()

var bog = require('./util')

var root = 'bogbook'

if (process.argv[2]) {
  root = process.argv[2]
}

var appdir = homedir + '/.' + root + '/'
console.log('saving bogs to ' + appdir)

var PORT = 8081
var url = 'localhost'
var fortified = false

var log = []

if (!fs.existsSync(appdir)) { fs.mkdirSync(appdir) }
if (!fs.existsSync(appdir + 'bogs/')) { fs.mkdirSync(appdir + 'bogs/') }
if (!fs.existsSync(appdir + 'stats/')) { fs.mkdirSync(appdir + 'stats/') }

var counter = 0

if (fs.existsSync(appdir + 'counter')) {
  counter = JSON.parse(fs.readFileSync(appdir + 'counter', 'UTF-8'))
}

var express = require('express')
var app = express()
var ews = require('express-ws')(app)

var ad = 'Hello World!'

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

async function readVisits () {
  try {
    var connects = []
    var files = await fs.promises.readdir(appdir + 'stats/')
    for (const file of files) {
      const data = await fs.promises.readFile(appdir + 'stats/' + file, 'UTF-8')
      const visit = JSON.parse(data)
      connects[file] = visit
    }
  } catch {
    connects = []
  }
  return connects
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
    feeds = []
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
        all.forEach((msg, index) => {
          bog.open(msg).then(opened => {
            log.push(opened)
            if (index === all.length -1) {
              console.log(log.length + ' posts from ' + (Object.keys(feeds).length) + ' authors')
            }
          })
        })
      }
    })
  }
}


readBog().then(feeds => {
  readVisits().then(connects => {
    console.log('There have been ' + counter + ' visits from ' + Object.keys(connects).length + ' visitors.')

    makeLog(feeds)

    setInterval(function () {
      if (feeds) {
        fs.writeFileSync(appdir + 'counter', JSON.stringify(counter), 'UTF-8')
        for (var key in connects) {
          var value = connects[key]
  	fs.writeFileSync(appdir + 'stats/' + key, JSON.stringify(value), 'UTF-8')
        }
        for (var key in feeds) {
          var value = feeds[key]
          fs.writeFileSync(appdir + 'bogs/' + key, JSON.stringify(value), 'UTF-8')
        }
      } else {console.log('no feeds?', feeds)}
    }, 10000)

    bog.keys(appdir).then(keys => {
      console.log(bog.name(log, keys.substring(0, 44)))
      app.ws('/ws', function (ws, req) {
        ws.on('message', function (msg) {
          if (msg[0] === '{') {
            var req = JSON.parse(msg)
            if (req.connected) {
  	    counter++
  	    if (connects[req.connected]) {
  	      connects[req.connected].counter++
  	    } else {
                connects[req.connected] = {counter: 1} 
  	    }
  	    if (config && config.welcome) {
  	      ad = config.welcome
  	    }
  	    var welcome = ' There have been ' + counter + ' visits from ' + Object.keys(connects).length + ' visitors. \n\n' + ad
              var time = new Date().toLocaleString()
              if (!feeds[req.connected]) {
                if (fortified) {
                  console.log(chalk.red('access denied') + ' to ' + chalk.grey(req.connected)  + ' at ' + time)
                  var resp = {denied: config.denied || 'Hey Bud, your access is denied.'}
                  bog.box(JSON.stringify(resp), req.connected, keys).then(boxed => {
                    ws.send(boxed)
                  })
                } else {
                  var resp = {pubkey: keys.substring(0, 44), url: url, welcome: welcome, connected: ews.getWss().clients.size}
                  ws.pubkey = req.connected
                  bog.box(JSON.stringify(resp), req.connected, keys).then(boxed => {
                    ws.send(boxed)
                  })
                  console.log(chalk.green('connect ') + chalk.cyan(bog.name(log, req.connected)) + ' ' + chalk.grey(req.connected) + ' at ' + time)
                }
              }
              if (feeds[req.connected]) {
                var resp = {pubkey: keys.substring(0, 44), url: url, welcome: welcome, connected: ews.getWss().clients.size}
                ws.pubkey = req.connected
                bog.box(JSON.stringify(resp), req.connected, keys).then(boxed => {
                  ws.send(boxed)
                })
                console.log(chalk.green('connect ') + chalk.cyan(bog.name(log, req.connected)) + ' ' + chalk.grey(req.connected) + ' at ' + time)
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
  	    var via = ''
  	    if (opened.author != ws.pubkey) {
                via = ' via ' + chalk.cyan(bog.name(log, ws.pubkey)) + ' ' +  chalk.grey(ws.pubkey)
  	    }
              console.log(chalk.magenta('post ' + opened.seq) + ' from ' + chalk.cyan(bog.name(log, opened.author)) + ' ' + chalk.grey(opened.author) + via)
              var gossip = {feed: opened.author, seq: opened.seq}
              bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                ws.send(boxed)
              })
            }
          } else {
            feeds[opened.author] = [req.msg]
            log.push(opened)
  	  var via = ''
  	  if (opened.author != ws.pubkey) {
              via = ' via ' + chalk.cyan(bog.name(log, ws.pubkey)) + ' ' +  chalk.grey(ws.pubkey)
  	  }
            console.log(chalk.magenta('post ' + opened.seq) + ' from ' + chalk.cyan(bog.name(log, opened.author)) + ' '  + chalk.grey(opened.author) + via)
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
                console.log('sent permalink http://' + url + '/#' + msg.raw.substring(0, 44) + ' to ' +  bog.name(log, ws.pubkey) + ' ' + ws.pubkey)
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
              console.log(chalk.yellow('sync ') + chalk.cyan(bog.name(log, req.feed)) + ' ' + chalk.grey(req.feed) + ' to ' + chalk.cyan(bog.name(log, ws.pubkey)) + ' ' + chalk.grey(ws.pubkey) + ' at ' + new Date().toLocaleString())
            } 
  	  if (req.seq == (feeds[req.feed].length - 1)) {
              console.log(chalk.yellow('done ') + chalk.cyan(bog.name(log, req.feed)) + ' ' + chalk.grey(req.feed) + ' to ' + chalk.cyan(bog.name(log, ws.pubkey)) + ' '+ chalk.grey(ws.pubkey) + ' at ' + new Date().toLocaleString())
  
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
})

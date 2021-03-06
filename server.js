var fs = require('fs')
var homedir = require('os').homedir()

var path = homedir + '/.bogbook/'
var bogdir = path + 'bogs/'
var confpath = path + 'config.json'

if (!fs.existsSync(homedir + '/.bogbook/')) {fs.mkdirSync(homedir + '/.bogbook/')}
if (!fs.existsSync(bogdir)){fs.mkdirSync(bogdir)}

if (fs.existsSync(confpath)) {
  console.log('loading config from ' + confpath)
  var config = require(confpath)
} else {
  var config = {
    port: '8089',
    wsport: '8080',
    url: 'localhost',
    author: '@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0='
  }
  config.fullurl = 'http://' + config.url + ':' + config.port + '/' 
  fs.writeFileSync(confpath, JSON.stringify(config), 'utf-8')
}

console.log(config)

if (process.argv[2] === 'verbose') {
  var VERBOSE = true
} else {
  var VERBOSE = false
}

console.log('Verbose output is ' + VERBOSE + ' run with `node server verbose` to see all output')

// log messages

function printAsk(req, unboxedreq) {
  if (VERBOSE) {
    console.log(req.requester + ' asked for feed ' + unboxedreq.author + ' after sequence ' + unboxedreq.seq)
  }
}

function printNewFeed (msg, req) {
  if (VERBOSE) 
    console.log('Saved full log of ' + msg.author + ' sent by ' + req.requester)
  else 
    console.log('NEW FEED from ' + msg.author)
}

function printUpdateFeed (msg, req) {
  if (VERBOSE)
    console.log('combined existing feed of ' + msg.author + ' sent from ' + req.requester + ' with diff and saved to server')
  else
    console.log('NEW UPDATE from ' + msg.author)
}

function printNoFeed (msg, req) {
  if (VERBOSE) { 
    console.log('We don\'t have the log on the server, requesting log from ' + req.requester )
  }
}

function printClientLonger (msg, req) {
  if (VERBOSE) {
    console.log(req.requester + '\'s feed of ' + msg.author  + ' is longer, requesting diff from ' + req.requester)
  }
}

function printClientShorter (msg, req, baserange, endrange) {
  if (VERBOSE) {
    console.log(req.requester + ' feed of ' + msg.author + ' is shorter, sending from ' + baserange + ' to ' + endrange + ' to ' + req.requester)
  }
}

function printFeedIdentical (msg, req) {
  if (VERBOSE) { 
    console.log(msg.author + '\'s feed sent from ' + req.requester + ' is identical')
  }
}

// static server (8089)

var serve = require('koa-static-server')
var koa = require('koa')
var open = require('open')

var app = new koa()

// namespace redirect -- add namespaces to ~/.bogbook/names.json
app.use(async function (ctx, next) {
  if (ctx.request.url[1] != '#') {
    var name = ctx.request.url.substring(1)

    if (!fs.existsSync(path + 'names.json')) {
      var obj = {
        ev: '@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=',
        mil3s: '@531mT2x1FnQdpYJxVrG8YD9wiE767xO88kKRhi5A3Yg=',
        g: '@WVBPY53Bl4aUIngt2TXV8nW+IGKvCTqhv88EvktOX9s='
      }
      fs.writeFileSync(path + 'names.json', JSON.stringify(obj), 'UTF-8')
    }

    var obj = JSON.parse(fs.readFileSync(path + 'names.json', 'UTF-8'))

    for (var property in obj) {
      if ((name === property) || (name === property + '/')) {
        ctx.redirect('/#' + obj[property])
      }
    }
  }
  return await next()
})

app.use(serve({rootDir: '.', notFoundFile: 'index.html'}))

app.listen(config.port)

open(config.fullurl)

console.log('Bogbook is running at: ' + config.fullurl)

var bog = require('./bog')
var WS = require('ws')
var nacl = require('tweetnacl')
    nacl.util = require('tweetnacl-util')

var wserve = new WS.Server({ port: config.wsport })

bog.keys().then(key => {
  wserve.on('connection', function (ws) {
    ws.on('message', function (message) {
      var req = JSON.parse(message)
      if (req.sendpub) {
        ws.send(key.publicKey)
        ws.close()
      } else { 
        bog.unbox(req.box, req.requester, key).then(unboxed => {
          var unboxedreq = JSON.parse(unboxed)
          //console.log(unboxedreq)
          if (unboxedreq.seq >= 0) {
            printAsk(req, unboxedreq)
            fs.readFile(bogdir + unboxedreq.author, 'UTF-8', function (err, data) {
              if (data) {
                var feed = JSON.parse(data)
                bog.open(feed[0]).then(msg => {
                  if (unboxedreq.seq === msg.seq) { 
                    printFeedIdentical(msg, req)
                    ws.close()
                  }  
                  if (unboxedreq.seq > msg.seq) {
                    printClientLonger(msg, req)
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
                    var endrange = feed.length - unboxedreq.seq - 1

                    //var endrange = feed.length - unboxedreq.seq - Math.floor(Math.random() * 50 + 1)
                    if (endrange < 0) {
                      endrange = 0
                    }
                    var baserange = feed.length - unboxedreq.seq
                    printClientShorter(msg, req, baserange, endrange)
                    if (baserange > 50) {
                      var latest = JSON.stringify({
                        latest: unboxedreq.author,
                        feed: feed.slice(0, 5)
                      })
                      bog.box(latest, req.requester, key).then(boxed => {
                        var obj = {
                          requester: key.publicKey,
                          box: boxed
                        }
                        //console.log('sending latest ' + unboxedreq.author)
                        ws.send(JSON.stringify(obj))
                      })
                    }
 
                    var diff = JSON.stringify(
                      feed.slice(
                        endrange, 
                        baserange
                      )
                    )
                    bog.box(diff, req.requester, key).then(boxed => {
                      var obj = {
                        requester: key.publicKey,
                        box: boxed
                      }
                      ws.send(JSON.stringify(obj))
                      ws.close()
                    })
                  }  
                }) 
              } else {
                printNoFeed(unboxedreq, req)
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
            bog.open(unboxedreq[0]).then(msg => {
              if (msg.seq === unboxedreq.length) {
                fs.writeFile(bogdir + msg.author, JSON.stringify(unboxedreq), 'UTF-8', function (err, success) {
                  printNewFeed(msg, req)
                })
              } if (msg.seq > unboxedreq.length) {
                fs.readFile(bogdir + msg.author, 'UTF-8', function (err, data) {
                  var feed = JSON.parse(data)
                  bog.open(feed[0]).then(lastmsg => {
                    if (unboxedreq.length + lastmsg.seq === msg.seq) {
                      var newlog = unboxedreq.concat(feed)
                      fs.writeFile(bogdir + msg.author, JSON.stringify(newlog), 'UTF-8', function (err, success) {
                        printUpdateFeed(msg, req)
                      })
                    }
                    ws.close()
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


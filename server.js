var express = require('express')
var open = require('open')
var bog = require('./bog')

var PORT = 8089

var app = express()

var masterlog = []

bog.readBog().then(log => {
  masterlog = log
})

bog.keys().then(keys => {
  app.use(express.static('./'))
  app.use(function (req, res, next) {
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Connection', 'keep-alive')

    if (req.url === '/pubkey') {
      res.write(Date.now() + '\ndata:' + keys.publicKey + '\n\n')
    }

    if (req.url[1] === '@') {
      var pubkey = req.url.substring(1, 46)
      var boxed = req.url.substring(46)
      bog.unbox(boxed, pubkey, keys).then(unboxed => {
        if (unboxed[0] === '@') {
          console.log('CLIENT:' + unboxed)
          var feed = unboxed.substring(0, 45)
          var clientseq = unboxed.substring(45)
          bog.readBog(feed).then(log => {
            if (!log[0]) {
              var seq = 0
              var memo = feed + seq
              console.log('SERVER:' + memo)
              if (clientseq > seq) {
                bog.box(memo, pubkey, keys).then(nextboxed => {
                  res.write(Date.now() + '\ndata:' + keys.publicKey + nextboxed + '\n\n')
                  next()
                })
              } 
              if (seq > clientseq) {
                // send more feed to the client
                console.log('SEND MORE FEED TO CLIENT')
                var endrange = log.length - clientseq - 25
                if (endrange < 0) {
                  endrange = log.length - clientseq - 1
                }
                var baserange = log.length - clientseq
                var diff = JSON.stringify(log.slice(endrange, baserange))
                
                bog.box(diff, pubkey, keys).then(finalboxed => {
                  res.write(Date.now() + '\ndata:' + keys.publicKey + finalboxed + '\n\n') 
                  next()
                })
                
              } else { next() } 
            } else {
              bog.open(log[0]).then(opened => {
                var seq = opened.seq
                var memo = feed + seq
                console.log('SERVER:' + memo)
                if (clientseq > seq) {
                  bog.box(memo, pubkey, keys).then(nextboxed => {
                    res.write(Date.now() + '\ndata:' + keys.publicKey + nextboxed + '\n\n')
                    next()
                  })
                }

                if (seq > clientseq) {
                  // send more feed to the client
                  console.log('SEND MORE FEED TO CLIENT')
                  var endrange = log.length - clientseq - 25
                  if (endrange < 0) {
                    endrange = log.length - clientseq - 1
                  }
                  var baserange = log.length - clientseq
                  var diff = JSON.stringify(log.slice(endrange, baserange))
                  bog.box(diff, pubkey, keys).then(finalboxed => {
                    res.write(Date.now() + '\ndata:' + keys.publicKey + finalboxed + '\n\n')
                    next()
                  })
                }

                else {
                  bog.box('Thank you.', pubkey, keys).then(finalboxed => {
                    res.write(Date.now() + '\ndata:' + keys.publicKey + finalboxed + '\n\n')
                    next()
                  })
                }
              })
            }
          })
        }

        if (unboxed[0] === '[') {
          console.log('RECEIVED MORE FEED FROM THE CLIENT')
          var newfeed = JSON.parse(unboxed)
          console.log(newfeed)

          bog.open(newfeed[0]).then(msg => {
            bog.readBog(msg.author).then(feed => {
              if (!feed[0]) {
                bog.writeBog(msg.author, newfeed)
                for (var i = newfeed.length -1; i >= 0; --i) {
                  bog.open(newfeed[i]).then(opened => {
                    console.log('new msg from ' + opened.author)
                    masterlog.unshift(opened)
                    if (opened.seq === newfeed.length) {
                      bog.writeBog('log', masterlog)
                      next()
                    }
                  })
                }
              }

              if (feed[0]) {
                bog.open(feed[0]).then(lastmsg => {
                  if (newfeed.length + lastmsg.seq === msg.seq) {
                    var newlog = newfeed.concat(feed)
                    bog.writeBog(msg.author, newlog)
                    for (var i = newfeed.length -1; i >= 0; --i) {
                      bog.open(newfeed[i]).then(opened => {
                        console.log('new msg from ' + opened.author)
                        masterlog.unshift(opened)
                        if (newfeed.length + lastmsg.seq === opened.seq) {
                          bog.writeBog('log', masterlog)
                          next()
                        }
                      })
                    }
                  }
                })
              }
            })
          })
        }
      })
    }

    else {
      next()
    }

  })

  app.listen(PORT)
})


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
        console.log(unboxed)
      })
      res.write(Date.now() + '\ndata:' + 'got it\n\n' )
    }

    next()
  })

  
  app.listen(PORT)
  
})


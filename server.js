// static server (8089)

var http = require('http')
var serve = require('ecstatic')
var open = require('open')

http.createServer(
  serve({ root: __dirname})
).listen(8089)

open('http://localhost:8089')

// ws server (8080)

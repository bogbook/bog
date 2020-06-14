
var nacl = require('./lib/nacl.min.js')
    nacl.util = require('./lib/nacl-util.min.js')

var name = process.argv[2]

var keypair = 'blah'

while (keypair.substring(0, 2) != name) {
  var genkey = nacl.sign.keyPair()
  keypair = nacl.util.encodeBase64(genkey.publicKey) + nacl.util.encodeBase64(genkey.secretKey)
  console.log(keypair)
}



if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  var nacl = require('./lib/nacl.min.js')
  nacl.util = require('./lib/nacl-util.min.js')
  var sha256 = require('./lib/sha256.min.js')
}


const bog = {}

bog.generate = async function generatekey () {
  var keypair = '@/'
  while (keypair.includes('/')) {
    var genkey = nacl.sign.keyPair()
    keypair = nacl.util.encodeBase64(genkey.publicKey) + nacl.util.encodeBase64(genkey.secretKey)
  }
  return keypair
}

bog.keys = async function keys () {
  var keypair = await localforage.getItem('keypair')
  if (keypair === null) {
    var keypair = await bog.generate()
    localforage.setItem('keypair', keypair)
  }

  return keypair
}

bog.open = async function open (msg) {
  var hash = nacl.util.decodeBase64(msg.substring(0, 44))
  var pubkey = nacl.util.decodeBase64(msg.substring(44, 88))
  var sig = nacl.util.decodeBase64(msg.substring(88))
  var verify = nacl.util.encodeBase64(sha256.hash(sig))

  if (msg.substring(0, 44) === verify) {
    var open = nacl.sign.open(sig, pubkey)

    var obj = JSON.parse(nacl.util.encodeUTF8(open))
    obj.raw = msg
    return obj
  }
}

bog.publish = async function (obj, keys) {
  if (!obj.seq) { console.log('must provide sequence number!')}

  var pubkey = keys.substring(0, 44)
  var privatekey = nacl.util.decodeBase64(keys.substring(44))

  obj.author = pubkey,
  obj.timestamp = Date.now()

  var msg = nacl.util.decodeUTF8(JSON.stringify(obj))
  var sig = nacl.sign(msg, privatekey)
  var hash = sha256.hash(sig)
  var done = nacl.util.encodeBase64(hash) + pubkey + nacl.util.encodeBase64(sig)

  return done
}

if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  module.exports = bog 
}

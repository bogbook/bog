if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  var nacl = require('./lib/nacl.min.js')
  nacl.util = require('./lib/nacl-util.min.js')
  var sha256 = require('./lib/sha256.min.js')
  var fs = require('fs')
  var homedir = require('os').homedir()
  var ed2curve = require('ed2curve')
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

bog.keys = async function keys (appdir) {
  if (fs) {
    if (fs.existsSync(appdir + 'keypair')) {
      var keypair = await fs.promises.readFile(appdir + 'keypair', 'UTF-8')
    } else {
      var keypair = await bog.generate()
      fs.promises.writeFile(appdir + 'keypair', keypair, 'UTF-8')
    }
  } else {
    var oldpair = await localforage.getItem('keypair')
    var keypair = await kv.get('keypair')
    if ((keypair == null) || (keypair.length != 132)) {
      if (oldpair) {
        var keypair = oldpair
        kv.set('keypair', keypair)
        localforage.clear()
      } else {
        var keypair = await bog.generate()
      }
    }
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

bog.box = async function box (msg, recp, keys) {
  var receiver = ed2curve.convertPublicKey(nacl.util.decodeBase64(recp))
  var sender = ed2curve.convertPublicKey(nacl.util.decodeBase64(keys.substring(0, 44)))
  var privatekey = ed2curve.convertSecretKey(nacl.util.decodeBase64(keys.substring(44)))
  var nonce = nacl.randomBytes(nacl.box.nonceLength)
  var message = nacl.util.decodeUTF8(msg)
  var boxed = nacl.box(message, nonce, receiver, privatekey)
  var nonceMsg = new Uint8Array(sender.length + nonce.length + boxed.length)

  nonceMsg.set(sender)
  nonceMsg.set(nonce, sender.length)
  nonceMsg.set(boxed, sender.length + nonce.length)

  return nonceMsg
}

//bog.unbox -- decrypts a message sent to our pubkey
bog.unbox = async function unbox (boxed, keys) {
  var privatekey = ed2curve.convertSecretKey(nacl.util.decodeBase64(keys.substring(44)))

  var senderkey = boxed.slice(0, 32)
  var nonce = boxed.slice(32, 32 + 24)
  var msg = boxed.slice(32 + 24)
  var unboxed = nacl.box.open(msg, nonce, senderkey, privatekey)
  var message = nacl.util.encodeUTF8(unboxed)
  return message
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

bog.name = function (log, id) {
  if (log.length) {
    for (var i = log.length - 1; i >= 0; i--) {
      if ((log[i].author === id) && (log[i].name)) {
        return log[i].name
      }
      if (i === 0) {
        var name = id.substring(0, 10) + '...'
        return name
      }
    }
  } else {
    var name = id.substring(0, 10) + '...'
    return name
  }
}

if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  module.exports = bog 
}

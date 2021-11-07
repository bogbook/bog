import nacl from 'https://git.sr.ht/~ev/bogbook/blob/deno/nacl-fast-es.js'
import { decode, encode } from 'https://deno.land/std@0.97.0/encoding/base64.ts'
import { exists, ensureDir } from 'https://deno.land/std@0.97.0/fs/mod.ts'
import { createHash } from "https://deno.land/std@0.97.0/hash/mod.ts"
import { convertPublicKey, convertSecretKey } from 'https://git.sr.ht/~ev/bogbook/blob/deno/ed2curve.js'

export async function box (msg, recp, keys) {
  var receiver = convertPublicKey(decode(recp))
  var sender = convertPublicKey(decode(keys.substring(0, 44)))
  var privatekey = convertSecretKey(decode(keys.substring(44)))
  var nonce = nacl.randomBytes(nacl.box.nonceLength)
  var message = new TextEncoder().encode(msg)
  var boxed = nacl.box(message, nonce, receiver, privatekey)
  var nonceMsg = new Uint8Array(sender.length + nonce.length + boxed.length)
  
  nonceMsg.set(sender)
  nonceMsg.set(nonce, sender.length)
  nonceMsg.set(boxed, sender.length + nonce.length)

  return nonceMsg
}
 
export async function unbox (boxed, keys) {
  var privatekey = convertSecretKey(decode(keys.substring(44)))

  var senderkey = boxed.slice(0, 32)
  var nonce = boxed.slice(32, 32 + 24)
  var msg = boxed.slice(32 + 24)
  var unboxed = nacl.box.open(msg, nonce, senderkey, privatekey)
  var message = new TextDecoder().decode(unboxed)
  return message
}

export async function generate () {
  var keypair = '@/'
  while (keypair.includes('/')) {
    var genkey = nacl.sign.keyPair()
    keypair = encode(genkey.publicKey) + encode(genkey.secretKey)
  }
  return keypair
}

export async function keys (appdir) {
  var home = Deno.env.get("HOME")
  var path = home + '/.' + appdir

  ensureDir(path)

  if (await exists(path + '/keypair')) {
    var keypair = await Deno.readTextFile(path + '/keypair')
  } else {
    var keypair = await generate()
    Deno.writeTextFile(path + '/keypair', keypair)    
  }
  return keypair
}

export async function open (msg) {
  var hash = decode(msg.substring(0, 44))
  var pubkey = decode(msg.substring(44, 88))
  var sig = decode(msg.substring(88))

  var verifyhash = createHash("sha256")
  verifyhash.update(sig)

  if (msg.substring(0, 44) === encode(verifyhash.digest())) {
    var opened = nacl.sign.open(sig, pubkey)
    var message = JSON.parse(new TextDecoder().decode(opened))
    message.raw = msg
    return message 
  }
}

export async function publish (obj, keys) {
  var pubkey = keys.substring(0, 44)
  var privatekey = decode(keys.substring(44))

  obj.author = pubkey
  obj.timestamp = Date.now()

  var string = JSON.stringify(obj)
  var msg = new TextEncoder().encode(string)
  var sig = nacl.sign(msg, privatekey)
  var hash = createHash("sha256")
  hash.update(sig)

  var done = encode(hash.digest()) + pubkey + encode(sig)

  return done
}

import { sha256 } from "https://deno.land/x/sha256/mod.ts"
import * as base64 from "https://deno.land/x/base64/mod.ts"
import nacl from './lib/nacl-fast-es.js'

const news = {}
export default news

news.keys = async function () {
  const genkey = nacl.sign.keyPair()
  const keypair = base64.fromUint8Array(genkey.publicKey) + base64.fromUint8Array(genkey.secretKey)
  return keypair
}

news.open = async function (msg) {
  const hash = base64.toUint8Array(msg.substring(0, 44))
  const pubkey = base64.toUint8Array(msg.substring(44, 88))
  const sig = base64.toUint8Array(msg.substring(88))

  const decoder = new TextDecoder
  const opened = JSON.parse(decoder.decode(nacl.sign.open(sig, pubkey)))

  opened.raw = msg

  return opened
}

news.publish = async function (obj, keys) {
  const pubkey = keys.substring(0, 44)
  const privkey = base64.toUint8Array(keys.substring(44))

  obj.author = pubkey
  obj.timestamp = Date.now()

  const string = JSON.stringify(obj)
  const encoder = new TextEncoder
  const msg = encoder.encode(string)

  const sig = nacl.sign(msg, privkey)

  const hash = sha256(sig)

  const done = base64.fromUint8Array(hash) + pubkey + base64.fromUint8Array(sig)

  return done
}

import { sha256 } from "https://deno.land/x/sha256/mod.ts"
import * as base64 from "https://deno.land/x/base64/mod.ts"
import nacl from './lib/nacl-fast-es.js'

const bog = {}
export default bog

const appdir = Deno.dir('home') + '/.bogbookv2/'
Deno.mkdir(appdir).catch(err => {console.log(appdir + ' already exists')})

bog.generate = async function generatekey () {
  var keypair = '@/'
  while (keypair.includes('/')) {
    var genkey = nacl.sign.keyPair()
    keypair = base64.fromUint8Array(genkey.publicKey) + base64.fromUint8Array(genkey.secretKey)
  }
  return keypair
}

bog.keys = async function keys () {
  try {
    const keypair = await Deno.readTextFile(appdir + 'keypair')
    return keypair
  } catch {
    const keypair = await bog.generate()
    Deno.writeTextFile(appdir + 'keypair', keypair)
    return keypair
  }
}

bog.open = async function open (msg) {
  console.log(msg.substring(0, 44))
  const hash = base64.toUint8Array(msg.substring(0, 44))
  const pubkey = base64.toUint8Array(msg.substring(44, 88))
  const sig = base64.toUint8Array(msg.substring(88))
  const verify = base64.fromUint8Array(sha256(sig))

  if (msg.substring(0, 44) === verify) {
    const open = nacl.sign.open(sig, pubkey)

    const decoder = new TextDecoder
    const obj = JSON.parse(decoder.decode(open))
    obj.raw = msg
    return obj
  }
}


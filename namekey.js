// deno run --unstable namekey.js to generate a vanity pubkey

import nacl from './lib/nacl-fast-es.js'
import { decode, encode} from 'https://deno.land/std@0.97.0/encoding/base64.ts'

var name = Deno.args[0].substring(0, 2)
console.log('Trying to find a key that starts with ' + name)

var keypair = 'arbitrary'

while (keypair.substring(0, 2) != name) {
  var genkey = nacl.sign.keyPair()
  var base64 = encode(genkey.publicKey) + encode(genkey.secretKey)

  if (!base64.includes('/')) {
    keypair = base64
    console.log(keypair)
  }
}

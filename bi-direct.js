import { serve } from "https://deno.land/std@0.52.0/http/server.ts"
import {
  acceptWebSocket,
  connectWebSocket,
  isWebSocketCloseEvent,
} from 'https://deno.land/std@0.52.0/ws/mod.ts'

import news from './news.js'

const port = Deno.args[0] || '8080'

const dest = Deno.args[1] || 'http://127.0.0.1:8081'

const servers = [
  'ws://evbogue.com:8081',
] 

servers.push(dest)

const peers = new Map()

let peerId = 0

async function connect (server) {
  try {
    let ws = await connectWebSocket(server)
    console.log('connected to ' + server)
    ++peerId
    peers.set(peerId, ws)
  } catch (err) {
    console.error('unable to connect: ' + err)
  }
}

servers.forEach(server => {
  //console.log(server)
  connect(server)
})

for await (const req of serve(':' + port)) {
  const { conn, r: bufReader, w: bufWriter, headers } = req
  try {
    const ws = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    })
    console.log('connected to peer')
    ++peerId
    peers.set(peerId, ws)
    console.log(peers)
  } catch (err) {
    console.error(err)
    await req.respond({ status: 400 })
  }
}

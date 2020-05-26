import { serve } from "https://deno.land/std@0.52.0/http/server.ts"
import { acceptWebSocket, connectWebSocket, isWebSocketCloseEvent} from 'https://deno.land/std@0.52.0/ws/mod.ts'
import news from './news.js'

const port = Deno.args[0] || '8080'
const dest = 'ws://127.0.0.1:' + (Deno.args[1] || '8081')

const servers = [dest] 

const peers = new Map()

let peerId = 0

function sendsomething (ws) {
  news.keys().then(key => {
    console.log(key.substring(44))
    ws.send(key.substring(0, 44))
  })
}

async function connect (server) {
  console.log(server)
  try {
    let ws = await connectWebSocket(server)
    console.log('connected to ' + server)
    ++peerId
    peers.set(peerId, ws)
  } catch (err) {
    console.error('unable to connect: ' + err)
  }
}

servers.forEach(server => { connect(server) })

async function process (ws) {
  try {
    for await (const msg of ws) {
      if (typeof msg === "string") {
        console.log(msg)
      } else if (isWebSocketCloseEvent(msg)) {
        const { code, reason } = msg;
        console.log("ws:Close", code, reason)
      }
    }
  } catch (err) {
    console.error(err)
    if (!ws.isClosed) {
      await ws.close(1000).catch(console.error)
    }
  }
}

for await (const req of serve(':' + port)) {

  var timer = setInterval(function () {
    for (const peer in peers.values()) {
      console.log(peer)
      sendsomething(peer)
    }
  }, 1000)


  const { conn, r: bufReader, w: bufWriter, headers } = req
  try {
    const ws = await acceptWebSocket({conn, bufReader, bufWriter, headers})
    console.log('connected to peer')
    ++peerId
    peers.set(peerId, ws)
    process(ws)
  } catch (err) {
    console.error(err)
    await req.respond({ status: 400 })
  }
}

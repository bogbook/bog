import { connectWebSocket, isWebSocketCloseEvent} from 'https://deno.land/std@0.52.0/ws/mod.ts'

import news from './news.js'

const servers = ['ws://127.0.0.1:8081']

const feed = []

async function request (ws) {
  var obj = { author: '@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=' }
  if (feed.length) {obj.seq = feed.length} else {obj.seq = 0}

  await ws.send(JSON.stringify(obj))
}

async function process (ws) {
  try {
    for await (const msg of ws) {
      if (typeof msg === "string") {
        var obj = JSON.parse(msg)
        console.log(obj)
        feed.unshift(obj)
        request(ws)
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

async function connect (server) {
  try {
    const ws = await connectWebSocket(server)
    console.log('connected to ' + server)
    request(ws)
    process(ws)
  } catch (err) {
    console.error('unable to connect: ' + err)
  }
}

servers.forEach(server => {
  connect(server)
})


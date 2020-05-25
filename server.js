import { serve } from "https://deno.land/std@0.52.0/http/server.ts"
import { acceptWebSocket, isWebSocketCloseEvent, isWebSocketPingEvent} from "https://deno.land/std@0.52.0/ws/mod.ts"

const port = '8081'

const feed = JSON.parse(await Deno.readTextFile('@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0='))

console.log('http://localhost:' + port)

console.log(feed)

async function process (ws) {
  try {
    for await (const msg of ws) {
      if (typeof msg === "string") {
        var req = JSON.parse(msg)
        var response = feed[feed.length - req.seq - 1]
        console.log(feed.length)
        if (req.seq < feed.length) {
          console.log(response)
          ws.send(JSON.stringify(response))
        }
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

for await (const req of serve(`:${port}`)) {
  const { conn, r: bufReader, w: bufWriter, headers } = req
  try {
    const ws = await acceptWebSocket({conn, bufReader, bufWriter, headers})
    console.log("client connected!")
    process(ws)
  } catch (err) {
    console.error(err)
    await req.respond({ status: 400 })
  }
}

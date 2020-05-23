import { serve } from "https://deno.land/std@0.52.0/http/server.ts"
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std@0.52.0/ws/mod.ts"

const port = '8081'

console.log('http://localhost:' + port)

for await (const req of serve(`:${port}`)) {
  const { conn, r: bufReader, w: bufWriter, headers } = req;

  try {
    const ws = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    })

    console.log("client connected!")

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
  } catch (err) {
    console.error(err)
    await req.respond({ status: 400 })
  }
}

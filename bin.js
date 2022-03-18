import { serveDir } from "https://deno.land/std@0.129.0/http/file_server.ts"
import { servePub } from "./pub.js"
import { getConfig } from './denoutil.js'
import { green } from 'https://deno.land/std@0.129.0/fmt/colors.ts' 

const appdir = Deno.args[0] || 'denobog'

const config = await getConfig(appdir)

async function serveHttp (conn) {
  const httpConn = Deno.serveHttp(conn)
  for await (const e of httpConn) {
    if (e.request.url.endsWith('ws')) {
      servePub(e)
    } else {
      e.respondWith(serveDir(e.request, {fsRoot: './', showDirListing: true, quiet: true})).catch(() => {
        try {
          conn.close() // coverup for a bug in Deno's http module that errors on connection close
        } catch {}
      })
    }
  }
}

console.log(green('Bogbook listening on http://' + config.hostname + ':' + config.port + '/'))

for await (const conn of Deno.listen({hostname: config.hostname, port: config.port})) {
  serveHttp(conn)
}

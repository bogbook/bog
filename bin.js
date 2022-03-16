import { serveDir } from "https://deno.land/std@0.129.0/http/file_server.ts" // needs to be actual deno_std and upgrade the rest of the modules to the latest version
import { servePub } from "./pub.js"
import { getConfig } from './denoutil.js'
import { green } from 'https://deno.land/std@0.129.0/fmt/colors.ts' //ditto

const appdir = Deno.args[0] || 'denobog'

const config = await getConfig(appdir)

async function serveHttp (conn) {
  const httpConn = Deno.serveHttp(conn)
  for await (const e of httpConn) {
    if (e.request.url.endsWith('ws')) {
      servePub(e)
    } else {
      e.respondWith(serveDir(e.request, {fsRoot: './', showDirListing: true, quiet: true})) 
    }
  }
}

console.log(green('Bogbook listening on http://' + (config.url || 'localhost') + ':' + config.port + '/'))

for await (const conn of Deno.listen({port: config.port})) {
  serveHttp(conn)
}

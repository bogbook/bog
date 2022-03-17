import { serveDir } from "https://deno.land/std@0.129.0/http/file_server.ts"
import { servePub } from "./pub.js"
import { getConfig } from './denoutil.js'
import { green } from 'https://deno.land/std@0.129.0/fmt/colors.ts' 

const appdir = Deno.args[0] || 'denobog'

const config = await getConfig(appdir)

async function serveHttp (conn) {
  const httpConn = Deno.serveHttp(conn)
  for await (const e of httpConn) {
    // how to catch on this error
    //error: Uncaught (in promise) Http: connection closed before message completed
    //at Object.respondWith (deno:ext/http/01_http.js:211:21)
    // how to catch an error in await loop
    if (e.request.url.endsWith('ws')) {
      servePub(e)
    } else {
      e.respondWith(serveDir(e.request, {fsRoot: './', showDirListing: true, quiet: true})).catch(() => {
        try {
          conn.close();
        } catch {}
      })
    }
    
    /*if (e.request.url.endsWith('ws')) {
      servePub(e)
    } else {
      e.respondWith(serveDir(e.request, {fsRoot: './', showDirListing: true, quiet: true})) 
    }*/
  }
}

console.log(green('Bogbook listening on http://' + config.hostname + ':' + config.port + '/'))

try {
  for await (const conn of Deno.listen({hostname: config.hostname, port: config.port})) {
    serveHttp(conn)
  }
} catch (error) {}

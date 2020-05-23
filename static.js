import { serve } from 'https://deno.land/std@0.53.0/http/server.ts'
import marked from './lib/marked.ts'

const s = serve({ port: 8000 })
console.log("http://localhost:8000/")

var head = `
  <html>
    <head><title>bogbook v2</title>
    <style>body {font-family: sans-serif; width: 680px; margin-left: auto; margin-right: auto; background: #111; color: #f5f5f5;} pre, code {color: cyan} a {color: cyan}</style>
    </head>
    <body>
`

var foot = `</body></html>`

for await (const req of s) {
  var readme = await Deno.readTextFile('README.md')
  req.respond({ body: head + marked(readme) + foot })
}



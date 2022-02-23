import { keys, getConfig, unbox, box, publish, open, name } from './denoutil.js'

const appdir = Deno.args[0] || 'denobog'

const key = await keys(appdir)
const config = await getConfig(appdir)

console.log(config)

const server = Deno.listen({ port: config.port })

const sockets = new Set()

const feeds = []
const log = []

function processReq (req, ws, keys) {
  if (req.msg) {
    open(req.msg).then(opened => {
      if (feeds[opened.author]) {
        if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
          feeds[opened.author].unshift(req.msg)
          log.push(opened)
        var via = ''
        if (opened.author != ws.pubkey) {
            via = ' via ' + ws.pubkey 
        }
          console.log('post ' + opened.seq + ' from ' + name(log, opened.author) + ' ' + opened.author + via)
          var gossip = {feed: opened.author, seq: opened.seq}
          box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
            ws.send(boxed)
          })
        }
      } else {
        feeds[opened.author] = [req.msg]
        log.push(opened)
      var via = ''
      if (opened.author != ws.pubkey) {
          via = ' via ' + ws.pubkey
      }
        console.log('post ' + opened.seq + ' from ' + opened.author + via)
        var gossip = {feed: opened.author, seq: opened.seq}
        box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
          ws.send(boxed)
        })
      }
    })
  }
  else if (req.seq === -1) {
    if (feeds[req.feed]) {
      var latest = feeds[req.feed][0]
      var message = {permalink: latest}
      box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
        console.log('sent permalink ' + latest.substring(0, 44) + ' to ' +   ws.pubkey)
        ws.send(boxed)
      })
    } else {
      log.forEach(msg => {
        if (msg.raw.substring(0, 44) === req.feed) {
          var message = {permalink: msg.raw}
          box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
            console.log('sent permalink ' + msg.raw.substring(0, 44) + ' to ' + ws.pubkey)
            ws.send(boxed)
          })
        }
      })
    }
  }
  else if (req.seq || (req.seq === 0)) {
    if (!feeds[req.feed]) {
      var gossip = {feed: req.feed, seq: 0}
      box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
        ws.send(boxed)
      })
    }
    else if (feeds[req.feed]) {
      if (req.seq < feeds[req.feed].length) {
      if ((req.seq == 0) && feeds[req.feed].length) {
          console.log('sync ' + req.feed + ' to ' + ws.pubkey + ' at ' + new Date().toLocaleString())
        }
      if (req.seq == (feeds[req.feed].length - 1)) {
          console.log('done ' + req.feed + ' to ' + ws.pubkey + ' at ' + new Date().toLocaleString())
  
      }
        var resp = {}
        resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
        box(JSON.stringify(resp), ws.pubkey, keys).then(boxed => {
          ws.send(boxed)
        })
      }
      if (req.seq > [feeds[req.feed].length]){
        var gossip = {feed: req.feed, seq: feeds[req.feed].length}
        box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
          ws.send(boxed)
        })
      }
    }
  }
}

console.log(key.substring(0, 44))


async function serveHttp (conn) {
  const httpConn = Deno.serveHttp(conn)

  for await (const e of httpConn) {
    if (e.request.url.endsWith('ws')) {

      console.log('trying ws')
      const { socket, response } = Deno.upgradeWebSocket(e.request);
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        //socket.send("Hello World!")
      }
      socket.onmessage = (e) => {
        var msg = e.data
        if (msg[0] === '{') {
          var req = JSON.parse(msg)
          var resp = { pubkey: key.substring(0, 44), welcome: 'Hello World!' } 
          socket.pubkey = req.connected
          console.log(name(log, req.connected) + ' connected.')
          sockets.add(socket)
          var connected = ' are connected.'
          sockets.forEach(sock => {
            console.log(sock.pubkey)
            connected = '[' + name(log, sock.pubkey) + '](' + sock.pubkey + '), ' + connected
            resp.welcome = connected
          })
          
          box(JSON.stringify(resp), req.connected, key).then(boxed => {
            socket.send(boxed)
          })
        } else {
          unbox(new Uint8Array(msg), key).then(unboxed => {
            var req = JSON.parse(unboxed)
            processReq(req, socket, key)
          })
        } 
        //socket.close();
      }
      socket.onclose = function () { 
        sockets.delete(socket)
        console.log(socket.pubkey + " has disconnected")
      }
      socket.onerror = (e) => console.error("WebSocket error:", e)
      e.respondWith(response);
    } /*else {
      console.log('sending webpage')
      //e.respondWith(new Response(`Hello WOrld`))
      e.respondWith(new Response(html, {
        headers: new Headers({'Content-Type': 'text/html; charset=utf-8'}),
        body: html
      }))
      //return new Response(html, {headers})
    }*/
  }
}

for await ( const conn of server) {
  serveHttp(conn)
}



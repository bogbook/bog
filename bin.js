import { keys, getConfig, unbox, box, publish, open, name } from './denoutil.js'

const appdir = Deno.args[0] || 'denobog'

const key = await keys(appdir)
const config = await getConfig(appdir)

console.log(config)
console.log('Your public key is: ' + key.substring(0, 44))
console.log(config.url + ' started at http://' + config.url + ':' + config.port + '/')

const server = Deno.listen({ port: config.port })

const sockets = new Set()

const feeds = []
const log = []

function inviteFlow(req, ws, keys) {
  console.log(req.name + ' ' + req.pubkey + ' ' + req.email + ' wants to join ' + config.url + ' Why? ' + req.why)
  //console.log(req)
  if (config.fort) {
    console.log('FORTED, manually approve invite')
    var obj = {
      forted: config.url + '\'s owner will approve your invite soon and/or will reach out for more information, please be patient.'
    }
    box(JSON.stringify(obj), req.pubkey, keys).then(boxed => {
      ws.send(boxed)
    })
  } 
  if (!config.fort) {
    console.log('SENDING INVITE')
    var obj = {
      pubkey: key.substring(0, 44), 
      welcome: 'Congrats! You\'ve been invited to ' + config.url + '.'
    }
    box(JSON.stringify(obj), req.pubkey, keys).then(boxed => {
      ws.send(boxed)
    })
    config.allowed.push(req.pubkey)
    console.log(config)
  } 
}

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
          if (!config.allowed.includes(req.connected)) {
            socket.pubkey = req.connected
            console.log(req.connected + ' is not invited to this pub.')
            var resp = {url: config.url, denied: 'You need an invite to sync with ' + config.url + '. Please request an invite below:', returnkey: key.substring(0, 44)}
            box(JSON.stringify(resp), req.connected, key).then(boxed => {
              socket.send(boxed)
            })
            // socket.close()
          } else if (config.allowed.includes(req.connected)) {
            var resp = { pubkey: key.substring(0, 44), welcome: 'Hello World!' }
            socket.pubkey = req.connected
            console.log(name(log, req.connected) + ' ' + req.connected + ' connected.')
            sockets.add(socket)
            var connected = ' are connected.'
            sockets.forEach(sock => {
              connected = '[' + name(log, sock.pubkey) + '](' + sock.pubkey + '), ' + connected
              resp.welcome = connected
            })
            
            box(JSON.stringify(resp), req.connected, key).then(boxed => {
              socket.send(boxed)
            })
          } 
        } else {
          unbox(new Uint8Array(msg), key).then(unboxed => {
            var req = JSON.parse(unboxed)
            if (req.name) {
              inviteFlow(req, socket, key)
            } else {
              processReq(req, socket, key)
            }
          })
        } 
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

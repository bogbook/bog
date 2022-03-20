import { keys, unbox, box, publish, open, name, getConfig } from './denoutil.js'
import { ensureDir, exists } from 'https://deno.land/std@0.129.0/fs/mod.ts'
import { cyan, magenta, gray, red, green } from 'https://deno.land/std@0.129.0/fmt/colors.ts' 

const appdir = Deno.args[0] || 'denobog'

const key = await keys(appdir)
console.log('Your public key is: ' + cyan(key.substring(0, 44)))

const config = await getConfig(appdir)

const path = Deno.env.get("HOME") + '/.' + appdir + '/'

const sockets = new Set()

var log = []

if (await exists(path + 'log')) {
  log = JSON.parse(await Deno.readTextFile(path + 'log'))
} /*else {
  console.log('no log, empty array')
}*/

var feeds = []

var feedlist = []

if (ensureDir(path + 'bogs/')) {
  for await (const dirEntry of Deno.readDir(path + 'bogs/')) {
    console.log('Loading: ' + cyan(dirEntry.name))
    feedlist.push(dirEntry.name)
    feeds[dirEntry.name] = JSON.parse(await Deno.readTextFile(path + 'bogs/' + dirEntry.name))
  }
}

setTimeout(function () {
  // deletes logs that have been removed from bogs folder
  if (log.length) {
    console.log(red('Cleaning up log'))
    var newlog = log.filter(msg => feedlist.includes(msg.author))
    log = newlog
  }
}, 10000)

let newdata = false

setInterval(function () {
  if (newdata) {
    Deno.writeTextFile(path + 'log', JSON.stringify(log))
    Deno.writeTextFile(path + 'config.json', JSON.stringify(config))
    for (var key in feeds) {
      var value = feeds[key]
      Deno.writeTextFile(path + 'bogs/' + key, JSON.stringify(value))
    }
    newdata = false
  } else {
    //console.log('No new data')
  }
}, 10000)

function inviteFlow(req, ws, keys) {
  console.log(magenta(req.name) + ' ' + cyan(req.pubkey) + ' ' + magenta(req.email) + ' wants to join ' + config.hostname + ' Why? ' + magenta(req.why))

  //console.log(req)
  if (config.fort) {
    console.log(red('FORTED') + ', manually approve invite at ' + new Date().toLocaleString())
    var obj = {
      forted: config.hostname + '\'s owner will approve your invite soon and/or will reach out for more information, please be patient.'
    }
    box(JSON.stringify(obj), req.pubkey, keys).then(boxed => {
      ws.send(boxed)
    })
  }
  if (!config.fort) {
    console.log(green('Added ') + cyan(req.pubkey) + 'to allowed list at ' + new Date().toLocaleString())
    var obj = {
      hostname: config.hostname,
      pubkey: key.substring(0, 44),
      welcome: 'Congrats! You\'ve been invited to ' + config.hostname + '.'
    }
    box(JSON.stringify(obj), req.pubkey, keys).then(boxed => {
      ws.send(boxed)
    })
    config.allowed.push(req.pubkey)
    newdata = true
  }
}

function processReq (req, ws, keys) {
  if (req.msg) {
    open(req.msg).then(opened => {
      if (feeds[opened.author]) {
        if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
          feeds[opened.author].unshift(req.msg)
          log.push(opened)
          newdata = true
          var via = ''
          if (opened.author != ws.pubkey) {
            via = ' via ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey)
          }
          console.log('post ' + opened.seq + ' from ' + magenta(name(log, opened.author)) + ' ' + cyan(opened.author) + via)
          var gossip = {feed: opened.author, seq: opened.seq}
          box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
            ws.send(boxed)
          })
        }
      } else {
        feeds[opened.author] = [req.msg]
        log.push(opened)
        newdata = true
        var via = ''
        if (opened.author != ws.pubkey) {
          via = ' via ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey)
        }
        console.log('post ' + opened.seq + ' from ' + magenta(name(log, opened.author)) + ' ' + cyan(opened.author) + via)
        var gossip = {feed: opened.author, seq: opened.seq}
        box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
          ws.send(boxed)
        })
      }
    })
  }
  else if (req.seq === -1) {
    if (feeds[req.feed] && (req.feed.length == 44)) {
      var latest = feeds[req.feed][0]
      var message = {permalink: latest}
      box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
        console.log('sent permalink ' + cyan(latest.substring(0, 44)) + ' to ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey))
        ws.send(boxed)
      })
    } else {
      for (var key in feeds) {
        if (key.substring(0, req.feed.length) === req.feed) {
          var latest = feeds[key][0]
          var message = {permalink: latest}
          box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
            console.log('sent permalink ' + cyan(latest.substring(0, 44)) + ' to ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey))
            ws.send(boxed)
          })
        }
      }
      log.forEach(msg => {
        if (msg.raw.substring(0, req.feed.length) === req.feed) {
          var message = {permalink: msg.raw}
          box(JSON.stringify(message), ws.pubkey, keys).then(boxed => {
            console.log('sent permalink ' + cyan(msg.raw.substring(0, 44)) + ' to ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey))
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
          console.log('sync ' + magenta(name(log, req.feed)) + ' ' + cyan(req.feed) + ' to ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey) + ' at ' + new Date().toLocaleString())
        }
      if (req.seq == (feeds[req.feed].length - 1)) {
          console.log('done ' + magenta(name(log, req.feed)) + ' ' + cyan(req.feed) + ' to ' + magenta(name(log, ws.pubkey)) + ' ' + cyan(ws.pubkey) + ' at ' + new Date().toLocaleString())

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

export async function servePub (e) {
  const { socket, response } = Deno.upgradeWebSocket(e.request);
  socket.binaryType = 'arraybuffer'
  //socket.onopen = () => {
    //socket.send("Hello World!")
  //}
  socket.onmessage = (e) => {
    var msg = e.data
    if (msg[0] === '{') {
      var req = JSON.parse(msg)
      if (!config.allowed.includes(req.connected)) {
        socket.pubkey = req.connected
        console.log(cyan(req.connected) + ' is ' + red('not invited') + ' to this pub. ' +  green(' Invite prompt sent.'))
        var resp = {url: config.hostname, denied: 'You need an invite to sync with ' + config.hostname + '. Please request an invite below:', returnkey: key.substring(0, 44)}
        box(JSON.stringify(resp), req.connected, key).then(boxed => {
          socket.send(boxed)
        })
        // socket.close()
      } else if (config.allowed.includes(req.connected)) {
        var resp = { pubkey: key.substring(0, 44), welcome: config.welcome, hostname: config.hostname }
        socket.pubkey = req.connected
        console.log(magenta(name(log, req.connected)) + ' ' + cyan(req.connected) + ' connected.')
        sockets.add(socket)
        var connected = ''
        sockets.forEach(sock => {
          connected = ' [' + name(log, sock.pubkey) + '](' + sock.pubkey + ')' + connected
          resp.welcome = config.welcome + ' Peers:' + connected + '.'
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
    if (socket.pubkey) {
      var pubkey = socket.pubkey
      console.log(magenta(name(log, pubkey)), cyan(pubkey) + ' disconnected.')
    } else {
      console.log('someone disconnected')
    }
    sockets.delete(socket)
  }
  socket.onerror = (e) => console.error("WebSocket error:", e)
  e.respondWith(response)
  
}

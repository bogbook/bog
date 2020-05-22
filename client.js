import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
} from 'https://deno.land/std@0.52.0/ws/mod.ts'

import news from './news.js'

const servers = [
  'ws://127.0.0.1:8080',
  'ws://evbogue.com:8081'
]

let keypair

async function genkeys () {
  setInterval(function () {
    news.keys().then(key => {
      keypair = key
    })
  }, 2)
} 

async function connect (server) {
  try {
    const ws = await connectWebSocket(server)
    console.log('connected to ' + server)

    while (true) {
      console.log(keypair.substring(44))
      await ws.send(keypair.substring(0, 44))
    }

    if (!ws.isClosed) {
      await ws.close(1000).catch(console.error)
    }
  
  } catch (err) {
    console.error('unable to connect: ' + err)
  }
}

servers.forEach(server => {
  connect(server)
})

genkeys()


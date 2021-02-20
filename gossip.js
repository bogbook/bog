const peers = new Map()
var serverId = 0

function dispatch(msg, keys) {
  for (const peer of peers.values()) {
    bog.box(JSON.stringify(msg), peer.pubkey, keys).then(boxed => {
      peer.send(boxed)
    })
  }
}


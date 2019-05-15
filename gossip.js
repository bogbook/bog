function sync (src, keys) {
  var server = 'ws://localhost:8080/'

  var ws = new WebSocket(server + src)

  console.log('SYNCING')

  bog(src).then(srclog => {
    if (srclog) {
      open(srclog[0]).then(msg => {
        var req = {
          src,
          seq: msg.seq,
          requester: keys.publicKey
        }
        ws.onopen = function () {
          ws.send(JSON.stringify(req))
        }
        ws.onmessage = function (message) {
          var serverMsg = JSON.parse(message.data)
          if (msg.seq === serverMsg.seq) {
          } else if (msg.seq > serverMsg.seq) {
            var diff = msg.seq - serverMsg.seq
            var sendlog = srclog.slice(0, diff)
            var send = {
              src,
              log: sendlog,
              requester: keys.publicKey
            }
            ws.send(JSON.stringify(send))
          } else {
            if (serverMsg.log) {
              var newlog = serverMsg.log.concat(srclog)
              localforage.setItem(src, newlog).then(function () {regenerate()})
            }         
          }
        }
      })
    } else {
      var req = {
        src,
        seq: null,
        requester: keys.publicKey
      }

      ws.onopen = function () {
        ws.send(JSON.stringify(req))
      }
      ws.onmessage = function (message) {
        var serverMsg = JSON.parse(message.data)
        localforage.setItem(src, serverMsg.log).then(function () {regenerate()})
      }
    }
  })
}

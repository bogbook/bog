function sync (src, server, keys) {
  var ws = new WebSocket(server + src)

  console.log(server)
  console.log(src)
  console.log(keys.publicKey)
  
  bog(src).then(srclog => {
    if (srclog) {
      open(srclog[0]).then(msg => {
        var req = {
          src,
          seq: msg.seq,
          requester: keys.publicKey
        }
        console.log(req)
        ws.onopen = function () {
          ws.send(JSON.stringify(req))
        }
        ws.onmessage = function (message) {
          var serverMsg = JSON.parse(message.data)
          console.log(serverMsg)
          if (msg.seq === serverMsg.seq) {
            console.log('DO NOTHING')
          } else if (msg.seq > serverMsg.seq) {
            console.log('SENDING')
            var diff = msg.seq - serverMsg.seq
            console.log(diff)
            var sendlog = srclog.slice(0, diff)
            console.log(sendlog)
            var send = {
              src,
              log: sendlog,
              requester: keys.publicKey
            }
            console.log(send)
            ws.send(JSON.stringify(send))
          } else {
            if (serverMsg.log) {
              console.log('RECEIVING')
              var newlog = serverMsg.log.concat(srclog)
              console.log('NEWLOG')

              localforage.setItem(src, newlog).then(function () {regenerate()})

              console.log(newlog)
            }         
          }
        }
      })
    } else {
      console.log('NO LOG!')
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
function sync (subs, keys) {

  var wsServers

  localforage.getItem('pubs').then(function (servers) {
    if (servers) {
      console.log(servers)
      wsServers = servers
    } else {
      servers = ['ws://localhost:8080/', 'ws://evbogue.com/']
      localforage.setItem('pubs', servers)
      console.log(servers)
      wsServers = servers
    }
  }).then(function () {
    subs.forEach(function (sub) {
      wsServers.forEach(function (server) {
        console.log('SYNCING WITH: ' + server + ' to fetch ' + sub)
        var ws = new WebSocket(server + sub)

        bog(sub).then(srclog => {
          if (srclog) {
            open(srclog[0]).then(msg => {
              var req = {
                src: sub,
                seq: msg.seq
                //requester: keys.publicKey
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
                    src: sub,
                    log: sendlog
                    //requester: keys.publicKey
                  }
                  ws.send(JSON.stringify(send))
                } else {
                  if (serverMsg.log) {
                    var newlog = serverMsg.log.concat(srclog)
                    localforage.setItem(sub, newlog).then(function () {regenerate()})
                  }         
                }
              }
            })
          } else {
            var req = {
              src: sub,
              seq: null
              //requester: keys.publicKey
            }

            ws.onopen = function () {
              ws.send(JSON.stringify(req))
            }
            ws.onmessage = function (message) {
              var serverMsg = JSON.parse(message.data)
              localforage.setItem(sub, serverMsg.log).then(function () {regenerate()})
            }
          }
        })
      })
    })
  })
}

function sync (subs, keys) {

  var wsServers

  localforage.getItem('pubs').then(function (servers) {
    if (servers) {
      console.log(servers)
      wsServers = servers
    } else {
      servers = ['ws://localhost:8080/', 'ws://bogbook.com/']
      localforage.setItem('pubs', servers)
      console.log(servers)
      wsServers = servers
    }
  }).then(function () {
    subs.forEach(function (sub) {
      wsServers.forEach(function (server, index) {
        setTimeout(function () {
          console.log('SYNCING WITH: ' + server + ' to fetch ' + sub)
          var ws = new WebSocket(server + sub)

          bog(sub).then(srclog => {
            if (srclog) {
              open(srclog[0]).then(msg => {
                console.log(msg)
                var req = {
                  src: sub,
                  seq: msg.seq
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
                      var scroller = document.getElementById('scroller')
                      var logFromServer = JSON.parse(message.data)
                      newlog = logFromServer.log

                      bog().then(log => {
                        for (var i = newlog.length; i-- > 0; ) {
                          var pubkey = nacl.util.decodeBase64(newlog[i].author.substring(1))
                          var sig = nacl.util.decodeBase64(newlog[i].signature)
                          var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
                          log.unshift(opened)
                          opened.key = newlog[i].key
                          scroller.insertBefore(render(opened, keys), scroller.childNodes[2])

                          if (i === 0) {
                            console.log('saved log')
                            log.sort((a, b) => a.timestamp - b.timestamp)
                            localforage.setItem(sub, newlog.concat(srclog))
                            localforage.setItem('log', log.reverse()) 
                          }
                        }
                      }) 
                    }         
                  }
                }
              })
            } else if (srclog === null) {
              var req = {
                src: sub,
                seq: null
              }

              ws.onopen = function () {
                ws.send(JSON.stringify(req))
              }
              ws.onmessage = function (message) {
                var openedlog = []
                var scroller = document.getElementById('scroller')
                var logFromServer = JSON.parse(message.data)
                log = logFromServer.log

                localforage.setItem(sub, log)

                for (var i = log.length; i-- > 0; ) {
                  console.log(log[i])
                  var pubkey = nacl.util.decodeBase64(log[i].author.substring(1))
                  var sig = nacl.util.decodeBase64(log[i].signature)
                  var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
                  console.log(opened)
                  opened.key = log[i].key
                  openedlog.push(opened)
                  scroller.insertBefore(render(opened, keys), scroller.childNodes[2])
                }

                bog().then(log => {
                  var newlog = openedlog.concat(log)
                  newlog.sort((a, b) => a.timestamp - b.timestamp)
                  localforage.setItem('log', newlog.reverse())
                })

              }
            }
          })
        }, index * 100000)
      })
    })
  })
}

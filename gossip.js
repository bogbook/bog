function sync (subs, keys) {

  var wsServers

  localforage.getItem('pubs').then(function (servers) {
    if (servers) {
      console.log(servers)
      wsServers = servers
    } else {
      servers = ['ws://localhost:8080/~@OXJ7Ma1eu8HOEakF+TW9yk1k09FbOqUSyMVneXWdLaM=']
      localforage.setItem('pubs', servers)
      console.log(servers)
      wsServers = servers
    }
  }).then(function () {
    subs.forEach(function (sub) {
      wsServers.forEach(function (server, index) {
        setTimeout(function () {
          console.log('SYNCING WITH: ' + server + ' to fetch ' + sub)
          var split = server.split('~')
          var serverurl = split[0]
          var serverpub = split[1]
          var ws = new WebSocket(serverurl)

          bog(sub).then(srclog => {
            if (srclog) {
              open(srclog[0]).then(msg => {
                ws.onopen = function () {
                  var message = JSON.stringify(msg)
                  // if we have a log then send the latest log and see if we get anything back 
                  box(message, serverpub, keys).then(boxed => {
                    var obj = {
                      requester: keys.publicKey,
                      box: boxed
                    }
                    ws.send(JSON.stringify(obj))
                  })
                }
                ws.onmessage = function (message) {
                }
              })
            } else if (srclog === null) {
              ws.onopen = function () {
                console.log('NO LOG IN CLIENT')
              }
              ws.onmessage = function (message) {
              }
            }
          })
        }, index * 100000)
      })
    })
  })
}

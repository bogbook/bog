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
                  var req = JSON.parse(message.data) 
                  console.log(req)
                  unbox(req.box, req.requester, keys).then(unboxed => {
                    var nextreq = JSON.parse(nacl.util.encodeUTF8(unboxed))
                    console.log(nextreq)
                    if (nextreq.seq === 0) {
                      var feed = JSON.stringify(srclog)
                      box(feed, serverpub, keys).then(boxed => {
                        var obj = {
                          requester: keys.publicKey,
                          box: boxed
                        }
                        console.log('Sending entire log of ' + msg.author + ' to ' + serverpub)
                        console.log(obj)
                        ws.send(JSON.stringify(obj))
                      })
                    }
                  })        
                }
              })
            } else {
              console.log('NO LOG IN CLIENT')
              ws.onopen = function () {
                var reqwhole = JSON.stringify({author: sub, seq: 0})
                console.log(reqwhole)
                box(reqwhole, serverpub, keys).then(boxed => {
                  var obj = {
                    requester: keys.publicKey,
                    box: boxed
                  }
                  console.log(boxed)
                  ws.send(JSON.stringify(obj))
                })
              }
              ws.onmessage = function (message) {
                var req = JSON.parse(message.data) 
                console.log('received message from ' + req.requester)
                unbox(req.box, req.requester, keys).then(unboxed => {
                  var unboxedreq = JSON.parse(nacl.util.encodeUTF8(unboxed))
                  console.log(unboxedreq)
                  if (Array.isArray(unboxedreq)) {
                    open(unboxedreq[0]).then(msg => {
                      console.log(msg.seq)
                      localforage.getItem(msg.author).then(feed => {
                        if (!feed) {
                          localforage.setItem(msg.author, unboxedreq).then(success => { 
                            console.log('saved log of ' + msg.author + ' to localforage')
                          })
                          localforage.getItem('log').then(log => {
                            for (var i = unboxedreq.length -1; i >= 0; --i) {
                              console.log(i)
                              open(unboxedreq[i]).then(opened => {
                                log.unshift(opened)
                                var scroller = document.getElementById('scroller')
                                scroller.insertBefore(render(opened, keys), scroller.childNodes[2])
                                console.log(opened)
                                if (opened.seq === unboxedreq.length) { 
                                  localforage.setItem('log', log).then(success => {
                                    console.log('saved log with ' + opened.author  + ' prepended to localForage')       
                                  })
                                }
                              })
                            }
                          })
                        }
                      })
                    })
                  }
                })
              }
            }
          })
        }, index * 100000)
      })
    })
  })
}

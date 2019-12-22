function sync (subs, keys) {

  var wsServers

  localforage.getItem('securepubs').then(function (servers) {
    if (servers) {
      wsServers = servers
    } else {
      servers = ['ws://bogbook.com', 'ws://localhost:8080']
      var pubs = []
      servers.forEach(server => {
        var ws = new WebSocket(server)
        ws.onopen = function () {
          ws.send(JSON.stringify({requester: keys.publicKey, sendpub: true}))
        }
        ws.onmessage = function (message) {
          pubs.push(server + '/~' + message.data)
          localforage.setItem('securepubs', pubs)
        }
      })
      wsServers = pubs
    }
  }).then(function () {
    subs.forEach(function (sub, index) {
      setTimeout(function () {
        wsServers.forEach(function (server, index) {
          setTimeout(function () {
            //console.log('SYNCING WITH: ' + server + ' to fetch ' + sub)
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
                    unbox(req.box, req.requester, keys).then(unboxed => {
                      var unboxedreq = JSON.parse(nacl.util.encodeUTF8(unboxed))
                      if (unboxedreq.content) {
                        unboxedreq.signature = unboxedreq.content
                        renderAd(unboxedreq, keys)
                      }
                      if (unboxedreq.box) {
                        renderAd(unboxedreq, keys)
                      }
                      if (unboxedreq.seq === 0) {
                        var stringedfeed = JSON.stringify(srclog)
                        box(stringedfeed, serverpub, keys).then(boxed => {
                          var obj = {
                            requester: keys.publicKey,
                            box: boxed
                          }
                          //console.log('Sending entire log of ' + msg.author + ' to ' + serverpub)
                          ws.send(JSON.stringify(obj))
                        })
                      }
                      
                      if (unboxedreq.seq > msg.seq) {
                        //console.log('server feed is longer, requesting diff from server')
                        var reqdiff = JSON.stringify({author: unboxedreq.author, seq: msg.seq})
                        box(reqdiff, serverpub, keys).then(boxed => {
                          var obj = {
                            requester: keys.publicKey,
                            box: boxed
                          }
                          ws.send(JSON.stringify(obj))
                        })
                      }

                      if (unboxedreq.seq < msg.seq) { 
                        //console.log('server feed is shorter, sending diff to server')
                        var diff = JSON.stringify(srclog.slice(0, msg.seq - unboxedreq.seq))
                        box(diff, serverpub, keys).then(boxed => {
                          var obj = {
                            requester: keys.publicKey,
                            box: boxed
                          }
                          ws.send(JSON.stringify(obj))
                        })
                      }

                      if (Array.isArray(unboxedreq)) {
                        //console.log('received diff from server')
                        open(unboxedreq[0]).then(msg => {
                          localforage.getItem(msg.author).then(feed => {
                            open(feed[0]).then(lastmsg => {
                              if (unboxedreq.length + lastmsg.seq === msg.seq) {
                                var newlog = unboxedreq.concat(feed)
                                localforage.setItem(msg.author, newlog).then(success => {
                                  //console.log('combined existing feed of ' + msg.author + ' with diff and saved to client')
                                })
                                localforage.getItem('log').then(log => {
                                  if (!log) {
                                    var log = []
                                  }
                                  for (var i = unboxedreq.length -1; i >= 0; --i) {
                                    open(unboxedreq[i]).then(opened => {
                                      log.unshift(opened)
                                      var scroller = document.getElementById('scroller')
       
                                      var src = window.location.hash.substring(1)
                                      if ((src === sub) || (src === '')) {
                                        var scroller = document.getElementById('scroller')
                                        scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                                      }
                                      if (unboxedreq.length + lastmsg.seq === opened.seq) {
                                        log.sort((a, b) => a.timestamp - b.timestamp)
                                        var reversed = log.reverse()
                                        localforage.setItem('log', reversed).then(success => {
                                          //console.log('saved log with ' + opened.author  + ' prepended to localForage')
                                        })
                                      }
                                    })
                                  }
                                })
                              }
                            })
                          })
                        })
                        
                      }
 
                    })        
                  }
                })
              } else {
                //console.log('NO LOG IN CLIENT')
                ws.onopen = function () {
                  var reqwhole = JSON.stringify({author: sub, seq: 0})
                  box(reqwhole, serverpub, keys).then(boxed => {
                    var obj = {
                      requester: keys.publicKey,
                      box: boxed
                    }
                    ws.send(JSON.stringify(obj))
                  })
                }
                ws.onmessage = function (message) {
                  var req = JSON.parse(message.data) 
                  //console.log('received message from ' + req.requester)
                  unbox(req.box, req.requester, keys).then(unboxed => {
                    var unboxedreq = JSON.parse(nacl.util.encodeUTF8(unboxed))
                    if (Array.isArray(unboxedreq)) {
                      open(unboxedreq[0]).then(msg => {
                        localforage.getItem(msg.author).then(feed => {
                          if (!feed) {
                            localforage.setItem(msg.author, unboxedreq).then(success => { 
                              //console.log('saved log of ' + msg.author + ' to localforage')
                            })
                            localforage.getItem('log').then(log => {
                              if (!log) {
                                var log = []
                              } 
                              for (var i = unboxedreq.length -1; i >= 0; --i) {
                                open(unboxedreq[i]).then(opened => {
                                  log.unshift(opened)
                                  var src = window.location.hash.substring(1)
                                  if ((src === sub) || (src === '')) {
                                    var scroller = document.getElementById('scroller')
                                    scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                                  }
                                  if (opened.seq === unboxedreq.length) {
                                    log.sort((a, b) => a.timestamp - b.timestamp)
                                    var reversed = log.reverse() 
                                    localforage.setItem('log', reversed).then(success => {
                                      //console.log('saved log with ' + opened.author  + ' prepended to localForage')       
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
          }, index * 50000)
        })
      }, index * 20000)
    })
  })
}

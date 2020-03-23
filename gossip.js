function processreq (req, pubkey, connection, keys) {
  if (req.seq === 0 || req.seq) {
    bog(req.author).then(feed => {
      if (feed) {
        open(feed[0]).then(msg => {
          if (req.seq > msg.seq) {
            var reqdiff = JSON.stringify({author: req.author, seq: msg.seq})
            box(reqdiff, pubkey, keys).then(boxed => {
              connection.send(JSON.stringify({
                requester: keys.publicKey,
                box: boxed
              }))
            })
          }

          if (req.seq < msg.seq) {
            var endrange = feed.length - req.seq - 25
            if (endrange < 0) {
              endrange = feed.length - req.seq - 1
            }
            var baserange = feed.length - req.seq
            var diff = JSON.stringify(
              feed.slice(
                endrange,
                baserange)
              )
            box(diff, pubkey, keys).then(boxed => {
              connection.send(JSON.stringify({
                requester: keys.publicKey,
                box: boxed
              }))
            })
          }
        })
      }
    })
  }

  if (req.latest) {
    var latest
    latest = document.getElementById('latest')
    var src = window.location.hash.substring(1)
    if ((!latest) && (src == req.latest)) {
      latest = h('div', {id: 'latest'})
      latest.appendChild(h('div', {classList: 'message', innerHTML: marked('**Still syncing feed**. In the meantime, here are the latest five messages...')
      }))
      req.feed.forEach(post => {
        open(post).then(msg => {
          latest.appendChild(render(msg, keys))
        })
      })
      scroller.firstChild.appendChild(latest)

      var timer = setInterval(function () {
        localforage.getItem(req.latest).then(feed => {
          open(feed[0]).then(msg => {
            open(req.feed[0]).then(latestmsg => {
              src = window.location.hash.substring(1)
              if (msg.seq >= latestmsg.seq) {
                latest.parentNode.removeChild(latest)
                clearInterval(timer)
                //console.log('we are caught up, deleting latest div')
              } 
              if (src != req.latest) {
                clearInterval(timer)
                //console.log('we navigated away')
              }
            })
          })
        })
        //console.log('checking to see if we have caught up')
      }, 5000)
    }
  }

  if (Array.isArray(req)) {
    open(req[0]).then(msg => {
      localforage.getItem(msg.author).then(feed => {
        if (!feed) {
          localforage.setItem(msg.author, req)
          localforage.getItem('log').then(log => {
            if (!log) { var log = [] }
            for (var i = req.length -1; i >= 0; --i) {
              open(req[i]).then(opened => {
                log.unshift(opened)
                var src = window.location.hash.substring(1)
                if ((src === msg.author) || (src === '')) {
                  var scroller = document.getElementById('scroller')
                  scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                }
                if (opened.seq === req.length) {
                  localforage.setItem('log', log)
                }
              })
            }
          })
        } 
        if (feed) {
          open(feed[0]).then(lastmsg => {
            if (req.length + lastmsg.seq === msg.seq) {
              var newlog = req.concat(feed)
              localforage.setItem(msg.author, newlog)
              localforage.getItem('log').then(log => {
                if (!log) { var log = [] }
                for (var i = req.length -1; i >= 0; --i) {
                  open(req[i]).then(opened => {
                    log.unshift(opened)
                    var src = window.location.hash.substring(1)
                    if ((src === msg.author) || (src === '')) {
                      var scroller = document.getElementById('scroller')
                      scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                    }
                    if (req.length + lastmsg.seq === opened.seq) {
                      localforage.setItem('log', log)
                    }
                  })
                }
              })
            }
          })
        }
      })
    })
  }
}

function getpubkey (connection, keys) {
  connection.onopen = () => {
    connection.send(JSON.stringify({
      requester: keys.publicKey, sendpub: true
    }))
  }

  connection.onmessage = (m) => {
    localforage.setItem(m.origin, m.data)
  }
}

function getfeed (feed, pubkey, connection, keys) {
  bog(feed).then(log => {
    var logseq = 0
    connection.onopen = () => {
      if (log) {
        open(log[0]).then(msg => {
          var string = JSON.stringify(msg)
          box(string, pubkey, keys).then(boxed => {
            connection.send(JSON.stringify({
              requester: keys.publicKey,
              box: boxed
            }))
          })
          logseq = msg.seq
        })
      } else {
        var msg = {
          author: feed, 
          seq: logseq
        } 
        box(JSON.stringify(msg), pubkey, keys).then(boxed => {
          connection.send(JSON.stringify({
            requester: keys.publicKey,
            box: boxed
          }))
        })
      }
    }
    connection.onmessage = (m) => {
      var req = JSON.parse(m.data)
      unbox(req.box, req.requester, keys).then(unboxed => {
        var unboxedreq = JSON.parse(unboxed)
        processreq(unboxedreq, pubkey, connection, keys)
      })
    }
  })
}

function sync (feeds, keys) {
  var pubs
  localforage.getItem('pubs').then(pubs => {
    if (!pubs) {
      pubs = ['ws://' + location.hostname + ':8080', 'ws://bogbook.com']
      localforage.setItem('pubs', pubs)
    }
    pubs.forEach(function (pub, index) {
      setTimeout(function () {
        console.log(pub)
        var connection = new WebSocket(pub)
        localforage.getItem(pub).then(pubkey => {
          if (!pubkey) {
            getpubkey(connection, keys)
          }
          if (pubkey) {
            feeds.forEach(feed => {
              console.log(feeds)
              getfeed(feed, pubkey, connection, keys)
            })
          }
        })
      }, index * 5000)
    })
  })
}

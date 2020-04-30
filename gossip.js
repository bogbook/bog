function getfeed (feed, pub, keys) {
  function reqfeed (seq, log) {
    var memo = feed + seq
    console.log('CLIENT:' + memo)
    box(memo, pub.pubkey, keys).then(boxed => {
      var es = new EventSource(keys.publicKey + boxed) 
      es.addEventListener('message', (e) => {
        var pubkey = e.data.substring(0, 45)
        var reqboxed = e.data.substring(45)

        unbox(reqboxed, pubkey, keys).then(unboxed => {
          if (unboxed[0] === '@') {
            console.log('SERVER:' + unboxed)
            var reqpub = unboxed.substring(0, 45)
            var serverseq = unboxed.substring(45)
            if (serverseq < seq) {
              // send more feed to the server 
              console.log('SEND MORE FEED TO SERVER')
              var endrange = log.length - serverseq - 25
              if (endrange < 0) {
                endrange = log.length - serverseq - 1
              }
              var baserange = log.length - serverseq
              var diff = JSON.stringify(log.slice(endrange,baserange))
              box(diff, pub.pubkey, keys).then(nextboxed => {
                var newes = new EventSource(keys.publicKey + nextboxed)
                //newes.close()
              })
            }
            else {
              es.close()
            }
          } 

          if (unboxed[0] === '[') {
            console.log('RECEIVED MORE FEED FROM SERVER')
            var newfeed = JSON.parse(unboxed)
            console.log(newfeed)

            open(newfeed[0]).then(msg => {
              readBog(msg.author).then(feed => {
                if (!feed[0]) {
                  writeBog(msg.author, newfeed)
                  for (var i = newfeed.length -1; i >= 0; --i) {
                    open(newfeed[i]).then(opened => {
                      console.log('new msg from ' + opened.author)
                      masterlog.unshift(opened)
                      var src = window.location.hash.substring(1)
                      if ((src === msg.author) || (src === '')) {
                        var scroller = document.getElementById('scroller')
                        scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                      }

                      if (opened.seq === newfeed.length) {
                        writeBog('log', masterlog)
                        es.close()
                      }
                    })
                  }
                }

                if (feed[0]) {
                  open(feed[0]).then(lastmsg => {
                    if (newfeed.length + lastmsg.seq === msg.seq) {
                      var newlog = newfeed.concat(feed)
                      writeBog(msg.author, newlog)
                      for (var i = newfeed.length -1; i >= 0; --i) {
                        open(newfeed[i]).then(opened => {
                          console.log('new msg from ' + opened.author)
                          masterlog.unshift(opened)
                          var src = window.location.hash.substring(1)
                          if ((src === msg.author) || (src === '')) {
                            var scroller = document.getElementById('scroller')
                            scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                          }

                          if (newfeed.length + lastmsg.seq === opened.seq) {
                            writeBog('log', masterlog)
                            es.close()
                          }
                        })
                      }

                    }
                  })
                }
              })
              for (var i = newfeed.length -1; i >= 0; --i) {
                open(newfeed[i]).then(opened => {
                  console.log('new msg from ' + opened.author)
                  masterlog.unshift(opened)
                  var src = window.location.hash.substring(1)
                  if ((src === msg.author) || (src === '')) {
                    var scroller = document.getElementById('scroller')
                    scroller.insertBefore(render(opened, keys), scroller.childNodes[1])
                  }

                  if (opened.seq === newfeed.length) {
                    writeBog('log', masterlog)
                    es.close()
                  }
                })
              }
            })
          } else {es.close()}
        })
        es.close()
      })
    })
  }

  readBog(feed).then(log => {
    if (!log[0]) {
      var seq = 0
      reqfeed(seq, log)
    } else {
      open(log[0]).then(opened => {
        var seq = opened.seq
        reqfeed(seq, log)
      })
    } 
  })
}

function sync (feeds, keys) {
  readBog('isopubs').then(pubs => {
    if (!pubs[0]) {
      pubs = [
        {ws: 'ws://' + location.hostname + ':8080'}, 
        {ws: 'ws://bogbook.com'}
      ]
      writeBog('isopubs', pubs)
    }
    pubs.forEach(function (pub, index) {
      if (!pub.pubkey) {
        var es = new EventSource('/pubkey')
        es.addEventListener('message', (e) => {
          pubs[index].pubkey = e.data
          writeBog('isopubs', pubs)
          es.close()
        })
      } else {
        feeds.forEach(feed => {
          getfeed(feed, pub, keys)
        })
      }
    })
  })
}

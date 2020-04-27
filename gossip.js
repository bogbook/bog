function getfeed (feed, pub, keys) {
  readBog(feed).then(log => {

    console.log(log)
  })

  box(feed, pub.pubkey, keys).then(boxed => {
    var es = new EventSource(keys.publicKey + boxed) 
    es.addEventListener('message', (e) => {
      console.log(e.data)
      es.close()
    })
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

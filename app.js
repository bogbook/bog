async function loadfeeds () {
  let feeds
  feeds = await localforage.getItem('feeds')
  if (!feeds) {
    feeds = []
  } 
  return feeds
}

async function savefeeds (feeds) {
  try {
    await localforage.setItem('feeds', feeds)
  } catch {
    console.log('unable to save feeds')
  }
}

bog.keys().then(keys => {
  loadfeeds().then(feeds => {
  
    setInterval(function () {
      savefeeds(feeds)
    }, 10000)
  
    var ws = new WebSocket('ws://127.0.0.1:8081/ws')
    
    ws.onopen = () => {
      var gossip = {}
      gossip.feed = keys.substring(0, 44)
      if (feeds[gossip.feed]) {
        gossip.seq = feeds[gossip.feed].length
      } else {
        gossip.seq = 0
      }
      ws.send(JSON.stringify(gossip))
      console.log('ON OPEN')
      console.log(gossip)
    }
    
    ws.onmessage = (msg) => {
      var req = JSON.parse(msg.data)
      console.log(req)
      if (req.msg) {
        bog.open(req.msg).then(opened => {
          if (feeds[opened.author]) {
            if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
              feeds[opened.author].unshift(req.msg)

              var gossip = {feed: opened.author, seq: opened.seq}
              ws.send(JSON.stringify(gossip))
              document.body.insertBefore(h('div', [h('pre', [JSON.stringify(opened)])]), document.body.firstChild)
            }
          } else {
            feeds[opened.author] = [req.msg]
            var gossip = {feed: opened.author, seq: opened.seq}
            ws.send(JSON.stringify(gossip))
          }
        })
      }
      else if (req.seq || (req.seq === 0)) {
        if (!feeds[req.feed]) {
          console.log('we do not have it')
          ws.send(JSON.stringify({feed: req.feed, seq: 0}))
        }
        else if (feeds[req.feed]) {
          console.log('we have it')
          if (req.seq < feeds[req.feed].length) {
            var resp = {}
            resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
            ws.send(JSON.stringify(resp))
          }
          else if (req.seq > [feeds[req.feed].length]){
            var gossip = {feed: req.feed, seq: feeds[req.feed].length}
            ws.send(JSON.stringify(gossip))
          }
        } 
      }
      //document.body.insertBefore(h('div', [h('pre', [msg.data])]), document.body.firstChild)
      //feed.unshift(obj)
    }
    
    function createpost (obj, keys) {
      bog.publish(obj, keys).then(msg => {
        bog.open(msg).then(opened => {
          if (feeds[keys.substring(0, 44)]) {
            if (opened.previous === feeds[keys.substring(0, 44)[0].substring(0, 44)])
              console.log('insert ' + opened.seq + 'ed message')
              console.log(feeds)
              var gossip = {feed: opened.author, seq: opened.seq}
              ws.send(JSON.stringify(gossip))
              console.log(feeds[keys.substring(0, 44)].unshift(msg))
              document.body.insertBefore(h('div', [h('pre', [JSON.stringify(opened)])]), document.body.firstChild)
          }
          if (opened.seq === 1) {
            console.log('insert first message')
            console.log(feeds)
            feeds[keys.substring(0, 44)] = [msg]
            document.body.appendChild(h('div', [h('pre', [JSON.stringify(opened)])]))
          }
        })
      })
    }
    
    setInterval(function () {
      bog.generate().then(content => {
        
        obj = {text: content}
  
        if (feeds[keys.substring(0,44)]) {
          bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
            obj.seq = ++opened.seq
            obj.previous = opened.raw.substring(0,44)
            createpost(obj, keys)
          })
        } else {
          obj.seq = 1
          obj.previous = null
          createpost(obj, keys)
        }
      })
    }, 5000)  
  })
})


async function loadfeeds () {
  console.log('fetching feeds')
  let feeds
  feeds = await localforage.getItem('feeds')
  if (!feeds) {
    feeds = []
    console.log('creating a new feeds array')
  } 
  return feeds
}

async function savefeeds (feeds) {
  try {
    await localforage.setItem('feeds', feeds)
    console.log('saving feed')
  } catch {
    console.log('unable to save feeds')
    console.log(feeds)  
  }
}


bog.keys().then(keys => {
  loadfeeds().then(feeds => {
    console.log(keys)
    console.log(feeds)
  
    setInterval(function () {
      savefeeds(feeds)
    }, 10000)
  
    var ws = new WebSocket('ws://127.0.0.1:8081')
    
    function request (ws, feed) {
      var obj = { author: feed }
      if (feeds[feed].length) {obj.seq = feeds[feed.length]} else {obj.seq = 0}
       
      ws.send(JSON.stringify(obj))
    }
    
    ws.onopen = () => {
      request(ws, keys.substring(0, 44))
    }
    
    ws.onmessage = (msg) => {
      var obj = JSON.parse(msg.data)
      //document.body.insertBefore(h('div', [h('pre', [msg.data])]), document.body.firstChild)
      console.log(obj)
      //feed.unshift(obj)
      request(ws)
    }
    
    function createpost (obj, keys) {
      bog.publish(obj, keys).then(msg => {
        bog.open(msg).then(opened => {
          if (feeds[keys.substring(0, 44)]) {
            if (opened.previous === feeds[keys.substring(0, 44)[0].substring(0, 44)])
              console.log('insert ' + opened.seq + 'ed message')
              console.log(feeds)
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


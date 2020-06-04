async function loadfeeds () {
  let feeds
  feeds = await localforage.getItem('feeds')
  if (!feeds) {
    feeds = []
  } 
  return feeds
}

async function loadlog () {
  log = await localforage.getItem('log')
  return log
}

async function savefeeds (feeds, log) {
  try {
    await localforage.setItem('log', log)
    await localforage.setItem('feeds', feeds)
  } catch {
    console.log('unable to save feeds')
  }
}
   
const servers = ['ws://127.0.0.1:8081/ws', 'ws://evbogue.com:8081/ws']

const peers = new Map()
var serverId = 0

function dispatch(msg) {
  for (const peer of peers.values()) {
    peer.send(msg)
  }
}

async function regenerate (feeds) {
  var all = []
  Object.keys(feeds).forEach(function(key,index) {
    all = all.concat(feeds[key])
    console.log(key, index)
    if (Object.keys(feeds).length -1 === index) {
      console.log(all)
      var log = []
      all.forEach((msg, index) => {
        bog.open(msg).then(opened => {
          scroller.appendChild(h('div', [opened]))
          log.push(opened)
          if (index === all.length -1) {
            localforage.setItem('log', log)
          }
        })
      })
    }
  })
}

async function sort (log) {
  log.sort((a,b) => a.timestamp - b.timestamp)
  localforage.setItem('log', log)
}

bog.keys().then(keys => {
  var scroller = h('div')

  loadfeeds().then(feeds => {
    loadlog().then(log => {
    document.body.appendChild(composer(keys))
    sort(log)
    log.forEach(msg => {
      render(msg).then(rendered => {
        scroller.insertBefore(rendered, scroller.firstChild)
      })
      //document.body.insertBefore(h('div', [h('pre', [JSON.stringify(msg)])]), document.body.firstChild)
    })
    //regenerate(feeds)

  document.body.appendChild(scroller)
    setInterval(function () {
      savefeeds(feeds, log)
    }, 10000)
 
    servers.forEach(server => {
      var ws = new WebSocket(server)
      var id = ++serverId
      peers.set(id, ws)

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
                scroller.insertBefore(h('div', [h('pre', [JSON.stringify(opened)])]), scroller.firstChild)
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
      }
    })
    
        
    })
 
    function createpost (obj, keys) {
      bog.publish(obj, keys).then(msg => {
        bog.open(msg).then(opened => {
          if (feeds[keys.substring(0, 44)]) {
            if (opened.previous === feeds[keys.substring(0, 44)[0].substring(0, 44)])
              console.log('insert ' + opened.seq + 'ed message')
              console.log(feeds)
              var gossip = {feed: opened.author, seq: opened.seq}
              dispatch(JSON.stringify(gossip))
              console.log(feeds[keys.substring(0, 44)].unshift(msg))
              log.push(opened)
              savefeeds(feeds, log)
              render(opened).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
          }
          if (opened.seq === 1) {
            console.log('insert first message')
            console.log(feeds)
            feeds[keys.substring(0, 44)] = [msg]
            log.push(opened)
            savefeeds(feeds, log)
            render(opened).then(rendered => {
              scroller.insertBefore(rendered, scroller.firstChild)
            })
          }
        })
      })
    }
    
    /*setInterval(function () {
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
    }, 50)*/

    function composer () {
      var compose = h('div')
      var textarea = h('textarea', {placeholder: 'Write something'})
    
      var publish = h('button', {
        onclick: function () {
          obj = {text: textarea.value}
          textarea.value = ''
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
        }
      }, ['Publish'])
    
      compose.appendChild(textarea)
      compose.appendChild(publish) 
      return compose
    }

  })
})


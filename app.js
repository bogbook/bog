async function loadfeeds () {
  let feeds
  feeds = await localforage.getItem('feeds')
  if (!feeds) { feeds = [] } 
  return feeds
}

async function loadlog () {
  let log
  log = await localforage.getItem('log')
  if (!log) { log = []}
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
   
const servers = ['ws://v2.bogbook.com/ws', 'ws://localhost:8081/ws', 'ws://localhost:8082/ws']

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
  if (log[0]) {
    log.sort((a,b) => a.timestamp - b.timestamp)
    localforage.setItem('log', log)
  }
}

bog.keys().then(keys => {

  var screen = h('screen', {id: 'screen'})
  document.body.appendChild(screen)

  var navbar = h('div', [
    h('a', {href: '#'}, ['Home']),
    ' ',
    h('a', {href: '#' + keys.substring(0, 44)}, [keys.substring(0, 8) + '...']),
    ' ',
    h('a', {href: '#settings'}, ['Settings'])
  ])  

  loadfeeds().then(feeds => {
    loadlog().then(log => {
      function route () {

        var src = window.location.hash.substring(1)
        var scroller = h('div', {id: 'scroller'})
        var screen = document.getElementById('screen')


        screen.appendChild(navbar)
        screen.appendChild(composer(keys))
        screen.appendChild(scroller)

        if (src === '') {
          log.forEach(msg => {
            render(msg).then(rendered => {
              scroller.insertBefore(rendered, scroller.firstChild)
            })
          })
        }

        if (src === 'settings') {
          scroller.appendChild(h('p', ['This is your keypair, save it to use the same identity in the future.']))
          scroller.appendChild(h('p', [keys]))
          var input = h('textarea', {placeholder: 'Import your existing keypair. If you\'re importing a bogbook key, please concat (by hand) your pubkey/private keypairs before pasting below -- make sure to remove the @ sign.  It should look like the key above.'})
          scroller.appendChild(h('div', [
            input,
            h('button', {
              onclick: function () {
                if (input.value) {
                  localforage.setItem('keypair', input.value).then(function () {
                    location.reload()
                  })
                }
              }
            }, ['Import Ed25519 Keypair'])
          ]))
        }

        if (src[0] === '?') {
          log.forEach(msg => {
            if (msg.text && msg.text.includes(src.substring(1))) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            }
          })
        }

        if (src.length === 44) {
          var gossip = {feed: src}
          if (feeds[src]) {
            gossip.seq = feeds[src].length
          } else {
            gossip.seq = 0
          }
          console.log('syncing ' + src)
          dispatch(JSON.stringify(gossip))

          log.forEach(msg => {
            if ((msg.author === src) || (msg.raw.substring(0, 44) === src)) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            }
          })
        }
      }

      if (!window.location.hash) {
        window.location = '#'
      }

      window.onhashchange = function () {
        var oldscreen = document.getElementById('screen')
        var newscreen = h('div', {id: 'screen'})
        oldscreen.parentNode.replaceChild(newscreen, oldscreen)
        route()
      }

      sort(log)
      route()

      //regenerate(feeds)

      setInterval(function () {
        savefeeds(feeds, log)
      }, 10000)
 
      servers.forEach(server => {
        var ws = new WebSocket(server)

        ws.onopen = () => {
          var id = ++serverId
          peers.set(id, ws)
        }

        ws.onmessage = (msg) => {
          var req = JSON.parse(msg.data)
          console.log(req)
          if (req.msg) {
            bog.open(req.msg).then(opened => {
              if (feeds[opened.author]) {
                if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
                  feeds[opened.author].unshift(req.msg)
                  log.push(opened)
                  var gossip = {feed: opened.author, seq: opened.seq}
                  ws.send(JSON.stringify(gossip))
                  render(opened).then(rendered => {
                    scroller.insertBefore(rendered, scroller.firstChild)
                  })
                }
              } else {
                feeds[opened.author] = [req.msg]
                log.push(opened)
                var gossip = {feed: opened.author, seq: opened.seq}
                ws.send(JSON.stringify(gossip))
              }
            })
          }
          else if (req.seq || (req.seq === 0)) {
            if ((!feeds[req.feed]) && (req.seq != 0)) { 
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
              else if (req.seq > feeds[req.feed].length){
                var gossip = {feed: req.feed, seq: feeds[req.feed].length}
                ws.send(JSON.stringify(gossip))
              }
            } 
          }
        }
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
        var photoURL = {}

        var input = h('input', {id: 'input', type: 'file',
            onclick: function () {
              var canvas = document.getElementById("canvas")
              var ctx = canvas.getContext("2d")
              var input = document.getElementById('input')

              input.addEventListener('change', handleFile)

              function handleFile (e) {
                var img = new Image
                img.onload = function() {
                  canvas.width = 680 
                  canvas.height = 680
                  var scale = Math.max(canvas.width / img.width, canvas.height / img.height)
                  var x = (canvas.width / 2) - (img.width / 2) * scale;
                  var y = (canvas.height / 2) - (img.height / 2) * scale;
                  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                  photoURL.value = canvas.toDataURL('image/jpeg', 0.8)
                }

                img.src = URL.createObjectURL(e.target.files[0])
                input.value = ''
              }
            }
          })

        var newPhoto = h('span', [
          input,
          h('canvas', {id: 'canvas', width: '0', height: '0'})
        ])

        var filterList = [
          {name: '#nofilter', filter: null},
          {name: 'Thoreau', filter: 'thoreau'},
          {name: 'Melville', filter: 'melville'},
          {name: 'Hoover', filter: 'hoover'}
        ]

        var filter

        var filters = h('select')

        filterList.forEach(f => {
          filters.appendChild(h('option', {onclick: function () {
            var canvas = document.getElementById("canvas")
            canvas.classList = f.filter
            filter = f.filter
          }}, [f.name]))
        })

        var compose = h('div')
        var textarea = h('textarea', {placeholder: 'Write something'})
      
        var publish = h('button', {
          onclick: function () {
            if (textarea.value || photoURL.value) {
              var obj = {}
              if (textarea.value) {
                obj.text = textarea.value
                textarea.value = ''
              }
              if (photoURL.value) {
                obj.image = photoURL.value
                photoURL.value = ''
                canvas.width = 0
                canvas.height = 0
              }
              if (filter) {
                obj.filter = filter
              }
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
          }
        }, ['Publish'])
      
        compose.appendChild(textarea)
        compose.appendChild(newPhoto)
        compose.appendChild(filters)
        compose.appendChild(publish) 
        return compose
      }

    })
  })
})


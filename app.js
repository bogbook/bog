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

  loadfeeds().then(feeds => {
    loadlog().then(log => {

      var searchInput = h('input', {placeholder: '#bogbook'})
      var search = h('div', [
        searchInput,
        h('button', {
          onclick: function () {
            if (searchInput.value) {
              location.hash = '?' + searchInput.value
            }
          }
        }, ['Search'])
      ])

      var navbar = h('div', {classList: 'navbar'} ,[
        h('a', {href: '#'}, ['Home']),
        ' ',
        h('a', {href: '#' + keys.substring(0, 44)}, [keys.substring(0, 8) + '...']),
        ' ',
        h('a', {href: '#settings'}, ['Settings']),
        h('a', {classList: 'right', href: 'http://git.sr.ht/~ev/v2'}, ['Git']),
        h('span', {classList: 'right'}, [search])
        
      ])

      async function render (msg) {
        var renderer = new marked.Renderer()
        renderer.paragraph = function (paragraph) {
          var array = paragraph.split(' ')

          for (i = 0; i < array.length; i++) {
            word = array[i]
            if (word.startsWith('#')) {
              let end
              if ((word[word.length -1] === '.') || (word[word.length - 1] === ',') || (word[word.length -1] === ':')) {
                //console.log('and it ends with a ' + word[word.length - 1])
                end = word[word.length - 1]
                word = word.substring(0, word.length - 1)
              }
              var hashtag = "<a href='#?" + word + "'>" + word + "</a>"
              if (end) {
                hashtag = hashtag + end
              }
              //console.log(hashtag)
              array[i] = hashtag
            }
          }

          newgraph = array.join(' ')

          return newgraph + '<br /><br />'
        }
        renderer.link = function (href, title, text) {
          if ((href[0] == '@') || (href.length == 44)) {
            href = '#' + href
          }
          var link = marked.Renderer.prototype.link.call(this, href, title, text);
          return link
        }

        marked.setOptions({
          renderer: renderer
        })

        var messageDiv = h('div', {id: msg.raw.substring(0, 44)})

        var message = h('div', {classList: 'message'})

        messageDiv.appendChild(message)
      
        message.appendChild(h('span', {classList: 'right'}, [
          h('a', {href: '#' + msg.raw.substring(0, 44)}, [
            human(new Date(msg.timestamp))
          ])
        ]))
      
        message.appendChild(h('span', [
          h('a', {href: '#' + msg.author}, [
            msg.author.substring(0, 10)
          ])
        ]))
      
        if (msg.text) {
          message.appendChild(h('div', {classList: 'content', innerHTML: marked(msg.text)}))
        }
      
        if (msg.image) {
          var image = h('img', {src: msg.image})
          if (msg.filter) { image.classList = msg.filter}
          message.appendChild(image)
        }

        var reply = composer(keys, msg)
        var cancel = h('button', {
          onclick: function () {
            reply.parentNode.removeChild(reply)
            cancel.parentNode.removeChild(cancel)
          }
        }, ['Cancel'])

        message.appendChild(h('button', {
          onclick: function () {
            messageDiv.appendChild(reply)
            reply.appendChild(cancel)
          }
        }, ['Reply']))


        log.forEach(reply => {
          if (reply.text && reply.text.includes(msg.raw.substring(0, 44))) {
            setTimeout(function () {
              var messageExists = (document.getElementById(reply.raw.substring(0, 44)) !== null)
              console.log(messageExists)
              if (!messageExists) {
                render(reply).then(rendered => {
                  messageDiv.appendChild(h('div', {classList: 'reply'}, [rendered]))
                })
              }
            }, 50)
          }
        })
      
        return messageDiv
      }

      function route () {

        var src = window.location.hash.substring(1)
        var scroller = h('div', {id: 'scroller'})
        var screen = document.getElementById('screen')

        screen.appendChild(navbar)
        screen.appendChild(scroller)

        if (src === '') {
          screen.insertBefore(composer(keys), screen.childNodes[1])
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
          var search = src.substring(1).replace(/%20/g, ' ').toUpperCase()
            
          console.log(search)
          log.forEach(msg => {
            if (msg.text && msg.text.toUpperCase().includes(search)) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            }
          })
        }

        if (src.length === 44) {
          var shouldSync = true
          log.forEach(msg => {
            if (msg.author === src) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            } 
            if (msg.raw.substring(0, 44) === src) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
              shouldSync = false
              console.log('we have the post, turn off gossip')
            }
          })
          setTimeout(function () {
            if (shouldSync) {
              var gossip = {feed: src}
              if (feeds[src]) {
                gossip.seq = feeds[src].length
              } else {
                gossip.seq = 0
              }
              console.log('syncing ' + src)
              dispatch(JSON.stringify(gossip))
            }
          }, 500)
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
    
      function createpost (obj, keys, previous) {
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

      function composer (keys, msg) {
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
        
        if (msg) {
          var compose = h('div', {classList: 'message reply'})
        } else {
          var compose = h('div', {classList: 'message'})
        }

        var textarea = h('textarea', {placeholder: 'What are you doing right now?'})

        if (msg) {
          var replyContent = 're: ['+ msg.author.substring(0,8) +'...](' +msg.author +') [' + msg.raw.substring(0, 8) + '...](' + msg.raw.substring(0, 44) + ')\n\n'
          textarea.value = replyContent
        }

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
                  if (msg) {
                    createpost(obj, keys, msg)
                  } else {
                    createpost(obj, keys)
                  }
                })
              } else {
                obj.seq = 1
                obj.previous = null
                if (msg) {
                  createpost(obj, keys, msg)
                } else {
                  createpost(obj, keys)
                }
              }
              if (msg) {
                compose.parentNode.removeChild(compose)
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


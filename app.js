localforage.getItem('id').then(id => {
  if (id) {
    localforage.clear().then(function () {
      location.reload()
    })
  }
})

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

const peers = new Map()
var serverId = 0

function dispatch(msg, keys) {
  for (const peer of peers.values()) {
    bog.box(JSON.stringify(msg), peer.pubkey, keys).then(boxed => {
      peer.send(boxed)
    })
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
          //scroller.appendChild(h('div', [opened]))
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

  if (config.title) {
    document.title = config.title
  }

  var servers = ['ws://' + window.location.host + '/ws']
  var screen = h('screen', {id: 'screen'})
  document.body.appendChild(screen)


  loadfeeds().then(feeds => {
    loadlog().then(log => {
      //console.log(feeds)
      //console.log(log)

      //if (!log[0]) {
        setTimeout(function () {
          var gossip = {feed: config.author}
          if (feeds[config.author]) {
            gossip.seq = feeds[config.author].length
          } else {
            gossip.seq = 0
          }
          dispatch(gossip, keys)
        }, 1500)
      //}

      function getName (id) {
        var name = h('span')
        name.textContent = id.substring(0, 10) + '...'
        if (log) { 
          for (var i = log.length - 1 ; i > 0; i--) {
            if ((log[i].author === id) && (log[i].name)) {
              localforage.setItem('name:' + id, log[i].name)
              return name.textContent = log[i].name
            }
          }
        }
        return name
      }

      function getProfileImage (id) {

        var img = h('img')
        var avatar

        if (log) {
          for (var i = 0; i < log.length; i++) {
            if ((log[i].author === id) && (log[i].avatar)) {
              avatar = log[i].avatar
              log.forEach(msg => {
                if (msg.raw.includes(avatar)) {
                  img.classList = 'profileImage ' + msg.filter
                  return img.src = msg.image
                }
              })
            }
          }
        }
        return img
      }

      function getImage (id) {

        var img = h('img')
        var avatar
        
        if (log) {
          for (var i = 0; i < log.length; i++) {
            if ((log[i].author === id) && (log[i].avatar)) {
              avatar = log[i].avatar
              log.forEach(msg => {
                if (msg.raw.includes(avatar)) {
                  img.classList = 'avatar ' + msg.filter
                  return img.src = msg.image
                }
              })
            }
          }
        }
        return img 
      }

      var timer

      function start () {
        setInterval(function () {
          Object.keys(feeds).forEach(function(key,index) {
            var gossip = {feed: key}
            gossip.seq = feeds[key].length
            dispatch(gossip, keys)
          })
        }, 10000)
      }

      start()

      var searchInput = h('input', {id: 'searchInput', placeholder: config.searchterm})
      var searchButton = h('button', {
          id: 'searchButton',
          onclick: function () {
            if (searchInput.value) {
              location.hash = '?' + searchInput.value
            }
          }
        }, ['Search'])

      var search = h('div', {classList: 'right'}, [
        searchInput,
        searchButton
      ])

      searchInput.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
          searchButton.click()
        }
      })

      var navbar = h('div', {classList: 'navbar'}, [
        h('div', {classList: 'internal'}, [
          h('a', {href: '#' + keys.substring(0, 44)}, [getImage(keys.substring(0, 44)), getName(keys.substring(0, 44))]),
          ' ',
          h('code', [keys.substring(0, 7)]),
          ' ',
          h('a', {href: '#'}, ['Home']),
          ' ',
          h('a', {href: '#?' + keys.substring(0, 44)}, ['Mentions']),
          ' ',
          h('a', {href: '#key'}, ['Key']),
          search
        ])
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
                end = word[word.length - 1]
                word = word.substring(0, word.length - 1)
              }
              var hashtag = "<a href='#?" + word + "'>" + word + "</a>"
              if (end) {
                hashtag = hashtag + end
              }
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
          h('code', [msg.author.substring(0, 7)]),
          ' ',
          h('a', {href: '#' + msg.raw.substring(0, 44)}, [
            human(new Date(msg.timestamp))
          ])
        ]))
        
        message.appendChild(h('span', [
          h('a', {href: '#' + msg.author}, [
            getImage(msg.author),
            getName(msg.author)
          ])
        ]))
      
        if (msg.text) {
          message.appendChild(h('div', {classList: 'content', innerHTML: marked(msg.text)}))
          if (msg.author === keys.substring(0, 44)) {
            makeBio = h('button', {
              onclick: function (e) {
                e.preventDefault(),
                makeBio.parentNode.removeChild(makeBio)
                console.log(msg.raw.substring(0, 44))
                var obj = {bio: msg.raw.substring(0, 44)}
                console.log(obj)
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as bio'])
            message.appendChild(makeBio)
          }
        }
        if (msg.name) {
          message.appendChild(h('span', [' identified as ' + msg.name]))
        }
        if (msg.avatar) {
          message.appendChild(h('span', [' set profile photo as ', h('a', {href: '#' + msg.avatar}, [msg.avatar.substring(0, 7)])]))
        }
        if (msg.background) {
          message.appendChild(h('span', [' set background photo as ', h('a', {href: '#' + msg.background}, [msg.background.substring(0, 7)])]))
        }
        if (msg.bio) {
          message.appendChild(h('span', [' set bio as ', h('a', {href: '#' + msg.bio}, [msg.bio.substring(0, 7)])]))
        }

        if (msg.image) {
          var image = h('img', {
            src: msg.image,
            style: 'width: 175px; height: 175px; object-fit: cover;', 
            onclick: function () {
              console.log(image.classList)
              if (image.style.width === '100%') {
                image.style = 'width: 175px; height: 175px; object-fit: cover;'
              } else {
                image.style = 'width: 100%;'
              }
            }
          })
          var div = h('div', [image])
          if (msg.filter) { image.classList = msg.filter}
          message.appendChild(div)
          if (msg.author === keys.substring(0, 44)) {
            makeProfile = h('button', {
              onclick: function (e) {
                e.preventDefault(),
                makeProfile.parentNode.removeChild(makeProfile) 
                console.log(msg.raw.substring(0, 44))
                var obj = {avatar: msg.raw.substring(0, 44)}
                console.log(obj)
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as profile photo'])
            message.appendChild(makeProfile)
            makeBackground = h('button', {
              onclick: function (e) {
                e.preventDefault(),
                makeBackground.parentNode.removeChild(makeBackground)
                console.log(msg.raw.substring(0, 44))
                var obj = {background: msg.raw.substring(0, 44)}
                console.log(obj)
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as profile background'])
            message.appendChild(makeBackground)
          }
        }

        var reply = composer(keys, msg)
        var cancel = h('button', {
          onclick: function () {
            reply.parentNode.removeChild(reply)
            cancel.parentNode.removeChild(cancel)
          }
        }, ['Cancel'])
        if (!(msg.name || msg.avatar || msg.background || msg.bio)) {
          message.appendChild(h('button', {
            onclick: function () {
              messageDiv.appendChild(reply)
              reply.appendChild(cancel)
            }
          }, ['Reply']))
        }

        log.forEach(reply => {
          if (reply.text && reply.text.includes(msg.raw.substring(0, 44))) {
            setTimeout(function () {
              var messageExists = (document.getElementById(reply.raw.substring(0, 44)) !== null)
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

        document.body.appendChild(navbar)

        screen.appendChild(scroller)

        if (src === '') {
          scroller.insertBefore(composer(keys), scroller.childNodes[1])

          var index = 0

          async function addPosts (posts) {
            posts.forEach(msg => {
              render(msg).then(rendered => {
                scroller.appendChild(rendered, scroller.firstChild)
              })
            })
          }

          var reverse = log.slice().reverse()
          var posts = reverse.slice(index, index + 25)
          addPosts(posts).then(done => {
            index = index + 25
            window.onscroll = function (ev) {
              if (((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 1000) && src === '') {
                posts = reverse.slice(index, index + 25)
                index = index + 25
                addPosts(posts)
                console.log("Bottom of page")
              }
            }
          })
        }

        if ((src === 'key') || (src === 'pubs')) {
          var keypair = h('div', {classList: 'message'})
          keypair.appendChild(h('span', ['This is your keypair. Save your keypair to use the same identity in the future.']))
          keypair.appendChild(h('pre', [keys]))
          var input = h('textarea', {placeholder: 'Import your existing keypair here. If you\'re unable to save, your keypair is not valid.'})
          keypair.appendChild(h('div', [
            input,
            h('button', {
              onclick: function () {
                if (input.value && (input.value.length == 132)) {
                  localforage.setItem('keypair', input.value).then(function () {
                    location.reload()
                  })
                }
              }
            }, ['Import Ed25519 Keypair']),
            h('button', {onclick: function () {
              localforage.removeItem('keypair').then(function () {
                location.reload()
              })
            }}, ['Delete Keypair'])
          ]))

          scroller.appendChild(keypair)

          var pubs = h('div', {classList: 'message'})

          pubs.appendChild(h('span', ['These are your pubs. Add more pubs to replicate with multiple servers.']))

          var add = h('input', {placeholder: 'Add a pub. Ex: ws://bogbook.com/ws'})

          //localforage.getItem('servers').then(servers => {
          pubs.appendChild(h('div', [
            add,
            h('button', {
              onclick: function () {
                if (add.value) {
                  servers.push(add.value)
                  localforage.setItem('servers', servers).then(function () { 
                    location.hash = '' 
                    location.reload()
                  })
                }
              }
            }, ['Add a pub'])
          ]))
          servers.forEach(function (pub) {
            pubs.appendChild(h('p', [
              pub,
              h('button', {
                onclick: function () {
                  var newServers = servers.filter(item => item !== pub)
                  localforage.setItem('servers', newServers).then(function () { 
                    location.hash = '' 
                    location.reload()
                  })
                }
              }, ['Remove'])
            ]))
          })
          pubs.appendChild(h('button', {
            onclick: function () {
              localforage.removeItem('servers').then(function () {
                location.hash = ''
                location.reload()
              })
            }
          }, ['Reset pubs']))
          //})

          scroller.appendChild(pubs)

          var deleteeverything = h('div', {classList: 'message'})

          deleteeverything.appendChild(h('div', ['To delete everything, click the button below. This will delete your keypair and the feeds you have replicated into your browser. You will start from scratch with a new keypair.']))

          deleteeverything.appendChild(h('button', {onclick: function () {
            localforage.clear().then(function () {
              location.hash = ''
              location.reload()
            })
          }}, ['Delete Everything']))

          scroller.appendChild(deleteeverything)

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
          if (log) {
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
          }
          setTimeout(function () {
            if (shouldSync) {
              var profile = h('div', {classList: 'profile'})
              scroller.insertBefore(profile, scroller.firstChild)
              var banner = h('div', {classList: 'banner'})

              function getBg (src) {
                if (log) {
                  for (var i = 0; i < log.length; i++) {
                    if ((log[i].background) && (log[i].author === src)) {
                      log.forEach(msg => {
                        if (msg.raw.includes(log[i].background)) {
                          banner.classList = 'banner ' + msg.filter
                          banner.style.height = '300px'
                          return banner.style.background = 'fixed center 3.1em no-repeat url(' + msg.image + ')'
                        }
                      })
                    }
                  }
                }
              }

              function getBio (src) {
                var bio = h('div')
                if (log) {
                  for (var i = 0; i < log.length; i++) {
                    if ((log[i].bio) && (log[i].author === src)) {
                      log.forEach(msg => {
                        if (msg.raw.includes(log[i].bio)) {
                          bio.innerHTML = marked(msg.text)
                        }
                      })
                    }
                  }
                }
                return bio
              }

              var buttons = h('span')

              getBg(src)
              profile.appendChild(banner)
              profile.appendChild(h('div', {classList: 'inner-profile'}, [
                h('a', {href: '#' + src}, [
                  getProfileImage(src),
                  h('br'),
                  getName(src)
                ]),
                ' ',
                h('code', [src]),
                getBio(src),
                buttons
              ]))

              if (src === keys.substring(0, 44)) {
                var nameInput = h('input', {placeholder: 'Give yourself a name'})
                var name = h('div', [
                  nameInput,
                  h('button', { onclick: function () {
                    if (nameInput.value) {
                      var obj = {}
                      obj.name = nameInput.value
                      nameInput.value = ''    
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
                  }}, ['Identify'])
                ])

                buttons.appendChild(name)

              }
              var replyto = h('button', {
                onclick: function () {
                  var msg = {author: src}
                  profile.parentNode.insertBefore(composer(keys, msg), profile.parentNode.childNodes[1])
                }
              }, ['Compose'])

              buttons.appendChild(replyto)


              var deletefeed = h('button', {
                onclick: function () {
                  clearInterval(timer)
                  var newlog = log.filter(msg => msg.author != src)
                  delete feeds[src]
                  console.log(newlog)
                  console.log(feeds)
                  setTimeout(function () {
                    localforage.setItem('feeds', feeds)
                    window.location.hash = ''
                    localforage.setItem('log', newlog).then(function () {
                      window.location.reload()
                    })
                  }, 200)
                }
              }, ['Delete Feed'])

              buttons.appendChild(deletefeed)

              var gossip = {feed: src}
              if (feeds[src]) {
                gossip.seq = feeds[src].length
              } else {
                gossip.seq = 0
              }
              console.log('syncing ' + src)
              dispatch(gossip, keys)
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
        console.log('saving feeds')
      }, 10000)
 
      localforage.getItem('servers').then(pubs => {
        if (pubs) { servers = pubs}
        /*if (!servers) {
          servers = ['ws://' + window.location.host + '/ws']
          localforage.setItem('servers', servers)
        }*/

        servers.forEach(server => {
          var ws = new WebSocket(server)

          var id = ++serverId
          ws.onopen = () => {
            ws.send(JSON.stringify({connected: keys.substring(0, 44)}))
          }

          ws.onmessage = (msg) => {
            ws.pubkey = msg.data.substring(0, 44)
            peers.set(id, ws)

            bog.unbox(msg.data, keys).then(unboxed => {
              var req = JSON.parse(unboxed)
              console.log(req)
              if (req.permalink) {
                console.log('IT IS A MESSAGE!')
                bog.open(req.permalink).then(opened => {
                  console.log(opened)
                  if (window.location.hash.substring(1) === opened.raw.substring(0, 44)) {
                    render(opened).then(rendered => {
                      scroller.appendChild(rendered)
                    }) 
                  }
                })
              }
              if (req.welcome && (window.location.hash.substring(1) === '')) {
                var connections = ' along with ' + (req.connected - 1) + ' peers.'
                if (req.connected === 2) {
                  var connections = ' along with one peer.'
                }
                if (req.connected === 1) {
                  connections = ''
                }
                var welcome = h('div', {classList: 'message'}, [
                  h('div', {innerHTML: marked(
                    'Connected to [' + req.url + '](http://' + req.url + ')' + connections + '\n\n' +
                    req.welcome
                  )})
                ])
                scroller.insertBefore(welcome, scroller.childNodes[1])
              }
              if (req.msg) {
                bog.open(req.msg).then(opened => {
                  if (feeds[opened.author]) {
                    if (feeds[opened.author][0].substring(0, 44) === opened.previous) {
                      feeds[opened.author].unshift(req.msg)
                      log.push(opened)
                      var gossip = {feed: opened.author, seq: opened.seq}
                      bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                        ws.send(boxed)
                      })
                      if ((window.location.hash.substring(1) == opened.author) || (window.location.hash.substring(1) == '')) {
                        render(opened).then(rendered => {
                          scroller.insertBefore(rendered, scroller.childNodes[1])
                        })
                      }
                    }
                  } else {
                    feeds[opened.author] = [req.msg]
                    log.push(opened)
                    var gossip = {feed: opened.author, seq: opened.seq}
                    bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                      ws.send(boxed)
                    })
                    if ((window.location.hash.substring(1) == opened.author) || (window.location.hash.substring(1) == '')) {
                      render(opened).then(rendered => {
                        scroller.insertBefore(rendered, scroller.childNodes[1])
                      })
                    }
                  }
                })
              }

              else if (req.seq || (req.seq === 0)) {
                if ((!feeds[req.feed]) && (req.seq != 0)) { 
                  var gossip = {feed: req.feed, seq: 0}
                  bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                    ws.send(boxed)
                  })
                }
                else if (feeds[req.feed]) {
                  if (req.seq < feeds[req.feed].length) {
                    var resp = {}
                    resp.msg = feeds[req.feed][feeds[req.feed].length - req.seq - 1]
                    bog.box(JSON.stringify(resp), ws.pubkey, keys).then(boxed => {
                      ws.send(boxed)
                    })
                  }
                  else if (req.seq > feeds[req.feed].length){
                    var gossip = {feed: req.feed, seq: feeds[req.feed].length}
                    bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                      ws.send(boxed)
                    })
                  }
                } 
              }
            })
          }
        })
        
      })
    
      function createpost (obj, keys, compose) {
        bog.publish(obj, keys).then(msg => {
          bog.open(msg).then(opened => {
            if (feeds[keys.substring(0, 44)]) {
              console.log(opened)
              console.log(feeds[keys.substring(0,44)][0])
              if (opened.previous === feeds[keys.substring(0,44)][0].substring(0, 44)) {
                console.log('WE HAVE A MATCH')
                var gossip = {feed: opened.author, seq: opened.seq}
                dispatch(gossip, keys)
                //console.log(feeds[keys.substring(0, 44)].unshift(msg))
                feeds[keys.substring(0, 44)].unshift(msg)
                log.push(opened)
                savefeeds(feeds, log)
                render(opened).then(rendered => {
                  if (compose) {
                    compose.parentNode.replaceChild(h('div', {classList: 'reply'}, [rendered]), compose)
                  } else {
                    scroller.insertBefore(rendered, scroller.childNodes[1])
                  }
                })
              }
            }
            if (opened.seq === 1) {
              feeds[keys.substring(0, 44)] = [msg]
              log.push(opened)
              savefeeds(feeds, log)
              render(opened).then(rendered => {
                if (compose) {
                  compose.parentNode.replaceChild(h('div', {classList: 'reply'}, [rendered]), compose)
                } else {
                  scroller.insertBefore(rendered, scroller.firstChild)
                }
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

        if (msg) {
          if (msg.raw) {
            var canvasID = msg.raw.substring(0, 44)
          } else {
            var canvasID = msg.author
          }
        } else {
          var canvasID = "composer"
        }

        var autocrop = h('input', {type: 'checkbox', checked: true, name: 'autocrop'})

        var input = h('input', {id: 'input' + canvasID, type: 'file',
          onclick: function () {
            var canvas = document.getElementById("canvas" + canvasID)
            console.log(canvas)
            var ctx = canvas.getContext("2d")
            var input = document.getElementById('input' + canvasID)


            console.log(canvas.parentNode)
            if (!canvas.parentNode.childNodes[4]) {
              canvas.parentNode.appendChild(filters)
            }

            input.addEventListener('change', handleFile)

            function handleFile (e) {
              var img = new Image
              img.onload = function() {
                if (autocrop.checked === true) {
                  canvas.width = 680 
                  canvas.height = 680
                  var scale = Math.max(canvas.width / img.width, canvas.height / img.height)
                  var x = (canvas.width / 2) - (img.width / 2) * scale
                  var y = (canvas.height / 2) - (img.height / 2) * scale
                  ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
                } else {
                  var aspect = img.width/img.height
                  canvas.width = 680
                  canvas.height = canvas.width / aspect
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                }
                photoURL.value = canvas.toDataURL('image/jpeg', 0.8)
              }

              img.src = URL.createObjectURL(e.target.files[0])
              input.value = ''
            }
          }
        })

        var canvasEl = h('canvas', {id: "canvas" + canvasID, width: '0', height: '0'})

        var newPhoto = h('span', [
          input,
          autocrop,
          h('label', {for: 'autocrop'}, ['Auto-crop?']),
          canvasEl
        ])

        var filterList = [
          {name: '#nofilter', filter: null},
          {name: 'Thoreau', filter: 'thoreau'},
          {name: 'Melville', filter: 'melville'},
          {name: 'Hoover', filter: 'hoover'},
          {name: 'Yeats', filter: 'yeats'}
        ]

        var filter

        var filters = h('span')

        filterList.forEach(f => {
          filters.appendChild(h('a', {onclick: function () {
            console.log('FILTER')
            canvasEl.classList = f.filter
            filter = f.filter
          }}, [f.name]))
          filters.appendChild(h('span', [' ']))
        })
        
        if (msg) {
          var compose = h('div', {classList: 'message reply'})
        } else {
          var compose = h('div', {classList: 'message'})
        }

        var header = h('div', [
          h('span', {classList: 'right'}, [
            h('code', [keys.substring(0, 7)]),
            ' Preview'
          ]),
          h('a', {href: '#' + keys.substring(0, 44)}, [getImage(keys.substring(0, 44)), getName(keys.substring(0, 44))])
        ])
        var preview = h('div')

        var textarea = h('textarea', {placeholder: 'Write a message here.'})

        textarea.addEventListener('input', function (e) {
          preview.innerHTML = marked(textarea.value)
        })

        if (msg) {
          if (msg.raw) {
            var thread = '↳ [' + msg.raw.substring(0, 7) + '](' + msg.raw.substring(0, 44) + ')\n\n'
          } else {
            var thread = ''
          }
          textarea.value = thread
          localforage.getItem('name:' + msg.author).then(name => {
            if (name === null) {
              name = msg.author.substring(0, 10) + '...'
            }
            textarea.value = textarea.value + '[' + name + '](' + msg.author + ') '
          })
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
                canvasEl.width = 0
                canvasEl.height = 0
              }
              if (filter) {
                obj.filter = filter
              }
              var newpreview = h('div')
              
              preview.parentNode.replaceChild(newpreview, preview)
              preview = newpreview
              if (feeds[keys.substring(0,44)]) {
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  if (msg) {
                    createpost(obj, keys, compose)
                  } else {
                    createpost(obj, keys)
                  }
                })
              } else {
                obj.seq = 1
                obj.previous = null
                if (msg) {
                  createpost(obj, keys, compose)
                } else {
                  createpost(obj, keys)
                }
              }
            }
          }
        }, ['Publish'])
        compose.appendChild(header)
        compose.appendChild(preview)
        compose.appendChild(textarea)
        compose.appendChild(newPhoto)
        compose.appendChild(publish) 
        return compose
      }
    })
  })
})


var kv = new IdbKvStore('bogbook')

async function loadfeeds () {
  let feeds
  feeds = await kv.get('feeds')
  if (!feeds) { feeds = [] } 
  return feeds
}

async function loadlog () {
  let log
  log = await kv.get('log')
  if (!log) { log = []}
  return log
}

var delay = false

async function savefeeds (feeds, log) {
  try {
    await kv.set('log', log)
    await kv.set('feeds', feeds)
    //console.log('saving feeds')
  } catch {
    //console.log('unable to save feeds')
  }
}

function getName (id, log) {
  var name = h('span')
  name.textContent = id.substring(0, 10) + '...'
  if (log) { 
    for (var i = log.length - 1; i >= 0; i--) {
      if ((log[i].author === id) && (log[i].name)) {
        kv.set('name:' + id, log[i].name)
        return name.textContent = log[i].name
      }
    }
  }
  return name
}

function getProfileImage (id, log) {
  var img = h('img')
  var link = h('a', [
    img
  ])
  var avatar

  if (log) {
    for (var i = 0; i < log.length; i++) {
      if ((log[i].author === id) && (log[i].avatar)) {
        avatar = log[i].avatar
        log.forEach(msg => {
          if (msg.raw.includes(avatar)) {
            img.classList = 'profileImage ' + msg.filter
            img.src = msg.image
  	  link.href = '#' + msg.raw.substring(0, 44)
  	  return link
          }
        })
      }
    }
  }
  return link
}

function getImage (id, log) {
  var img = h('img')
  var avatar
  
  if (log) {
    for (var i = 0; i < log.length; i++) {
      if ((log[i].author === id) && (log[i].avatar)) {
        avatar = log[i].avatar
        log.forEach(msg => {
          if (msg.raw.includes(avatar)) {
  	  var image = {image: msg.image}
  	  if (msg.filter) {
  	    image.filter = msg.filter
  	  }
  	  cache[id] = image
            img.classList = 'avatar ' + msg.filter
            return img.src = msg.image
          }
        })
      }
    }
  }
  return img 
}

const peers = new Map()
var serverId = 0

function blast(msg, keys) {
  //console.log('ask all peers for ' + msg.feed)
  for (const peer of peers.values()) {
    bog.box(JSON.stringify(msg), peer.pubkey, keys).then(boxed => {
      peer.send(boxed)
    })
  }
}

function dispatch(msg, keys) {
  var peer = peers.get(Math.ceil(Math.random() * peers.size))
  if (peer) {
    //console.log('ask ' + peer.url + ' for ' + msg.feed)
    bog.box(JSON.stringify(msg), peer.pubkey, keys).then(boxed => {
      peer.send(boxed)
    })
  }
}

async function regenerate (feeds) {
  var all = []
  Object.keys(feeds).forEach(function(key,index) {
    all = all.concat(feeds[key])
    if (Object.keys(feeds).length -1 === index) {
      var log = []
      all.forEach((msg, index) => {
        bog.open(msg).then(opened => {
          //scroller.appendChild(h('div', [opened]))
          log.push(opened)
          if (index === all.length -1) {
            kv.set('log', log)
          }
        })
      })
    }
  })
}

async function sort (log) {
  if (log[0]) {
    log.sort((a,b) => a.timestamp - b.timestamp)
    kv.set('log', log)
  }
}

var cache = []
var feeds = []
var log = []

bog.keys().then(keys => {

  if (config.title) { document.title = config.title }

  var proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
  var servers = [proto + window.location.host + '/ws']
  var screen = h('screen', {id: 'screen'})
  document.body.appendChild(screen)

  loadfeeds().then(gotfeeds => {
    loadlog().then(gotlog => {
      feeds = gotfeeds
      log = gotlog

      if (!feeds[config.author]) {
        //console.log('gossip default log')
        setTimeout(function () {
          var gossip = {feed: config.author}
          if (feeds[config.author]) {
            gossip.seq = feeds[config.author].length
          } else {
            gossip.seq = 0
          }
          dispatch(gossip, keys)
        }, 5000)
      }
      if (!feeds[keys.substring(0, 44)]) {
        //console.log('gossip my feed')
        setTimeout(function () {
          var me = keys.substring(0, 44)
          var gossip = {feed: me}
          if (feeds[me]) {
            gossip.seq = feeds[me].length
          } else {
            gossip.seq = 0
          }
          dispatch(gossip, keys)
        }, 5000)
      }

      var timer

      function start () {
        timer = setInterval(function () {
          Object.keys(feeds).forEach(function(key,index) {
            var gossip = {feed: key}
            gossip.seq = feeds[key].length
            dispatch(gossip, keys)
          })
        }, 10000)
      }

      start()

      var searchInput = h('input', {
        id: 'searchInput', 
	placeholder: '🔍'
      })

      var searchButton = h('a', {
          href: '',
          id: 'searchButton',
          onclick: function (e) {
	    e.preventDefault()
            if (searchInput.value) {
              location.hash = '?' + searchInput.value
            }
          }
        }, [''])

      var search = h('div', {classList: 'right search'}, [
        searchInput,
        searchButton
      ])

      searchInput.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
          searchButton.click()
        }
      })

      var darktheme = h('link', {rel: 'stylesheet', href: './css/darktheme.css', type: 'text/css'})

      var bulbon = h('span', {classList: 'right', style: 'cursor:pointer;', innerHTML: '&#128261;', onclick: function () {
        document.head.appendChild(darktheme)
        bulbon.parentNode.replaceChild(bulboff, bulbon)
        kv.set('theme', 'dark')
      }})

      var bulboff = h('span', {classList: 'right', style: 'cursor:pointer;', innerHTML: '&#128262;', onclick: function () {
        darktheme.parentNode.removeChild(darktheme) 
        bulboff.parentNode.replaceChild(bulbon, bulboff)
        kv.set('theme', 'light')
      }})

      var navbar = h('div', {classList: 'navbar'}, [
        h('div', {classList: 'internal'}, [
          h('a', {href: '#' + keys.substring(0, 44)}, [getImage(keys.substring(0, 44), log), getName(keys.substring(0, 44), log)]),
          ' ',
          //h('code', [keys.substring(0, 7)]),
          //' ',
          h('a', {href: '#'}, ['🏦']),
          ' ',
          h('a', {href: '#?' + keys.substring(0, 44)}, ['Mentions']),
          ' ',
          h('a', {href: '#key'}, ['Key']),
	  h('a', {href: 'https://git.sr.ht/~ev/bogbook', classList: 'right', target: '_blank'}, ['💵']),
          bulbon,
          search
        ])
      ])

      kv.get('keypair').then(checkkey => {
        kv.get('name:' + keys.substring(0, 44)).then(checkname => {

        if (!checkkey || !checkname) {
	  navbar.id = 'full'
 
          var keypair = h('div')
          var input = h('textarea', {placeholder: 'Import your existing keypair here. If you\'re unable to save, your keypair is not valid.'})
          keypair.appendChild(h('div', [
            input,
            h('button', {
              onclick: function () {
	        if (input.value.length != keys.length) {
                  alert('Error: invalid keypair.')
		}
                if (input.value && (input.value.length == 132)) {
                  kv.set('keypair', input.value).then(function () {
                    location.reload()
                  })
                }
              }
            }, ['Import keypair']),
	    h('br'),
	    'Or, ',
	    h('a', {href: '', onclick: function (e) {
	      e.preventDefault()
              keypair.parentNode.replaceChild(name, keypair)
	    }}, ['generate a new keypair']),
	    '.'
          ]))
 
          var ts = Date.now()

          var nameInput = h('input', {placeholder: keys.substring(0, 10) + '...'})

	  var name = h('div', [
	    
	    h('span', {classList: 'right'}, [h('a', {href: ''}, [human(new Date(ts))])]),
	    h('span', [h('a', {href: ''}, [document.title])]),
            h('br'),
            h('p', ['Type a name into the box below and press "Join".']),
	    h('br'),
            nameInput,
            h('button', { onclick: function () {
	      if (nameInput.value.length == keys.length) {
                alert('Error: your name cannot be the same length as your keypair.')
	      }
              if (nameInput.value && (nameInput.value.length != keys.length)) {
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
		kv.set('keypair', keys)
		identify.parentNode.removeChild(identify)
		navbar.id = ''
              }
            }}, ['Join']),
	    h('br'),
	    'Or, ',
	    h('a', {href: '', onclick: function (e) {
	      e.preventDefault()
              name.parentNode.replaceChild(keypair, name)
	    }}, ['import an existing keypair']),
	    '.'
          ])
          
          var identify = h('div', {id: 'welcome', classList: 'message'}, [name])

          navbar.appendChild(identify)
	  } 
	  if (checkkey && checkname) { navbar.id = '' }
	})
      })

      kv.get('theme').then(theme => {
        if (theme === 'dark') {
          document.head.appendChild(darktheme)
          bulbon.parentNode.replaceChild(bulboff, bulbon)
        }
      })

      function route () {

        var src = window.location.hash.substring(1)
        var scroller = h('div', {id: 'scroller'})
        var screen = document.getElementById('screen')

        document.body.appendChild(navbar)

        screen.appendChild(scroller)

        if (src === '') {
          scroller.insertBefore(composer(keys), scroller.childNodes[1])

          var index = 0

          async function addPosts (posts, keys) {
            posts.forEach(msg => {
              render(msg, keys).then(rendered => {
                scroller.appendChild(rendered, scroller.firstChild)
              })
            })
          }

          var reverse = log.slice().reverse()
          var posts = reverse.slice(index, index + 25)
          addPosts(posts, keys).then(done => {
            index = index + 25
            window.onscroll = function (ev) {
              if (((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 1000) && src === '') {
                posts = reverse.slice(index, index + 25)
                index = index + 25
                addPosts(posts, keys)
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
	        if (input.value.length != keys.length) {
                  alert('Error: invalid keypair.')
		}
                if (input.value && (input.value.length == 132)) {
                  kv.set('keypair', input.value).then(function () {
                    location.reload()
                  })
                }
              }
            }, ['Import Ed25519 Keypair']),
            h('button', {onclick: function () {
              kv.remove('keypair').then(function () {
                location.reload()
              })
            }}, ['Delete Keypair'])
          ]))

          scroller.appendChild(keypair)

          var pubs = h('div', {classList: 'message'})

          pubs.appendChild(h('span', ['These are your pubs. Add more pubs to replicate with multiple servers.']))

          var add = h('input', {placeholder: 'Add a pub. Ex: ws://bogbook.com/ws'})

          pubs.appendChild(h('div', [
            add,
            h('button', {
              onclick: function () {
                if (add.value) {
                  servers.push(add.value)
                  kv.set('servers', servers).then(function () { 
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
                  kv.set('servers', newServers).then(function () { 
                    location.hash = '' 
                    location.reload()
                  })
                }
              }, ['Remove'])
            ]))
          })
          pubs.appendChild(h('button', {
            onclick: function () {
              kv.remove('servers').then(function () {
                location.hash = ''
                location.reload()
              })
            }
          }, ['Reset pubs']))

          scroller.appendChild(pubs)

          var deleteeverything = h('div', {classList: 'message'})

          deleteeverything.appendChild(h('div', ['To delete everything, click the button below. This will delete your keypair and the feeds you have replicated into your browser. You will start from scratch with a new keypair.']))

          deleteeverything.appendChild(h('button', {onclick: function () {
            kv.clear().then(function () {
              location.hash = ''
              location.reload()
            })
          }}, ['Delete Everything']))

          scroller.appendChild(deleteeverything)

        }

        if (src[0] === '?') {
          var search = src.substring(1).replace(/%20/g, ' ').toUpperCase()
          log.forEach(msg => {
            if (msg.text && msg.text.toUpperCase().includes(search)) {
              render(msg, keys).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            }
          })
        }

        if (src.length === 44) {
          if (feeds[src]) {
            var profile = h('div', {classList: 'profile'})
            scroller.appendChild(profile)
            var banner = h('div', {classList: 'banner'})

            function getBg (src) {
              if (log) {
                for (var i = 0; i < log.length; i++) {
                  if ((log[i].background) && (log[i].author === src)) {
                    log.forEach(msg => {
                      if (msg.raw.includes(log[i].background)) {
                        banner.classList = 'banner ' + msg.filter
                        banner.style.height = '300px'
                        return banner.style.background = 'fixed center 3em no-repeat url(' + msg.image + ')'
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
                        bio.innerHTML = '<span class="right"><a href="#' + msg.raw.substring(0, 44) + '">' + human(new Date(msg.timestamp)) + '</a></span>' + marked(msg.text)
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
                getProfileImage(src, log),
                h('br'),
                getName(src, log)
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

	          if (nameInput.value.length == keys.length) {
                    alert('Error: your name cannot be the same length as your keypair.')
	          }
                  if (nameInput.value && (nameInput.value.length != keys.length)) {
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
		kv.remove('name:' + src).then(function () {
                  delete feeds[src]
                  setTimeout(function () {
                    kv.set('feeds', feeds)
                    window.location.hash = ''
                    kv.set('log', newlog).then(function () {
                      window.location.reload()
                    })
                  }, 200)
		})
              }
            }, ['Delete Feed'])

            buttons.appendChild(deletefeed)

            var gossip = {feed: src}

            if (feeds[src]) {
              gossip.seq = feeds[src].length
              dispatch(gossip, keys)
            } else {
              gossip.seq = 0
              blast(gossip, keys)
            }

            var index = 0

            async function addMorePosts (posts, keys) {
              posts.forEach(msg => {
                if (msg.author === src) {
                  render(msg, keys).then(rendered => {
                    scroller.appendChild(rendered, scroller.firstChild)
                  })
                }
              })
            }

            var reverse = log.slice().reverse()
            var posts = reverse.slice(index, index + 25)
            addMorePosts(posts, keys).then(done => {
              index = index + 25
              window.onscroll = function (ev) {
                if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 1000) {
                  posts = reverse.slice(index, index + 25)
                  index = index + 25
                  addMorePosts(posts, keys)
                }
              }
            })
          } else {
            var haveit = false
            for (var i = 0; i < log.length; i++) {
              if (log[i].raw.substring(0, 44) === src) {
                haveit = true
                render(log[i], keys).then(rendered => {
                  scroller.insertBefore(rendered, scroller.firstChild)
                })
              }
              if ((i === (log.length - 1)) && !haveit) {
                var gossip = {feed: src, seq: 0}
                setTimeout(function () {
                  blast(gossip, keys)
                }, 1000)
              }
            }
          }
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
         if (delay) { 
           delay = false
           savefeeds(feeds, log)
           //console.log('saving feeds one last time')
         } 
         //if (!delay) { 
           //console.log('do not save feeds, there is nothing new')
         //}
      }, 10000)

      function connect (server) {
        var ws = new WebSocket(server)
        ws.binaryType = 'arraybuffer'

        var id = ++serverId

        ws.onopen = () => {
          ws.send(JSON.stringify({connected: keys.substring(0, 44)}))
        } 

        ws.onclose = (e) => {
          setTimeout(function () {
            //console.log('connection to ' + server + ' closed, reconnecting')
            connect(server)
          }, 1000)
        }
 
        var retryCount = 1

        ws.onerror = (err) => {
          var disconnected = h('div', {classList: 'message', id: 'unable:' + server, innerHTML: 'Unable to connect to <code> ' + server + '</code>.'})

          var unable = document.getElementById('unable:' + server)
          if (unable) {
            unable.parentNode.removeChild(unable)
          } 
          scroller.insertBefore(disconnected, scroller.childNodes[1])

          //console.log('unable to connect, closing connection to ' + server)
          setTimeout(function () {
            ws.close()
            retryCount++
          }, 1000 * retryCount)
        }

        ws.onmessage = (msg) => {
          //ws.pubkey = msg.data.substring(0, 44)
          //peers.set(id, ws)
          //console.log(msg.data)
          var data = new Uint8Array(msg.data)
          //console.log(data)
          bog.unbox(data, keys).then(unboxed => {
            //console.log(unboxed)
            var req = JSON.parse(unboxed)
            if (req.pubkey) {
              ws.pubkey = req.pubkey
              peers.set(id, ws)
            }
            if (req.permalink) {
              var nofeed = h('div', {id: 'nofeed', classList: 'message', innerHTML: 'You are not syncing <a href=#' + req.permalink.substring(44,88) + '>' + req.permalink.substring(44,54) + '</a>\'s feed. <a href=#' + req.permalink.substring(44,88) + '>Sync Now</a>.'
              })
              if (!document.getElementById('nofeed')) { 
                scroller.appendChild(nofeed)
              }
              if (!document.getElementById(req.permalink.substring(0, 44))) {
                bog.open(req.permalink).then(opened => {
                  if (window.location.hash.substring(1) === opened.raw.substring(0, 44)) {
                    render(opened, keys).then(rendered => {
                      scroller.appendChild(rendered)
                    }) 
                  }
                })
              }
            }
            if (req.denied) { 
              var denied = h('div', {classList: 'message'}, [
                h('div', {innerHTML: marked(req.denied)})
              ])
              scroller.insertBefore(denied, scroller.childNodes[1])
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
                  'You\'ve connected to [' + req.url + '](http://' + req.url + ').' + req.welcome
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
                    if (!delay) {
                      delay = true
                      savefeeds(feeds, log)
                    }
                    var gossip = {feed: opened.author, seq: opened.seq}
                    bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                      ws.send(boxed)
                    })
                    if ((window.location.hash.substring(1) == opened.author) || (window.location.hash.substring(1) == '')) {
                      render(opened, keys).then(rendered => {
                        scroller.insertBefore(rendered, scroller.childNodes[1])
                      })
                    }
                  }
                } else {
                  feeds[opened.author] = [req.msg]
                  log.push(opened)
                  if (!delay) {
                    delay = true
                    savefeeds(feeds, log)
                  }
                  var gossip = {feed: opened.author, seq: opened.seq}
                  bog.box(JSON.stringify(gossip), ws.pubkey, keys).then(boxed => {
                    ws.send(boxed)
                  })
                  if ((window.location.hash.substring(1) == opened.author) || (window.location.hash.substring(1) == '')) {
                    if (!scroller.firstChild) {
                      // quick fix if no profile can be generated yet
                      var div = h('div')
                      scroller.appendChild(div)
                    }
                    render(opened, keys).then(rendered => {
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
      }

      kv.get('servers').then(pubs => {
        if (pubs) { servers = pubs }
        servers.forEach(server => {
          connect(server)
        })
      })
    })
  })
})

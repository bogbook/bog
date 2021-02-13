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
    if (Object.keys(feeds).length -1 === index) {
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

var cache = []

bog.keys().then(keys => {

  if (config.title) {
    document.title = config.title
  }

  var servers = ['ws://' + window.location.host + '/ws']
  var screen = h('screen', {id: 'screen'})
  document.body.appendChild(screen)


  loadfeeds().then(feeds => {
    loadlog().then(log => {

      setTimeout(function () {
        var gossip = {feed: config.author}
        if (feeds[config.author]) {
          gossip.seq = feeds[config.author].length
        } else {
          gossip.seq = 0
        }
        dispatch(gossip, keys)
      }, 1500)

      setTimeout(function () {
        var me = keys.substring(0, 44)
        var gossip = {feed: me}
        if (feeds[me]) {
          gossip.seq = feeds[me].length
        } else {
          gossip.seq = 0
        }
        dispatch(gossip, keys)
      }, 1500)

      function getName (id) {
        var name = h('span')
        name.textContent = id.substring(0, 10) + '...'
        if (log) { 
          for (var i = log.length - 1; i >= 0; i--) {
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

      function getImage (id) {

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

      var darktheme = h('link', {rel: 'stylesheet', href: './css/darktheme.css', type: 'text/css'})

      var bulbon = h('span', {classList: 'right', style: 'cursor:pointer;', innerHTML: '&#128261;', onclick: function () {
        document.head.appendChild(darktheme)
        bulbon.parentNode.replaceChild(bulboff, bulbon)
        localforage.setItem('theme', 'dark')
      }})

      var bulboff = h('span', {classList: 'right', style: 'cursor:pointer;', innerHTML: '&#128262;', onclick: function () {
        darktheme.parentNode.removeChild(darktheme) 
        bulboff.parentNode.replaceChild(bulbon, bulboff)
        localforage.setItem('theme', 'light')
      }})

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
	  h('a', {href: 'https://git.sr.ht/~ev/bogbook', classList: 'right', target: '_blank'}, ['git']),
          bulbon,
          search
        ])
      ])

      localforage.getItem('keypair').then(checkkey => {
        localforage.getItem('name:' + keys.substring(0, 44)).then(checkname => {

        if (!checkkey || !checkname) {
	  navbar.id = 'full'
 
          var keypair = h('div')
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
            }, ['Import keypair']),
	    h('br'),
	    'Or, ',
	    h('a', {href: '', onclick: function (e) {
	      e.preventDefault()
              keypair.parentNode.replaceChild(name, keypair)
	    }}, ['choose a name.'])
          ]))

          var nameInput = h('input', {placeholder: keys.substring(0, 10) + '...'})
          var name = h('div', [
            h('span', [
	      'This is a new Ed25519 keypair',
	      h('sup', ['(', h('a', {href: 'https://ed25519.cr.yp.to/', target: '_blank'}, ['?']), ')']),
	      ', save a copy of it somewhere safe.']),
            h('pre', [keys]),
            h('button', {onclick: function () {
              localforage.removeItem('keypair').then(function () {
                location.reload()
              })
            }}, ['Regenerate']),
	    h('hr'),
	    'To begin, please choose a name:',
	    h('br'),
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
		localforage.setItem('keypair', keys)
		identify.parentNode.removeChild(identify)
		navbar.id = ''
              }
            }}, ['Publish']),
	    h('br'),
	    'Or, ',
	    h('a', {href: '', onclick: function (e) {
	      e.preventDefault()
              name.parentNode.replaceChild(keypair, name)
	    }}, ['Import an existing keypair'])
          ])
          var identify = h('div', {id: 'welcome', classList: 'message'},[
	    //'Hello! Welcome to ', 
	    //h('a', {href: location.href}, [config.title]),
	    //h('br'),
            name,
	  ])

          navbar.appendChild(identify)
	} 
	if (checkkey && checkname) {
	  navbar.id = ''
          //check for name -- if name then gossip
	}
	})
      })

      localforage.getItem('theme').then(theme => {
        if (theme === 'dark') {
          document.head.appendChild(darktheme)
          bulbon.parentNode.replaceChild(bulboff, bulbon)
        }
      })

      async function render (msg) {
        var renderer = new marked.Renderer()
        renderer.paragraph = function (paragraph) {
          var array = paragraph.split(' ')

          for (i = 0; i < array.length; i++) {
            word = array[i]
            if (word.startsWith('#')) {
              let end
              if ((word[word.length -1] === '.') || (word[word.length - 1] === ',') || (word[word.length -1] === ':') || (word[word.length -1] === '?')) {
                end = word[word.length - 1]
                word = word.substring(0, word.length - 1)
              }
	      var counter = 0
	      log.forEach(msg => {
	        var search = word.toUpperCase()
                if (msg.text && msg.text.toUpperCase().includes(search)) {
                //if (msg.text && msg.text.toUpperCase().split(" ").indexOf(search)!= -1) {
                  ++counter
		}
	      })
              var hashtag = "<a href='#?" + word + "'>" + word + "</a><sup>(" + counter + ")</sup>"
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
          if (href.length == 44) {
	    var image
	    if (cache[href]) {
              console.log(cache[href])
	      image = '<a href="#' + href +'"><img src="' + cache[href].image + '" class="avatar ' + cache[href].filter + '" /></a>'
              href = '#' + href
              var link = image + marked.Renderer.prototype.link.call(this, href, title, text);
              return link
	    } else {
              href = '#' + href
              var link = marked.Renderer.prototype.link.call(this, href, title, text);
              return link
	    }
          } else { 
            var link = marked.Renderer.prototype.link.call(this, href, title, text);
            return link
	  }
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

        var retractor = h('span', [
          h('button', {onclick: function () {
            retractor.parentNode.replaceChild(expander, retractor)
	  }},['-'])
	])

        var expander = h('button', {onclick: function () {
          expander.parentNode.replaceChild(retractor, expander)
	}}, ['+'])

        if (msg.text) {
          message.appendChild(h('div', {classList: 'content', innerHTML: marked(msg.text)}))
          if (msg.author === keys.substring(0, 44)) {
            makeBio = h('button', {
              onclick: function (e) {
                e.preventDefault(),
                makeBio.parentNode.removeChild(makeBio)
                var obj = {bio: msg.raw.substring(0, 44)}
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as bio'])
            retractor.appendChild(makeBio)
          }
        }
        if (msg.name) {
	  if (msg.author == keys.substring(0, 44)) {
            if (navbar.id) {navbar.id = ''}
	  }
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
            style: 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;',
            onclick: function () {
              if (image.style.width === '100%') {
                image.style = 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;'
              } else {
                image.style = 'width: 100%; cursor: pointer;'
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
                var obj = {avatar: msg.raw.substring(0, 44)}
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as profile photo'])
            retractor.appendChild(makeProfile)
            makeBackground = h('button', {
              onclick: function (e) {
                e.preventDefault(),
                makeBackground.parentNode.removeChild(makeBackground)
                var obj = {background: msg.raw.substring(0, 44)}
                bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
                  obj.seq = ++opened.seq
                  obj.previous = opened.raw.substring(0,44)
                  createpost(obj, keys)
                })
              }
            }, ['Set as profile background'])
            retractor.appendChild(makeBackground)
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
	  if (retractor.childNodes[1]) {
	    message.appendChild(expander)
	  }
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
          log.forEach(msg => {
            if (msg.text && msg.text.toUpperCase().includes(search)) {
              render(msg).then(rendered => {
                scroller.insertBefore(rendered, scroller.firstChild)
              })
            }
          })
        }

        if (src.length === 44) {
          if (src === keys.substring(0, 44)) {
	    console.log('this is you')
	    if (!feeds[src]) {
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
	      scroller.appendChild(h('div', {classList: 'profile'}, [
	        h('a', {href: keys.substring(0, 44)}, [keys.substring(0, 10) + '...']),
		name
              ]))
	    }
          }

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
		localforage.removeItem('name:' + src).then(function () {
                  delete feeds[src]
                  setTimeout(function () {
                    localforage.setItem('feeds', feeds)
                    window.location.hash = ''
                    localforage.setItem('log', newlog).then(function () {
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
            } else {
              gossip.seq = 0
            }

            dispatch(gossip, keys)

            var index = 0

            async function addMorePosts (posts) {
              posts.forEach(msg => {
                if (msg.author === src) {
                  render(msg).then(rendered => {
                    scroller.appendChild(rendered, scroller.firstChild)
                  })
                }
              })
            }

            var reverse = log.slice().reverse()
            var posts = reverse.slice(index, index + 25)
            addMorePosts(posts).then(done => {
              index = index + 25
              window.onscroll = function (ev) {
                if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 1000) {
                  posts = reverse.slice(index, index + 25)
                  index = index + 25
                  addMorePosts(posts)
                }
              }
            })
          } else {
            var haveit = false
            for (var i = 0; i < log.length; i++) {
              if (log[i].raw.substring(0, 44) === src) {
                haveit = true
                render(log[i]).then(rendered => {
                  scroller.insertBefore(rendered, scroller.firstChild)
                })
              }
              if ((i === (log.length - 1)) && !haveit) {
                var gossip = {feed: src, seq: 0}
                setTimeout(function () {
                  dispatch(gossip, keys)
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
        savefeeds(feeds, log)
      }, 10000)

      function connect (server) {
        var ws = new WebSocket(server)

        var id = ++serverId

        ws.onopen = () => {
          ws.send(JSON.stringify({connected: keys.substring(0, 44)}))
        } 

        ws.onclose = (e) => {
          setTimeout(function () {
            console.log('connection to ' + server + ' closed, reconnecting')
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

          console.log('unable to connect, closing connection to ' + server)
          setTimeout(function () {
            ws.close()
            retryCount++
          }, 1000 * retryCount)
        }

        ws.onmessage = (msg) => {
          ws.pubkey = msg.data.substring(0, 44)
          peers.set(id, ws)

          bog.unbox(msg.data, keys).then(unboxed => {
            var req = JSON.parse(unboxed)
            if (req.permalink) {
              var nofeed = h('div', {id: 'nofeed', classList: 'message', innerHTML: 'You are not syncing <a href=#' + req.permalink.substring(44,88) + '>' + req.permalink.substring(44,54) + '</a>\'s feed. <a href=#' + req.permalink.substring(44,88) + '>Sync Now</a>.'
              })
              if (!document.getElementById('nofeed')) { 
                scroller.appendChild(nofeed)
              }
              if (!document.getElementById(req.permalink.substring(0, 44))) {
                bog.open(req.permalink).then(opened => {
                  if (window.location.hash.substring(1) === opened.raw.substring(0, 44)) {
                    render(opened).then(rendered => {
                      scroller.appendChild(rendered)
                    }) 
                  }
                })
              }
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
                    if (!scroller.firstChild) {
                      // quick fix if no profile can be generated yet
                      var div = h('div')
                      scroller.appendChild(div)
                    }
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
      }

      localforage.getItem('servers').then(pubs => {
        if (pubs) { servers = pubs}

        servers.forEach(server => {
          connect(server)
        })
      })
    
      function createpost (obj, keys, compose) {
        bog.publish(obj, keys).then(msg => {
          bog.open(msg).then(opened => {
            if (feeds[keys.substring(0, 44)]) {
              if (opened.previous === feeds[keys.substring(0,44)][0].substring(0, 44)) {
                var gossip = {feed: opened.author, seq: opened.seq}
                dispatch(gossip, keys)
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
      
      function composer (keys, msg) {
        var photoURL = {}
        var croppedURL = {}
        var uncroppedURL = {}
        if (msg) {
          if (msg.raw) {
            var canvasID = msg.raw.substring(0, 44)
          } else {
            var canvasID = msg.author
          }
        } else {
          var canvasID = "composer"
        }

        var input = h('input', {id: 'input' + canvasID, type: 'file', style: 'display: none',
          onclick: function () {
            //var input = document.getElementById('input' + canvasID)
            input.addEventListener('change', handleFile)

            function handleFile (e) {
              var img = new Image
              img.onload = function() {

                var cropped = h('canvas', {width: 680, height: 680})
                var cctx = cropped.getContext('2d')
                var scale = Math.max(cropped.width / img.width, cropped.height / img.height)
                var x = (cropped.width / 2) - (img.width / 2) * scale
                var y = (cropped.height / 2) - (img.height / 2) * scale
                cctx.drawImage(img, x, y, img.width * scale, img.height * scale)
                croppedURL.value = cropped.toDataURL('image/jpeg', 0.8)

                var croppedImg = h('img', {
                  src: croppedURL.value,
                  style: 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;',
                  onclick: function () {
                    if (this.style.width === '100%') {
                      this.style = 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;'
                    } else {
                      this.style = 'width: 100%; cursor: pointer;'
                    }
                  }
                })

                photoDiv.appendChild(croppedImg)

                photoURL = croppedURL

                if (!(img.width === img.height)) {
                  var crop = true
                  var autocrop = h('div', [
                    h('button', { onclick: function () {
                      if (crop) { 
                        croppedImg.parentNode.replaceChild(uncroppedImg, croppedImg)
                        crop = false
                        photoURL = uncroppedURL
                        this.textContent = 'Crop'
                      } else {
                        uncroppedImg.parentNode.replaceChild(croppedImg, uncroppedImg)
                        photoURL = croppedURL
                        crop = true
                        this.textContent = 'Uncrop'
                      }
                    }}, ['Uncrop']),
                  ])

                  photoDiv.appendChild(autocrop)
                  
                  var aspect = img.width / img.height
                  var uncropped = h('canvas', {width: 680, height: 680 / aspect}) 
                  var uctx = uncropped.getContext('2d')
                  uctx.drawImage(img, 0, 0, uncropped.width, uncropped.height)
                  uncroppedURL.value = uncropped.toDataURL('image.jpeg', 0.8)
                  var uncroppedImg = h('img', {
                    src: uncroppedURL.value,
                    style: 'width: 175px; cursor: pointer;',
                    onclick: function () {
                      if (this.style.width === '100%') {
                        this.style = 'width: 175px; cursor: pointer;'
                      } else {
                        this.style = 'width: 100%; cursor: pointer;'
                      }
                    }
                  })
                } else { photoURL = croppedURL}
                img.src = ''
              }
              img.src = URL.createObjectURL(e.target.files[0])
              input.value = ''
            }

            var buttonsDiv = h('div', {id: 'buttons:'+ canvasID}, [
              photoDiv,
              filters,
              h('button', { onclick: function () {
                photoURL.value = ''
                croppedURL.value = ''
                uncroppedURL.value = ''
                filter = null
                photoDiv.parentNode.removeChild(photoDiv)
                photoDiv = h('div')
                buttonsDiv.parentNode.removeChild(buttonsDiv)
                newPhoto.appendChild(uploadButton)                
              }}, ['Cancel'])
            ])

            input.parentNode.appendChild(buttonsDiv)
          }
        })

        var uploadButton = h('button', {onclick: function () {
          input.click()
          uploadButton.parentNode.removeChild(uploadButton)
        }, innerHTML: '&#128247;'})

        var photoDiv = h('div')

        var newPhoto = h('span', [
          photoDiv,
          input,
          uploadButton
        ])

        var filters = h('span')

        var filterList = [
          {name: '#nofilter', filter: null},
          {name: 'Thoreau', filter: 'thoreau'},
          {name: 'Melville', filter: 'melville'},
          {name: 'Hoover', filter: 'hoover'},
          {name: 'Yeats', filter: 'yeats'}
        ]

        var filter

        filterList.forEach(f => {
          filters.appendChild(h('a', {onclick: function () {
            filter = f.filter
            photoDiv.classList = filter
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

        var preview = h('div', {classList: 'content'})

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
                photoDiv = h('div')
                var buttonsDiv = document.getElementById('buttons:' + canvasID)
                buttonsDiv.parentNode.appendChild(uploadButton)
                buttonsDiv.parentNode.removeChild(buttonsDiv)
              }
              if (filter) {
                obj.filter = filter
                filter = ''
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
        compose.appendChild(newPhoto)
        compose.appendChild(textarea)
        compose.appendChild(publish) 
        return compose
      }
    })
  })
})


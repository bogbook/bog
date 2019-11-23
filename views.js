function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function profilePage (src, keys) {
  var msg = {}
  msg.author = src

  var profile = h('div', {classList: 'profile'})

  scroller.appendChild(profile)
  scroller.appendChild(h('div'))

  var subs = [src]

  var interval = 1000
  timer = function() {
    if (src === window.location.hash.substring(1)) {
      if (interval < 10000) { interval = interval + 200 }
      sync(subs, keys)
      setTimeout(timer, interval)
    }
  }
  timer()

  profile.appendChild(h('a', {href: '#' + src}, [
    getImage(src, keys, 'profileAvatar'),
    getName(src, keys)
  ]))

  profile.appendChild(h('br'))

  quickName(src).then(name => {
    var mentionsButton = h('button', {
      onclick: function () {
        location.href = '#?' + src
      }
    }, [name + '\'s Mentions'])
    profile.appendChild(mentionsButton)
    var respond = h('button', {
      onclick: function () {
        scroller.insertBefore(composer(keys, msg, name), scroller.childNodes[1])
      }
    }, ['Reply to ' + name])
    profile.appendChild(respond)

    if (src != keys.publicKey) {
      localforage.getItem('subscriptions').then(function (subs) {
        if (subs.includes(src)) {
          profile.appendChild(h('button', {
            onclick: function () {
              subs = subs.filter(a => a !== src)
              localforage.setItem('subscriptions', subs).then(function () { location.reload() })
            }
          }, ['Unsubscribe from ' + name]))
        } else {
          profile.appendChild(h('button', {
            onclick: function () {
              subs.push(src)
              localforage.setItem('subscriptions', subs).then(function () { location.reload() })
            }
          }, ['Subscribe to ' + name]))
        }
      })
    }

    profile.appendChild(h('button', {
      onclick: function () {
        localforage.removeItem(src).then(function () {
          var home = true
          regenerate(home)
        })
      }
    }, ['Delete ' + name + '\'s feed']))
  })

  profile.appendChild(identify(src, profile, keys))

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      if (msg.author === src) {
        scroller.appendChild(render(msg, keys))
      }
    })
  }
  bog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 25)
      addPosts(posts, keys).then(done => {
        index = index + 25
        window.onscroll = function(ev) {
          if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
            posts = log.slice(index, index + 25)
            index = index + 25
            if (src === window.location.hash.substring(1)) {
              addPosts(posts, keys)
            }
            console.log("Bottom of page");
          }
        }
      })
    }
  })
}

function searchPage (src, keys) {
  var search = src.substring(1).replace("%20"," ").toUpperCase()

  bog().then(log => {
    if (log) {
      log.forEach(function (msg) {
        if (msg.text) {
          if (msg.text.toUpperCase().includes(search)) {
            scroller.appendChild(render(msg, keys))
          }
        }
      })
    }
  })
}

function publicPage (keys) {
  localforage.getItem('subscriptions').then(function (subs) {
    var interval = 1000
    timer = function() {
      if ('' === window.location.hash.substring(1)) {
        if (interval < 10000) { interval = interval + 1000 }
        sync(subs, keys)
        setTimeout(timer, interval)
      }
    }

    if (subs) {
      subs.push(keys.publicKey)
      timer()
    } else {
      var subs = []
      localforage.setItem('subscriptions', subs)
      subs.push(keys.publicKey)
      timer()
    }
  })

  var div = h('div')

  div.appendChild(h('button', {
    onclick: function () {
      localforage.clear().then(function () {location.reload()})
    }
  }, ['Delete Everything']))

  div.appendChild(h('button', {
    onclick: function () {
      regenerate()
    }
  }, ['Regenerate']))

  scroller.appendChild(div)

  scroller.appendChild(composer(keys))

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      scroller.appendChild(render(msg, keys))
    })
  }

  bog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 25)
      addPosts(posts, keys).then(done => {
        index = index + 25
        window.onscroll = function(ev) {
          if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
            posts = log.slice(index, index + 25)
            index = index + 25
            if ('' === window.location.hash.substring(1)) {
              addPosts(posts, keys)
            }
            console.log("Bottom of page");
          }
        }
      })
    }
  })
}

function keyPage (keys) {
  var message = h('div', {classList: 'message'})

  message.appendChild(h('p', {innerHTML: marked('This is your ed25519 public/private keypair. It was generated using [TweetNaCl.js](https://tweetnacl.js.org/#/). Your public key is your identity when using [Bogbook](http://bogbook.com/), save your key in a safe place so that you can continue to use the same identity.')}))

  message.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

  message.appendChild(h('button', {
    onclick: function () {
     localforage.removeItem('id', function () {
       location.hash = ''
       location.reload()
     })
    }
  }, ['Delete Key']))

  var textarea = h('textarea', {placeholder: 'Import your existing ed25519 keypair'})
  message.appendChild(textarea)
  message.appendChild(h('button', {
    onclick: function () {
      if (textarea.value) {
        localforage.setItem('id', JSON.parse(textarea.value)).then(function () { location.reload() })
      }
    }
  }, ['Import Key']))

  scroller.appendChild(message)
}

function pubs () {
  var message = h('div', {classList: 'message'})
 
  message.appendChild(h('p', {innerHTML: marked('These are the Bogbook pubs that your browser will connect to as it looks for new messages from your subscriptions, when you post new bog posts, and when you click on feeds.\n\nAdd or remove these pubs to control where your Bogbook gossips. Localhost is a default, but will only work if you install Bogbook on your local computer by [cloning down the repo](https://git.sr.ht/~ev/bogbook).')}))

  var add = h('input', {placeholder: 'Add a pub'})

  localforage.getItem('securepubs').then(function (servers) {

    message.appendChild(h('div', [
      add,
      h('button', {
        onclick: function () {
          if (add.value) {
            servers.push(add.value)
            localforage.setItem('securepubs', servers).then(function () { location.reload() })
          }
        }
      }, ['Add a pub'])
    ]))

    servers.forEach(function (pub) {
      message.appendChild(h('p', [
        pub,
        h('button', {
          onclick: function () {
            var newServers = servers.filter(item => item !== pub)
            localforage.setItem('securepubs', newServers).then(function () { location.reload() })
          }
        }, ['Remove'])
      ]))
    })
  })

  message.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem('securepubs').then(function () {
        location.hash = ''
        location.reload()
      })
    }
  }, ['Reset pubs']))

  scroller.appendChild(message)
}


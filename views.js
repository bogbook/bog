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
  //scroller.appendChild(h('div'))

  var subs = [src]

  var interval = 1000
  timer = function() {
    if (src === window.location.hash.substring(1)) {
      if (interval < 10000) { interval = interval + 100 }
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
    var interval = 10000
    timer = function() {
      if ('' === window.location.hash.substring(1)) {
        if (interval < 100000) { interval = interval + 1000 }
        sync(subs, keys)
        setTimeout(timer, interval)
      }
    }
    if (subs) {
      timer()
    } else {
      var subs = []
      localforage.setItem('subscriptions', subs)
      subs.push(keys.publicKey)
      timer()
    }
  })

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

function settingsPage (keys) {
  var welcome = h('div', {classList: 'message'})

  welcome.appendChild(h('p', {innerHTML: marked('This is [Bogbook](http://bogbook.com), a distributed social network built using secure-gossiped blockchain logging (blogging), but we call them "bogs".\n\n You can view the code at [git.sr.ht/~ev/bogbook](https://git.sr.ht/~ev/bogbook) or clone it directly from our server:\n```\ngit clone http://git.bogbook.com/bogbook.git\n```\n Please communicate errors, bugs, and pull-requests to [@ev](http://bogbook.com/#@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=) using Bogbook or via email: [ev@evbogue.com](mailto:ev@evbogue.com)')}))

  var keyDiv = h('div', {classList: 'message'})

  keyDiv.appendChild(h('p', {innerHTML: marked('This is your ed25519 public/private keypair. It was generated using [TweetNaCl.js](https://tweetnacl.js.org/#/). Your public key is your identity when using Bogbook, save your key in a safe place so that you can continue to use the same identity.')}))

  keyDiv.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

  keyDiv.appendChild(h('button', {
    onclick: function () {
     localforage.removeItem('id', function () {
       location.hash = ''
       location.reload()
     })
    }
  }, ['Delete Key']))

  var textarea = h('textarea', {placeholder: 'Import your existing ed25519 keypair'})
  keyDiv.appendChild(textarea)
  keyDiv.appendChild(h('button', {
    onclick: function () {
      if (textarea.value) {
        localforage.setItem('id', JSON.parse(textarea.value)).then(function () { location.reload() })
      }
    }
  }, ['Import Key']))

  var everything = h('div', {classList: 'message'})

  everything.appendChild(h('p', {innerHTML: marked('Sometimes you may want to delete all of your bogbook data in the browser. When you click this button, Bogbook will erase everything that you\'ve stored in the browser. NOTE: This will not delete Bogbook posts that you have already gossiped with others. WARNING: This will delete your Bogbook keypair as well as all data stored in the browser. If you want to continue to use the same key, make sure you\'ve backed up your keypair!')}))

  everything.appendChild(h('button', {
    onclick: function () {
      localforage.clear().then(function () {location.reload()})
    }
  }, ['Delete Everything']))

  /* we probably don't need this anymore
  var regenerate = h('div', {classList: 'message'})

  regenerate.appendChild(h('p', {innerHTML: marked('The regenerate button will create a new bogbook log in your browser from all of the feeds that you\'ve collected in your browser. While it is rare, you may use this button to troubleshoot if Bogbook is throwing strange database errors in your console.')}))

  regenerate.appendChild(h('button', {
    onclick: function () {
      regenerate()
    }
  }, ['Regenerate']))*/


  var pubs = h('div', {classList: 'message'})
 
  pubs.appendChild(h('p', {innerHTML: marked('These are your bogbook pubs. Bogbook will gossip with these pubs to publish your messages and check for new messages from your subscriptions. You should have at least one Bogbook pub in order to gossip your messages. If you don\'t see a bogbook pub below, try clicking "Reset Pubs" or add \n```\nws://bogbook.com/~@h4e3bHDJeDWiCAkzp83HINPR4y7BLR7tI3fOVqwLQqw=\n```\n to your pubs list.')}))

  var add = h('input', {placeholder: 'Add a pub'})

  localforage.getItem('securepubs').then(function (servers) {

    pubs.appendChild(h('div', [
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
      pubs.appendChild(h('p', [
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

  pubs.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem('securepubs').then(function () {
        location.hash = ''
        location.reload()
      })
    }
  }, ['Reset pubs']))

  scroller.appendChild(welcome)
  scroller.appendChild(keyDiv)
  scroller.appendChild(pubs)
  scroller.appendChild(everything)
  //scroller.appendChild(regenerate)
}


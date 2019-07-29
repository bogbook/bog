function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function profilePage (src, keys) {
  var profile = h('div', {classList: 'profile'})

  scroller.appendChild(profile)

  var subs = [src]

  sync(subs, keys)

  var input = h('input', {placeholder: 'New name'})

  profile.appendChild(h('a', {href: '#' + src}, [getName(src, keys)]))

  profile.appendChild(h('br'))

  var identify = h('div', [
    input,
    h('button', {
      onclick: function () {
        if (input.value) {
          content = {
            type: 'name',
            named: src,
            name: input.value
          }
          localforage.removeItem('name:' + src)
          publish(content, keys).then(post => {
            open(post).then(msg => {
              input.value = ''
              scroller.insertBefore(render(msg, keys), scroller.childNodes[1])
            })
          })
        }
      }
    }, ['Identify'])
  ])

  var identifyButton = h('button', {
    onclick: function () {
      profile.appendChild(identify)
      identifyButton.parentNode.removeChild(identifyButton) 
    }
  }, ['Identify ' + src.substring(0, 10) + '...'])

  var mentionsButton = h('button', {
    onclick: function () {
      location.href = '#?' + src
    }
  }, ['Mentions'])

  profile.appendChild(identifyButton)

  profile.appendChild(mentionsButton)

  localforage.getItem('subscriptions').then(function (subs) {
    if (subs.includes(src)) {
      profile.appendChild(h('button', {
        onclick: function () {
          subs = subs.filter(a => a !== src)
          localforage.setItem('subscriptions', subs).then(function () { location.reload() })
        }
      }, ['Unsubscribe']))
    } else {
      profile.appendChild(h('button', {
        onclick: function () {
          subs.push(src)
          localforage.setItem('subscriptions', subs).then(function () { location.reload() })
        }
      }, ['Subscribe']))
    }
  })
  
  /*profile.appendChild(h('button', {
    onclick: function () {
      sync(src, keys)
    }
  }, ['Sync feed']))*/

  profile.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem(src).then(function () {
        var home = true
        regenerate(home)
      })
    }
  }, ['Delete feed']))
  
  bog().then(log => {
    if (log) {
      log.forEach(function (msg) {
        if (msg.author === src) {
          scroller.appendChild(render(msg, keys))
        }
      })
    }
  })

  /*bog(src).then(log => {
    if (log) {
      log.forEach(function (msg) {
        open(msg).then(post => {
          scroller.appendChild(render(post, keys))
        })
      })
    }
  })*/
}

function searchPage (src, keys) {
  var search = src.substring(1).replace("%20"," ").toUpperCase()

  //scroller.appendChild(composer(keys))
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
    if (subs) {
      sync(subs, keys)
    } else {
      var subs = [keys.publicKey]
      localforage.setItem('subscriptions', subs)
      sync(subs, keys)
    }
  })

  scroller.appendChild(h('button', {
    onclick: function () {
      localforage.clear().then(function () {location.reload()})
    }
  }, ['Delete Everything']))

  scroller.appendChild(h('button', {
    onclick: function () {
      regenerate()
    }
  }, ['Regenerate']))

  scroller.appendChild(composer(keys))
  bog().then(log => {
    if (log) {
      log.forEach(function (msg) {
        scroller.appendChild(render(msg, keys))
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

  localforage.getItem('pubs').then(function (servers) {

    message.appendChild(h('div', [
      add,
      h('button', {
        onclick: function () {
          if (add.value) {
            servers.push(add.value)
            localforage.setItem('pubs', servers).then(function () { location.reload() })
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
            localforage.setItem('pubs', newServers).then(function () { location.reload() })
          }
        }, ['Remove'])
      ]))
    })
  })

  message.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem('pubs').then(function () {
        location.hash = ''
        location.reload()
      })
    }
  }, ['Reset pubs']))

  scroller.appendChild(message)
}


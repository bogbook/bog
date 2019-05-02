function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function profilePage (src, keys) {
  var server = 'ws://localhost:8080/'

  var profile = h('div', {classList: 'profile'})

  scroller.appendChild(profile)

  var input = h('input', {placeholder: 'New name'})

  profile.appendChild(h('a', {href: '#' + src}, [getName(src)]))

  profile.appendChild(h('div', [
    input,
    h('button', {
      onclick: function () {
        content = {
          type: 'name',
          named: src,
          name: input.value
        }

        publish(content, keys).then(function () {location.reload()})
      }
    }, ['Identify'])
  ]))

  profile.appendChild(h('button', {
    onclick: function () {
      sync(src, server, keys)
    }
  }, ['Sync feed']))

  profile.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem(src).then(function () { location.reload() })
    }
  }, ['Delete feed']))
  

  bog(src).then(log => {
    if (log) {
      log.forEach(function (msg) {
        open(msg).then(post => {
          scroller.appendChild(render(post, keys))
        })
      })
    }
  })
}

function publicPage (keys) {
  var newlog = []

  scroller.appendChild(h('button', {
    onclick: function () {
      var openedlog = []
      localforage.iterate(function(value, key, i) {
        if (key[0] == '@') {
          newlog = newlog.concat(value)
        }
        console.log(newlog)
      }).then(function () {
        newlog.forEach(function (msg) {
          var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
          var sig = nacl.util.decodeBase64(msg.signature)
          var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
          opened.key = msg.key
          
          openedlog.push(opened)
        })
        console.log(openedlog)
        localforage.setItem('log', openedlog).then(function () {location.reload()}) 
      })
    }
  }, ['Merge']))

  scroller.appendChild(h('button', {
    onclick: function () {
      localforage.getItem('log').then(log => {
        log.sort((a, b) => a.timestamp - b.timestamp)
        console.log(log)
        var reversed = log.reverse()
        localforage.setItem('log', reversed).then(function () {location.reload()})
      })
    }
  }, ['Sort']))

  scroller.appendChild(h('button', {
    onclick: function () {
      var openedlog = []
      localforage.iterate(function(value, key, i) {
        if (key[0] == '@') {
          newlog = newlog.concat(value)
        }
        console.log(newlog)
      }).then(function () {
        newlog.forEach(function (msg) {
          var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
          var sig = nacl.util.decodeBase64(msg.signature)
          var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
          opened.key = msg.key

          openedlog.push(opened)
        })
        console.log(openedlog)

        openedlog.sort((a, b) => a.timestamp - b.timestamp)

        var reversed = openedlog.reverse()

        localforage.setItem('log', reversed).then(function () {location.reload()})
      })

    }
  }, ['Regenerate']))

  scroller.appendChild(composer(keys))
  bog().then(log => {
    log.forEach(function (msg) {
      scroller.appendChild(render(msg, keys))
    })
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
        localforage.setItem('id', JSON.parse(textarea.value))
        location.reload()
      }
    }
  }, ['Import Key']))

  scroller.appendChild(message)
}


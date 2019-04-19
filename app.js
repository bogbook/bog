var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

function keyPage (keys) {
  var scroller = document.getElementById('scroller') 

  var message = h('div', {classList: 'message'})

  message.appendChild(h('p', {innerHTML: marked('This is your ed25519 public/private keypair. It was generated using [Tweetnacl.js](https://tweetnacl.js.org/#/). Your public key is your identity when using [Bogbook](http://bogbook.com/), save your key in a safe place so that you can continue to use the same identity.')}))

  // print stringified keypair
  message.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

  // delete key button
  message.appendChild(h('button', {
    onclick: function () {
     localforage.removeItem('id', function () {

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

function profilePage (src, keys) {
  var scroller = document.getElementById('scroller')

  var message = h('div', {classList: 'message'})

  var identify = h('input', {placeholder: 'Identify ' + src.substring(0, 10) + '...'})

  message.appendChild(h('div', [
    identify,
    h('button', {onclick: function () {
      if (identify.value) {
        var content = {
          author: keys.publicKey,
          type: 'name',
          naming: src,
          name: identify.value,
          timestamp: Date.now()
        }

        identify.value = ''
        publish(content, keys)
        localforage.setItem('id', keys, function (err, published) {
          if (published) {
            location.reload()
          }
        })
      }
    }}, ['Identify'])
  ]))

  scroller.appendChild(message)

  requestFeed(src, 'ws://localhost:8080/', keys.publicKey)

  localforage.getItem(src, function (err, log) {
    if (log) {
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))
      }
    }
  })
}

function threadPage (src, keys) {
  var scroller = document.getElementById('scroller')
  
  localforage.getItem('log', function (err, log) {
    for (var i = log.length - 1; i >= 0; --i) {
      if (log[i].key === src) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))
      }
    }
  })
}

function publicPage (keys) {
  compose(keys)

  localforage.getItem('log', function (err, log) {
    if (log) {
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))
      }
      var newLog = log.sort(function (a, b) {
        return b.content.timestamp - a.content.timestamp
      })
      if (newLog) {
        localforage.setItem('log', log)
      }
    }
  })
} 

function route () {
  localforage.getItem('id', function (err, keys) {

    src = window.location.hash.substring(1)
    var scroller = h('div', {id: 'scroller'})
    var screen = document.getElementById('screen')
    screen.appendChild(scroller)

    if (src === 'key') {
      keyPage(keys)
    } else if (src[0] === '@') {
      profilePage(src, keys)
    } else if (src[0] === '%') {
      threadPage(src, keys)
    } else {
      publicPage(keys)
    }
  })
}

localforage.getItem('id', function (err, keys) {
  if (keys) {

    var navbar = h('div', {classList: 'navbar'}, [
      h('div', {classList: 'internal'}, [
        h('li', [h('a', {href: '/#'}, ['Home'])]),
        h('li', [h('a', {href: '#' + keys.publicKey}, [getName(keys.publicKey)])]),
        h('li', [h('a', {href: '/#key'}, ['Key'])])
      ])
    ])

    document.body.appendChild(navbar)

    route()
  } else {
    var genkey = nacl.sign.keyPair()
    if (genkey) {
      var keys = {
        publicKey: '@' + nacl.util.encodeBase64(genkey.publicKey),
        privateKey: nacl.util.encodeBase64(genkey.secretKey)
      }
      
      if (keys.publicKey.includes('/')) {
        console.log('TRYING AGAIN')
        setTimeout(function () {
          location.reload()
        }, 10)
      } else {
        welcomeScreen(keys)
      }
    }
  }
})



window.onhashchange = function () {
  var oldscreen = document.getElementById('screen')
  var newscreen = h('div', {id: 'screen'})
  oldscreen.parentNode.replaceChild(newscreen, oldscreen)
  route()
}


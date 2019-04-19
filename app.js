var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)
function compose (keys) {
  var message = h('div', {classList: 'message'})

  var scroller = document.getElementById('scroller')
  
  scroller.insertBefore(message, scroller.firstChild)

  var textarea = h('textarea', {placeholder: 'Write a new bog post'})
  
  message.appendChild(textarea)
  
  var composer = h('div', [
    h('button', {
      onclick: function () {
        if (textarea.value) {
          var content = {
            author: keys.publicKey,
            type: 'post',
            text: textarea.value,
            timestamp: Date.now()
          }
          textarea.value = ''
          publish(content, keys)
        }
      }
    }, ['Publish'])
  ])
  message.appendChild(composer)
}


function keyPage (keys) {
  var scroller = document.getElementById('scroller') 

  var message = h('div', {classList: 'message'})

  message.appendChild(h('p', {innerHTML: marked('This is your ed25519 public/private keypair. It was generated using [Tweetnacl.js](https://tweetnacl.js.org/#/). Your public key is your identity when using [Bogbook](http://bogbook.com/), save your key in a safe place so that you can continue to use the same identity.')}))

  // print stringified keypair
  message.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

  // delete key button
  message.appendChild(h('button', {
    onclick: function () {
     localStorage['id'] = ''
     location.reload()
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
        h('li', [h('a', {href: '/'}, ['Home'])]),
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
        var scroller = h('div', {id: 'scroller'})
        screen.appendChild(scroller)

        var message = h('div', {classList: 'message'})

        scroller.appendChild(message)

        message.appendChild(h('h1', ['Welcome to Bogbook']))

        message.appendChild(h('p', ['Bogbook is a distributed blogging network of signed append-only feeds. To avoid confusion, we call them "bogs".'])) 

        message.appendChild(h('p', ['Please note: Bogbook is experimental software, not for use in producton environments. Expect bugs and breaking changes. Pull-requests are needed.']))

        message.appendChild(h('p', {innerHTML: marked('View the code: [http://github.com/bogbook/bog](http://github.com/bogbook/bog). Questions? [ev@evbogue.com](mailto:ev@evbogue.com).')}))

        message.appendChild(h('hr'))
        message.appendChild(h('h3', ['Get started']))

        message.appendChild(h('p', {innerHTML: marked('This is an ed25519 public/private signing keypair. It was generated using [TweetNaCl.js](https://tweetnacl.js.org/#/)')}))
        message.appendChild(h('pre', [JSON.stringify(keys)]))

        message.appendChild(h('p', ['Right now, this keypair exists only in memory. When you leave this page, the keypair will vanish forever. If you refresh this page you\'ll receive a new keypair.']))

        message.appendChild(h('p', {innerHTML: marked('To save this keypair, identify with handle below. Once you identify, your public/private keypair will be stored in your browser using [localForage.js](https://localforage.github.io/localForage). Save your keypair somewhere safe to preserve your identity.')}))

        message.appendChild(h('hr'))
        message.appendChild(h('h3', ['Identify']))

        var identify = h('input', {placeholder: 'Your Name'})

        message.appendChild(h('div', [
          identify, 
          h('button', {onclick: function () {
            if (identify.value) {
              var content = {
                author: keys.publicKey,
                type: 'name',
                naming: keys.publicKey,
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

        message.appendChild(h('p', ['When you click [Identify], you will post your first message to your append-only bog, your ed25519 keypair will be saved in your browser, and the page will reload. Don\'t forget to back up your key! and happy bogging.']))
 
        message.appendChild(h('hr'))
        message.appendChild(h('h3', ['Already have a key?']))

        message.appendChild(h('p', ['Import it here. Make sure to sync your existing feed from a Bogbook \'pub\' before posting a message.']))

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


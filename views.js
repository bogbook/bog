function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function profilePage (src, keys) {
  var profile = h('div', {classList: 'profile'})

  scroller.appendChild(profile)

  sync(src, keys)

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

        publish(content, keys).then(post => {
          open(post).then(msg => {
            input.value = ''
            scroller.insertBefore(render(msg, keys), scroller.childNodes[1])
          })
        })
      }
    }, ['Identify'])
  ]))

  /*profile.appendChild(h('button', {
    onclick: function () {
      sync(src, keys)
    }
  }, ['Sync feed']))*/

  profile.appendChild(h('button', {
    onclick: function () {
      localforage.removeItem(src).then(function () {
        location.hash = '' 
        regenerate() 
      })
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
  sync('@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=', keys)

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


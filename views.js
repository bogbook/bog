function threadPage (src, keys) {
  get(src).then(msg => {
    open(msg).then(post => {
      scroller.appendChild(render(post, keys))
    })
  })
}

function profilePage (src, keys) {
  bog(src).then(log => {
    log.forEach(function (msg) {
      open(msg).then(post => {
        scroller.appendChild(render(post, keys))
      })
    })
  })
}

function publicPage (keys) {
  scroller.appendChild(composer(keys))
  bog().then(log => {
    log.forEach(function (msg) {
      open(msg).then(post => {
        scroller.appendChild(render(post, keys))
      })
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


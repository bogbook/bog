function welcomeScreen (keys) {
  var screen = document.getElementById('screen')

  var scroller = h('div', {id: 'scroller'})
  screen.appendChild(scroller)

  var message = h('div', {classList: 'message'})

  scroller.appendChild(message)

  message.appendChild(h('h1', ['Welcome to Bogbook']))
  message.appendChild(h('p', ['Bogbook is a distributed blogging network of signed append-only feeds. We call them "bogs".']))
  message.appendChild(h('p', ['Please note: Bogbook is experimental software, not for use in producton environments. Expect bugs and breaking changes. Pull-requests are needed.']))
  message.appendChild(h('p', {innerHTML: marked('View the code: [http://github.com/bogbook/bog](http://github.com/bogbook/bog). Questions? [ev@evbogue.com](mailto:ev@evbogue.com).')}))
  message.appendChild(h('hr'))
  message.appendChild(h('h3', ['Get started']))
  message.appendChild(h('p', {innerHTML: marked('This is an ed25519 public/private signing keypair. It was generated using [TweetNaCl.js](https://tweetnacl.js.org/#/)')}))
  message.appendChild(h('pre', [JSON.stringify(keys)]))
  message.appendChild(h('p', ['Right now, this keypair exists only in memory. When you leave this page, the keypair will vanish forever. If you refresh this page you\'ll receive a new keypair.']))
  message.appendChild(h('p', {innerHTML: marked('To save this keypair, identify with a handle below. Once you identify, your public/private keypair will be stored in your browser using [localForage.js](https://localforage.github.io/localForage). Save your keypair somewhere safe to preserve your identity.')}))
  message.appendChild(h('hr'))
  message.appendChild(h('h3', ['Identify']))

  var identify = h('input', {placeholder: 'Your Name'})

  message.appendChild(h('div', [
    identify,
    h('button', {onclick: function () {
      if (identify.value) {
        var toPublish = {
          author: keys.publicKey,
          type: 'name',
          naming: keys.publicKey,
          name: identify.value,
          timestamp: Date.now()
        }

        identify.value = ''
        publish(toPublish, keys)
        localforage.setItem('id', keys, function (err, published) {
          if (published) {
            location.hash = ''
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
        location.hash = ''
        location.reload()
      }
    }
  }, ['Import Key']))


}

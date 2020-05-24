function settingsPage (keys) {
  var welcome = h('div', {classList: 'message'})

  welcome.appendChild(h('p', {innerHTML: marked('### About Bogbook \n\n[Bogbook](http://bogbook.com) is a distributed social network built using secure-gossiped blockchain logging (blogging), but we call them "bogs".\n\n With bogbook you can create your own secure social network that is easily replicated between browsers via bogbook pubs.\n\n To try bogbook, type a message into the [compose box](/) on the bogbook instance you are using, then press preview and publish.\n\n You can view the bogbook code at [git.sr.ht/~ev/bogbook](https://git.sr.ht/~ev/bogbook) or clone it directly from our server:\n```\ngit clone http://git.bogbook.com/bogbook.git\n```\n Please communicate errors, bugs, and pull-requests to [@ev](http://bogbook.com/#@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=) using Bogbook or via email: [ev@evbogue.com](mailto:ev@evbogue.com)\n\n Here\'s a video of Bogbook in the early days:')}))

  welcome.appendChild(h('div', {innerHTML: '<video width="100%" controls><source src="http://evbogue.com/e-bogbook-explanation.webm" type="video/webm"></video>'}))

  var keyDiv = h('div', {classList: 'message'})

  keyDiv.appendChild(h('p', {innerHTML: marked('### Your keypair \n\n This is your [ed25519](https://ed25519.cr.yp.to/) keypair. It was generated using [TweetNaCl.js](https://tweetnacl.js.org/#/). \n\n Bogbook does not use logins and passwords, instead you are able to post by signing messages with your keypair. \n\n Because Bogbook uses keypairs for identities, keep your keypair safe so no one can post to your feed (or delete your posts) without your permission. \n\n**Save your key** in a safe place so that you can continue to use the same identity.')}))

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

  var sort = h('div', {classList: 'message'})

  sort.appendChild(h('p', {innerHTML: marked('### Sort everything \n\n This button will sort your log in chronological order. It may take a little time, and is a little CPU intensive. When the sort is finished your page will reload, please don\'t do anything else while sort is finishing.')}))
  
  sort.appendChild(h('button', {
    onclick: function () {
      localforage.getItem('log').then(log => {
        if (log) {
          log.sort((a, b) => a.timestamp - b.timestamp)
          var reversed = log.reverse()
          localforage.setItem('log', reversed).then(function () {location.href = ''})
        }
      })
    }
  }, ['Sort']))

  var everything = h('div', {classList: 'message'})

  everything.appendChild(h('p', {innerHTML: marked('### Delete everything \n\n Sometimes you may want to delete all of your bogbook data in the browser. When you click this button, Bogbook will erase everything that you\'ve stored in the browser.\n\n **NOTE**: This will not delete Bogbook posts that you have already gossiped with others.\n\n **WARNING**: This will delete your Bogbook keypair as well as all data stored in the browser. If you want to continue to use the same key, make sure you\'ve backed up your keypair!')}))

  everything.appendChild(h('button', {
    onclick: function () {
      localforage.clear().then(function () {location.reload()})
    }
  }, ['Delete Everything']))

  var regenerate = h('div', {classList: 'message'})

  regenerate.appendChild(h('p', {innerHTML: marked('The regenerate button will create a new bogbook log in your browser from all of the feeds that you\'ve collected in your browser. While it is rare, you may use this button to troubleshoot if Bogbook is throwing strange database errors in your console.')}))

  regenerate.appendChild(h('button', {
    onclick: function () {
      regenerate()
    }
  }, ['Regenerate']))

  var pubs = h('div', {classList: 'message'})
 
  pubs.appendChild(h('p', {innerHTML: marked('### Bogbook Pubs \n\n These are your bogbook pubs. Bogbook will gossip with these pubs to publish your messages and check for new messages from your subscriptions. You should have at least one Bogbook pub in order to gossip your messages. If you don\'t see a bogbook pub below, try clicking "Reset Pubs" or add \n```\nws://bogbook.com\n```\n to your pubs list.')}))

  var add = h('input', {placeholder: 'Add a pub'})

  localforage.getItem('pubs').then(function (servers) {
    pubs.appendChild(h('div', [
      add,
      h('button', {
        onclick: function () {
          if (add.value) {
            servers.push(add.value)
            localforage.setItem('pubs', servers).then(function () { location.hash = '' })
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
            localforage.setItem('pubs', newServers).then(function () { location.hash = '' })
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

  scroller.appendChild(keyDiv)
  scroller.appendChild(pubs)
  scroller.appendChild(sort)
  scroller.appendChild(everything)
  scroller.appendChild(regenerate)
  scroller.appendChild(welcome)
  
}


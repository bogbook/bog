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

  var pubslist = h('select')

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
      pubslist.appendChild(
        h('option', {value: pub}, [pub])
      )
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

  var ads = h('div', {classList: 'message'}) 


  ads.appendChild(h('span', {innerHTML: marked('Submit an advertisement. Right now advertisements are free for anyone to post to this pub. Ads from guests will run for 100 views before they are deleted by the pub. \n\nSelect a pub:')}))

  ads.appendChild(pubslist)

  var adstext = h('input', {placeholder: 'Hello World!'})

  ads.appendChild(h('span', [
    h('br'),
    ' Write an ad: ',
    h('br'),
    adstext,
    h('button', {
      onclick: function () {
        var split = pubslist.value.split('~')
        console.log(split)
        var serverurl = split[0]
        var serverpub = split[1]
        var ws = new WebSocket(serverurl)
         
        var msg = {
          type: 'ad',
          author: keys.publicKey
        }
        msg.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(adstext.value)), nacl.util.decodeBase64(keys.privateKey)))
        ws.onopen = function () {
          box(JSON.stringify(msg), serverpub, keys).then(boxed => {
            var obj = {
              requester: keys.publicKey,
              box: boxed
            }
            ws.send(JSON.stringify(obj))
          })
        }
        adstext.value = ''
      }
    }, ['Publish'])
  ]))

  scroller.appendChild(welcome)
  scroller.appendChild(keyDiv)
  scroller.appendChild(pubs)
  scroller.appendChild(everything)
  //scroller.appendChild(regenerate)
  scroller.appendChild(ads)
}


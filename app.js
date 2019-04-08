var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

var keys = getKeys()

var navbar = h('div', {classList: 'navbar'}, [
  h('div', {classList: 'internal'}, [
    h('li', [h('a', {href: '/'}, ['Home'])]),
    h('li', [h('a', {href: '#' + keys.publicKey}, [getName(keys.publicKey)])]),
    h('li', [h('a', {href: '/#key'}, ['Key'])])
  ])
])

if (!localStorage['subscribees']) {
  var subscribees = ['@218Fd2bCrmXe4gwnMg5Gcb9qVZrjXquym2AlelbkBro=']
  localStorage['subscribees'] = JSON.stringify(subscribees)
}


document.body.appendChild(navbar)

function compose (keys, opts) {
  var header = h('div', {classList: 'message'})
  var scroller = document.getElementById('scroller')
  
  scroller.insertBefore(header, scroller.firstChild)
 
  var textarea = h('textarea', {placeholder: 'Write a new bog post'})
  
  header.appendChild(textarea)
  
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
  
  header.appendChild(composer)
}

function route () {
  src = window.location.hash.substring(1)
  var scroller = h('div', {id: 'scroller'})
  var screen = document.getElementById('screen')


  screen.appendChild(scroller)

  if (src === 'key') {
    var keyMessage = h('div', {classList: 'message'})    

    keyMessage.appendChild(h('p', {innerHTML: marked('This is your ed25519 public/private keypair. It was generated using [Tweetnacl.js](https://tweetnacl.js.org/#/). Your public key is your identiy when using [Bogbook](http://bogbook.com/), save your key in a safe place so that you can continue to use the same identity.')}))

    // print stringified keypair
    keyMessage.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

    // delete key button
    keyMessage.appendChild(h('button', { 
      onclick: function () {
       localStorage['id'] = ''
       location.reload() 
      }
    }, ['Delete Key'])) 

    var textarea = h('textarea', {placeholder: 'Import your existing ed25519 keypair'})
    keyMessage.appendChild(textarea)
    keyMessage.appendChild(h('button', {
      onclick: function () {
        if (textarea.value) {
          localStorage['id'] = textarea.value
          location.reload()
        }
      }
    }, ['Import Key']))

    scroller.appendChild(keyMessage)
  }

  else if (src[0] === '@') {
    var profile = h('div', {classList: 'message'})
    scroller.appendChild(profile)

    if (src == keys.publicKey) {
      var nameInput = h('input', {placeholder: 'Publish a new name'})

      var namePublisher = h('div',[
        nameInput,
        h('button', {
          onclick: function () {
            if (nameInput.value) {

              var content = {
                author: keys.publicKey,
                type: 'name',
                text: nameInput.value,
                timestamp: Date.now()
              }

              publish(content, keys)
            }
          }
        }, ['Publish'])
      ])

      profile.appendChild(namePublisher)

      readFile()

      var imageInput = h('span', [
        h('input', {id: 'inp', type:'file'}),
        h('span', {id: 'b64'}),
        h('img', {id: 'img'})
      ])

      var imagePublisher = h('div', [
        imageInput,
        h('button', {
          onclick: function () {
            var content = {
              author: keys.publicKey,
              type: 'image',
              image: document.getElementById("img").src,
              timestamp: Date.now()
            }

            publish(content, keys)
          }
        }, ['Publish'])
      ])

      profile.appendChild(imagePublisher)

      document.getElementById("inp").addEventListener("change", readFile);

    } else {
      var subscribees = JSON.parse(localStorage['subscribees'])
      if (subscribees.includes(src)) {
        profile.appendChild(h('button', {
          onclick: function () {
            for (var i = subscribees.length; i--;) {
              if (subscribees[i] === src) {
                subscribees.splice(i, 1);
                localStorage['subscribees'] = JSON.stringify(subscribees)
                window.location.reload()
              }
            }
          }
          // remove subscribee
        }, ['UNSUBSCRIBE']))
      } else { 
        profile.appendChild(h('button', {
          onclick: function () {
            subscribees.push(src)
            localStorage['subscribees'] = JSON.stringify(subscribees)
            window.location.reload()
          }
        }, ['SUBSCRIBE']))
      }
    }

    var ws = new WebSocket('ws://bogbook.com/' + src)

    var clientLog = {
      publicKey: src
    }

    if (localStorage[src]) {
      clientLog.log = JSON.parse(localStorage[src])
    } else {
      clientLog.log = []
    }

    ws.onopen = function () {
      ws.send(JSON.stringify(clientLog))
    }

    ws.onmessage = function (ev) {
      var serverData = JSON.parse(ev.data)
      if (serverData.log.length > clientLog.log.length) {

        // update the log of the id
        localStorage[src] = JSON.stringify(serverData.log)

        // contact new items from the log onto the client's log of everything
        var num = serverData.log.length - clientLog.log.length
        var diff = serverData.log.slice(0, num)

        if (localStorage['log']) {
          var oldLog = JSON.parse(localStorage['log'])
        } else {
          var oldLog = []
        }

        var newLog = diff.concat(oldLog)
        localStorage['log'] = JSON.stringify(newLog)

        location.reload()
      }
    }

    if (localStorage[src]) {
      var log = JSON.parse(localStorage[src])
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))
      }
    }
  }

  else if (src[0] === '%') {
    if (localStorage['log']) {
      var log = JSON.parse(localStorage['log'])
      console.log(log.length) 
      for (var i = log.length - 1; i >= 0; --i) {
        if (log[i].key === src) {
          var post = log[i]
          scroller.appendChild(renderMessage(post))
        }
      }
    }     
  }

  else {
    compose(keys)
    if (localStorage['log']) {
      var log = JSON.parse(localStorage['log'])
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))

      }
    }
  }
}


route()

window.onhashchange = function () {
  var oldscreen = document.getElementById('screen')
  var newscreen = h('div', {id: 'screen'})
  oldscreen.parentNode.replaceChild(newscreen, oldscreen)
  route()
}


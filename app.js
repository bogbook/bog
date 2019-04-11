var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

localforage.getItem('id', function (err, value) {
  // the navbar has a dual purpose of generating a key if you don't already have one

  if (value) {
    var keys = value
    var navbar = h('div', {classList: 'navbar'}, [
      h('div', {classList: 'internal'}, [
        h('li', [h('a', {href: '/'}, ['Home'])]),
        h('li', [h('a', {href: '#' + keys.publicKey}, [getName(keys.publicKey)])]),
        h('li', [h('a', {href: '/#key'}, ['Key'])])
      ])
    ])
    document.body.appendChild(navbar)
  } else if (value == null) {
    var genkey = nacl.sign.keyPair()
    if (genkey) {
      var keys = {
        publicKey: '@' + nacl.util.encodeBase64(genkey.publicKey),
        privateKey: nacl.util.encodeBase64(genkey.secretKey)
      }
      // when we get our next round of funding, let's figure out how to do this without a page reload
      if (keys.publicKey.includes('/')) {
        console.log('TRYING AGAIN')
        setTimeout(function () {
          window.location.reload()
        }, 10)
      } else {
        localforage.setItem('id', keys)
        window.location.reload()
      }
    }
  }
})

if (!localStorage['subscribees']) {
  var subscribees = ['@218Fd2bCrmXe4gwnMg5Gcb9qVZrjXquym2AlelbkBro=']
  localStorage['subscribees'] = JSON.stringify(subscribees)
}

if (!localStorage['pubs']) {
  var pubs = ['ws://bogbook.com/', 'ws://localhost:8080/']
  localStorage['pubs'] = JSON.stringify(pubs)
}

function compose (keys, opts) {
  localforage.getItem('id', function (err, keys) {
    if (keys) {
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
  })
}

function route () {
  localforage.getItem('id', function (err, keys) {

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
            localforage.setItem('id', JSON.parse(textarea.value)) 
            location.reload()
          }
        }
      }, ['Import Key']))

      scroller.appendChild(keyMessage)

      if (localStorage['id']) {

        var oldKey = h('div', {classlist: 'message'})

        oldKey.appendChild(h('p', ['You had a key in localStorage. Import it to the new database by pasting it into the box above.']))
        oldKey.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [localStorage['id']])]))

        scroller.appendChild(oldKey)
      }

      var pubMessage = h('div', {classList: 'message'})

      var newPub = h('input', {placeholder: 'Add a new pub. Ex: ws://bogbook.com/'})

      var pubs = JSON.parse(localStorage['pubs'])

      pubMessage.appendChild(h('div', [
        h('p', {innerHTML: marked('These are your bogbook pubs. These servers will sync data when you publish a new post, when you subscribe to new feeds, and when you click on feed ids.')}),
        newPub,
        h('button', {
          onclick: function () {
            if (newPub.value) {
              pubs.push(newPub.value)
              localStorage['pubs'] = JSON.stringify(pubs)  
              location.reload() 
            }
          }
        }, ['Add Pub'])
      ]))
      
      function removeButton (pubName) {
        var button = h('button', {
          onclick: function () {
            console.log('removing' + pubName)
            for (var i = pubs.length; i--;) {
              if (pubs[i] === pubName) {
                pubs.splice(i, 1);
                localStorage['pubs'] = JSON.stringify(pubs)
                window.location.reload()
              }
            }
          }
        }, ['Remove Pub'])
        return button 
      }

      for (i = 0; i < pubs.length; i++) {
        var pubName = pubs[i]
        pubMessage.appendChild(h('p', [
          pubName,
          removeButton(pubName)
        ]))
      }    

      scroller.appendChild(pubMessage)
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

      var pubs = JSON.parse(localStorage['pubs'])

      for (i = 0; i < pubs.length; i++) {
        requestFeed(src, pubs[i]) 
      }
   
      localforage.getItem(src, function (err, log) {
        if (log) {
          for (var i=0; i < log.length; i++) {
            var post = log[i]
            scroller.appendChild(renderMessage(post))
          }
        }
      }) 
    }

    else if (src[0] === '%') {

      localforage.getItem('log', function (err, log) {
        for (var i = log.length - 1; i >= 0; --i) {
          if (log[i].key === src) {
            var post = log[i]
            scroller.appendChild(renderMessage(post))
          }
        }
      })
    }

    else {
      compose(keys)

      var subscribees = JSON.parse(localStorage['subscribees'])

      console.log(subscribees)
      for (i = 0; i < subscribees.length; i++) {
        var pubs = JSON.parse(localStorage['pubs'])
        for (n = 0; n < pubs.length; n++) {
          requestFeed(subscribees[i], pubs[n])
        }
      }

      localforage.getItem('log', function (err, log) {
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
      })
    }
  })
}


route()

window.onhashchange = function () {
  var oldscreen = document.getElementById('screen')
  var newscreen = h('div', {id: 'screen'})
  oldscreen.parentNode.replaceChild(newscreen, oldscreen)
  route()
}


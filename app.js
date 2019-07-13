var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

function route (keys) {
  src = window.location.hash.substring(1)

  var scroller = h('div', {id: 'scroller'})
  var screen = document.getElementById('screen')
  screen.appendChild(scroller)

  var identify = h('div', {id: 'identify'}) 

  var mess = h('div', {classList: 'message'})

  function nameCheck (id) {
    console.log('Checking for name of ' + id)

    scroller.appendChild(identify)


    setTimeout(function () {
      
      identify.appendChild(mess)
      mess.appendChild(h('span', {innerHTML: marked("Hey [" + keys.publicKey.substring(0, 10) + "...](/#"+ keys.publicKey +")! Welcome to Bogbook. If you have any questions be sure to reach out to [@ev](/#@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=).")}))

      mess.appendChild(h('span', {innerHTML: marked("Your current public key doesn't have a name yet. Either import your existing id on the [key](/#key) page, or identify yourself using the box below. Identifying is optional, but you'll see this welcome message as long as you don't give yourself a name.")}))

      var input = h('input', {placeholder: 'Give yourself a name'})

      mess.appendChild(h('div', [
        input,
        h('button', {
          onclick: function () {
            content = {
              type: 'name',
              named: id,
              name: input.value
            }

            publish(content, keys)
            setTimeout(function () {
              location.reload()
            }, 1000)
          }
        }, ['Identify'])
      ]))


      mess.appendChild(h('span', {innerHTML: marked("Next, make sure to save your public/private keypair on the [key](/#key) page, so that you can continue to use the same identity. No one but you can access your private key, so only you can restore your ability to publish to this identity. If you lose your key, you lose your ability to publish to this identity forever.")}))

      mess.appendChild(h('span', {innerHTML: marked("Finally, be sure to check out the code on [SourceHut](http://git.sr.ht/~ev/bogbook)")}))
    }, 2000)

    bog(keys.publicKey).then(log => {
      if (log) {
        log.forEach(function (msg) {
          open(msg).then(post => {
            if (post.named == id) {
              var identifyExists = (document.getElementById('identify') !== null)
              console.log('You named yourself ' + post.name)
              if (identifyExists) {
                identify.parentNode.removeChild(identify)
              }
            }
          })
        })
      }
    })

    /*bog(id).then(feed => {
      if (feed) {
        for (var i = 0; i < feed.length; i++) {
          console.log(feed[i])
          if (feed[i].named == id) {
            console.log('You named yourself already')
          } 
        }
      }
    })*/
  }

  nameCheck(keys.publicKey)

  if (src === 'key') {
    keyPage(keys)
  } else if (src === 'pubs') {
    pubs()
  } else if (src[0] === '@') {
    profilePage(src, keys)
  } else if (src[0] === '%') {
    threadPage(src, keys)
  } else {
    publicPage(keys)
  }
}

keys().then(key => { 
  var navbar = h('div', {classList: 'navbar'}, [
    h('div', {classList: 'internal'}, [
      h('li', [h('a', {href: '#'}, ['Home'])]),
      h('li', [h('a', {href: '#' + key.publicKey}, [getName(key.publicKey, keys)])]),
      h('li', [h('a', {href: '#key'}, ['Key'])]),
      h('li', [h('a', {href: '#pubs'}, ['Pubs'])]),
      h('li', {classList: 'right'}, [h('a', {href: 'http://git.sr.ht/~ev/bogbook'}, ['Git'])])
    ])
  ])
  document.body.appendChild(navbar)

  route(key)
})

window.onhashchange = function () {
  keys().then(key => {
    var oldscreen = document.getElementById('screen')
    var newscreen = h('div', {id: 'screen'})
    oldscreen.parentNode.replaceChild(newscreen, oldscreen)

    route(key)
  })
}



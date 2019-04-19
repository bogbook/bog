/*function requestFeed (src, server, requester) {

  console.log(src)
  console.log(server)

  var ws = new WebSocket(server + src)

  localforage.getItem(src, function (err, log) {
    if (log) {
      console.log(log)

      var post = log[0]

      var pubkey = nacl.util.decodeBase64(src.substring(1))
      var sig = nacl.util.decodeBase64(post.signature)
      post.content = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

      var seq = post.content.sequence

      ws.onopen = function () {
        var req = {
          feed: src,
          seq,
          requester
        }
        
        console.log(req)

        ws.send(JSON.stringify(req))

      }
      ws.onmessage = function (message) {
        var res = JSON.parse(message.data)
        if (res.seq == null) {
          console.log('SENDING ENTIRE LOG')
          var send = {
            feed: src,
            log,
            requester
          }
          ws.send(JSON.stringify(send))
        }
        if (seq > res.req) {
          console.log('SENDING')
          console.log(log)
        }
      }
    } else {
      ws.onopen = function () {
        var seq = null

      }
      ws.onmessage = function (message) {
        console.log(message.data)
      } 
    }
  })
}*/

// publish new messages to your log
function publish (toPublish, keys) {

  localforage.getItem(keys.publicKey, function (err, log) {
    if (log) {
      var lastPost = log[0]

      var pubkey = nacl.util.decodeBase64(keys.publicKey.substring(1))
      var sig = nacl.util.decodeBase64(lastPost.signature) 

      var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

      var seq = opened.sequence

      toPublish.sequence = ++seq
      toPublish.previous = nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(log[0]))))

      var author = keys.publicKey
      var key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(toPublish))))
      var signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(toPublish)), nacl.util.decodeBase64(keys.privateKey)))

      var toPost = {
         author,
         key,
         signature
      }

      console.log(toPost)

      // update the log
      updateLog(keys.publicKey, toPost)

      /*var scroller = document.getElementById('scroller')
      if (scroller.firstChild) {
        scroller.insertBefore(renderMessage(toPost), scroller.childNodes[1])
      } else {
        scroller.appendChild(renderMessage(toPost))
      }*/

    } else {
      toPublish.sequence = 0

      var toPost = {
         author: keys.publicKey,
         key: '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(toPublish)))),
         signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(toPublish)), nacl.util.decodeBase64(keys.privateKey)))
      }

      updateLog(keys.publicKey, toPost)

      /*var scroller = document.getElementById('scroller')
      if (scroller.firstChild) {
        scroller.insertBefore(renderMessage(toPost), scroller.childNodes[1])
      } else {
        scroller.appendChild(renderMessage(toPost))
      }*/
    }
  })
}

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
          var toPublish = {
            author: keys.publicKey,
            type: 'post',
            text: textarea.value,
            timestamp: Date.now()
          }
          textarea.value = ''
          publish(toPublish, keys)
        }
      }
    }, ['Publish'])
  ])
  message.appendChild(composer)
}


// update your log in the browser

function updateLog (feed, post) {
  localforage.getItem(feed, function (err, log) {
    if (log) {
      log.unshift(post)
      localforage.setItem(feed, log, function () {
        console.log('FEED UPDATED')
      })
    } else {
      log = []
      log.unshift(post)
      localforage.setItem(feed, log, function () {
        console.log('FEED UPDATED')
      })
    }
  })

  localforage.getItem('log', function (err, log) {
    if (log) {
      log.unshift(post)
      localforage.setItem('log', log, function () {
        console.log('LOG UPDATED')
        location.reload()
      })
    } else {
      log = []
      log.unshift(post)
      localforage.setItem('log', log, function () {
        console.log('LOG UPDATED')
        location.reload()
      })
    }
  })
}

function getName (id) {
  var name = h('span')
  name.textContent = id.substring(0, 10) + '...'

  localforage.getItem(id, function (err, log) {
    if (log) {
      for (var i=0; i < log.length; i++) {
        var post = log[i]

        var pubkey = nacl.util.decodeBase64(post.author.substring(1))
        var sig = nacl.util.decodeBase64(post.signature)
        post.content = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

        //if (post.content) {
          if (post.content.type == 'name') {
            name.textContent = '@' + post.content.name
          }
        //}
      }
    }
  })
  return name
}

function getHeader (post, mini) {
  var inner
  if (mini) {
    var inner = mini
  }

  var head = h('span', [
    h('a', {href: '#' + post.key}, [
      h('p', {classList: 'right'}, [human(new Date(post.content.timestamp))]),
    ]),
    h('p', [
      h('a', {href: '#' + post.content.author}, [
        getName(post.content.author)
      ]),
      inner
    ])
  ])
  return head
}


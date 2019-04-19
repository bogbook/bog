

function requestFeed (src, server, requester) {

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
}

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

// human-time by Dave Eddy https://github.com/bahamas10/human

function human(seconds) {
  if (seconds instanceof Date)
    seconds = Math.round((Date.now() - seconds) / 1000);
  var suffix = seconds < 0 ? 'from now' : 'ago';
  seconds = Math.abs(seconds);

  var times = [
    seconds / 60 / 60 / 24 / 365, // years
    seconds / 60 / 60 / 24 / 30,  // months
    seconds / 60 / 60 / 24 / 7,   // weeks
    seconds / 60 / 60 / 24,       // days
    seconds / 60 / 60,            // hours
    seconds / 60,                 // minutes
    seconds                       // seconds
  ];
  var names = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

  for (var i = 0; i < names.length; i++) {
    var time = Math.floor(times[i]);
    var name = names[i];
    if (time > 1)
      name += 's';

    if (time >= 1)
      return time + ' ' + name + ' ' + suffix;
  }
  return '0 seconds ' + suffix;
}

// hscrpt by Dominic Tarr https://github.com/dominictarr/hscrpt/blob/master/LICENSE
function h (tag, attrs, content) {
  if(Array.isArray(attrs)) content = attrs, attrs = {}
  var el = document.createElement(tag)
  for(var k in attrs) el[k] = attrs[k]
  if(content) content.forEach(function (e) {
    if(e) el.appendChild('string' == typeof e ? document.createTextNode(e) : e)
  })
  return el
}


// generate a public.private keypair with TweetNaCl.js

function getKeys () {
  localforage.getItem('id', function(err, value) {
    if (value) {
      var keys = value
      return keys
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
          return keys
        }
      }
    }
  })
  return keys
}

function requestFeed (src, server) {
  var ws = new WebSocket(server + src)

  localforage.getItem(src, function (err, log) {
    if (log) {
      // update the log

      console.log('LOG DOES EXIST, asking')
      ws.onopen = function () {
        // req feed
        var clientLog = {
          publicKey: src,
          log: log
        }
        console.log(clientLog)
        ws.send(JSON.stringify(clientLog))
      }
      ws.onmessage = function (ev) {
        console.log(ev.data)
        var serverLog = JSON.parse(ev.data)

        if (serverLog.log.length > log.length) {
          // update the log of the id
          localforage.setItem(src, serverLog.log)

          // concat new items from the log onto the client's public log
          localforage.getItem('log', function (err, feed) {
            if (feed) {
              var num = serverLog.log.length - log.length
              var diff = serverLog.log.slice(0, num) 
              oldLog = feed
              newLog = diff.concat(oldLog)
              localforage.setItem('log', newLog) 
            } 
          })
        }
      }
    } else {
      ws.onopen = function () {
        // req feed
        var clientLog = {
          publicKey: src,
          log: []
        }
        ws.send(JSON.stringify(clientLog))
      }
      // request the log (because we don't have it)
      console.log('LOG DOES NOT EXIST, asking')
      ws.onmessage = function (ev) {
        serverLog = JSON.parse(ev.data)
        localforage.setItem(src, serverLog.log)

        // concat new items from the log onto the client's public log
        localforage.getItem('log', function (err, feed) {
          if (feed) {
            newLog = serverLog.log.concat(feed)
            localforage.setItem('log', newLog)
          } else {
            localforage.setItem('log', serverLog.log)
          }
        })
      } 
    }
  })
}

// publish new messages to your log
function publish (content, keys) {

  console.log(content) 
  console.log(keys) 
  localforage.getItem(keys.publicKey, function (err, log) {
    if (log) {
      var lastPost = log[0]
      var seq = lastPost.content.sequence
      content.sequence = ++seq
      content.previous = nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(log[0]))))

      var post = {
         content: content,
         signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(content)), nacl.util.decodeBase64(keys.privateKey)))
       }

      // add key (which is a hash of the stringified object post)
      post.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post))))

      // update the log
      updateLog(keys.publicKey, post)

      var pubs = JSON.parse(localStorage['pubs'])

      for (i = 0; i < pubs.length; i++) {
        requestFeed(keys.publicKey, pubs[i])
      }

      var scroller = document.getElementById('scroller')
      if (scroller.firstChild) {
        scroller.insertBefore(renderMessage(post), scroller.childNodes[1])
      } else {
        scroller.appendChild(renderMessage(post))
      }

    } else {
      content.sequence = 0
      var post = {
         content: content,
         signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(content)), nacl.util.decodeBase64(keys.privateKey)))
       }

      // add key (which is a hash of the stringified object post)
      post.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post))))

      // update the log
      updateLog(keys.publicKey, post)

      var pubs = JSON.parse(localStorage['pubs'])

      for (i = 0; i < pubs.length; i++) {
        requestFeed(keys.publicKey, pubs[i])
      }

      var scroller = document.getElementById('scroller')
      if (scroller.firstChild) {
        scroller.insertBefore(renderMessage(post), scroller.childNodes[1])
      } else {
        scroller.appendChild(renderMessage(post))
      }

    }
  })
}

// update your log in the browser

function updateLog (feed, post) {
  console.log('UPDATE LOG')
  console.log(feed)
  console.log(post)
  localforage.getItem(feed, function (err, log) {
    if (log) {
      log.unshift(post)
      localforage.setItem(feed, log)
    } else {
      log = []
      log.unshift(post)
      localforage.setItem(feed, log)
    }
  })

  localforage.getItem('log', function (err, log) {
    if (log) {
      log.unshift(post)
      localforage.setItem('log', log)
    } else {
      log = []
      log.unshift(post)
      localforage.setItem('log', log)
    }

  })
}

// file uploaders for user images

function readFile () {
  if (this.files && this.files[0]) {

    var fr = new FileReader();

    fr.addEventListener("load", function(e) {
      var image = e.target.result
      document.getElementById("img").src       = e.target.result;
      document.getElementById("img").style = 'width: 75px; height: 75px';
      document.getElementById("b64").innerHTML = e.target.result;
    });

    fr.readAsDataURL( this.files[0] );
  }

}


// render messages

function renderMessage (post) {
  var messageDiv = h('messageDiv', {id: post.key})
  var message = h('div', {classList: 'message'})

  if  (post.content.type == 'name') {
    var mini = h('span', [
      ' identified as ',
      post.content.text
    ])

    message.appendChild(getHeader(post, mini))
    //message.appendChild(h('pre', [JSON.stringify(post)]))
  }

  if (post.content.type == 'image') {

    var mini = h('span', [
      ' identified as ',
      h('img', {classList: 'small', src:post.content.image}) 
    ])
 
    message.appendChild(getHeader(post, mini))
    //message.appendChild(h('pre', [JSON.stringify(post)]))
  }

  if (post.content.type == 'post') {

    localforage.getItem('log', function (err, log) {
      if (log) {
        for (var i = log.length - 1; i >= 0; --i) {
          if (log[i].content.reply == post.key) {
            var nextPost = log[i]
            var messageExists = (document.getElementById(nextPost.key) !== null);
            if (!messageExists) {
              messageDiv.appendChild(h('div', {classList: 'submessage'}, [
                renderMessage(nextPost)
              ]))
            }
          }
        }
      }
    })
  
    var renderer = new marked.Renderer();
    renderer.link = function(href, title, text) {
        if ((href[0] == '@') || (href[0] == '%')) {
          href = '#' + href
        }
        var link = marked.Renderer.prototype.link.call(this, href, title, text);
        return link
    }
    
    marked.setOptions({
        renderer: renderer
    });

    message.appendChild(getHeader(post))
    
    if (post.content.reply) {
      message.appendChild(h('span', [
        're: ',
        h('a', {href: '#' + post.content.reply}, [post.content.reply.substring(0, 10) + '...'])
      ]))
    }

    message.appendChild(h('div', {innerHTML: marked(post.content.text)}))

    message.appendChild(h('span', {id: post.key + 'src', classList: 'right'}, [
      h('a', {
        onclick: function () {
          message.appendChild(h('pre', [JSON.stringify(post)]))
          var span = document.getElementById(post.key + 'src') 
          span.parentNode.removeChild(span)
        }
      }, ['[src]'])
    ]))

    var gotName = getName(post.content.author)

    localforage.getItem('id', function (err, keys) {

      var publishButton = h('button', {
        onclick: function () {
          if (textarea.value) {
            var content = {
              author: keys.publicKey,
              type: 'post',
              text: textarea.value,
              reply: post.key,
              timestamp: Date.now()
            }
            publish(content, keys)
            message.removeChild(textarea)
            message.removeChild(publishButton)
          }
        }
      }, ['Publish'])


      var textarea = h('textarea', {placeholder: 'Reply to this bog post'}, ['['+ gotName.textContent + '](' + post.content.author + ')'])

      var replyButton = h('button', {
        classList: 'replyButton:' + post.key,
        onclick: function () {
          message.removeChild(replyButton)
          message.appendChild(textarea)
          message.appendChild(publishButton)
          
        }
      }, ['Reply'])

      message.appendChild(replyButton)
    })

    messageDiv.appendChild(message)
  }

  return messageDiv
}


function getImage (id) {
  var image = h('span')

  //image.appendChild(h('img', {classList: 'small'}))

  localforage.getItem(id, function (err, log) {
    if (log) {
      for (var i=0; i < log.length; i++) {
        var imagePost = log[i]
        if (imagePost.content.type == 'image') {
          image.appendChild(h('img', {classList: 'small', src: imagePost.content.image}))
          return
        } 
      }
    }
  })

  return image
}

function getName (id) {
  var name = h('span')
  name.textContent = id.substring(0, 10) + '...'

  localforage.getItem(id, function (err, log) {
    if (log) {
      for (var i=0; i < log.length; i++) {
        var namePost = log[i]
        if (namePost.content.type == 'name') {
          name.textContent = '@' + namePost.content.text
          //return name
        }
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
        getImage(post.content.author),
        getName(post.content.author)
      ]),
      inner
    ])
  ])
  return head
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


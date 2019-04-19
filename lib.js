// generate a public.private keypair with TweetNaCl.js

function requestFeed (src, server) {
  var ws = new WebSocket(server + src)

  localforage.getItem(src, function (err, log) {
    if (log) {
      ws.onopen = function () {
        var clientLog = { publicKey: src, log: log }
        ws.send(JSON.stringify(clientLog))
      }
      ws.onmessage = function (ev) {
        var serverLog = JSON.parse(ev.data)

        if (serverLog.log.length > log.length) {
          localforage.setItem(src, serverLog.log)
          localforage.getItem('log', function (err, publicLog) {
            if (publicLog) {
              var num = serverLog.log.length - publicLog.length
              var diff = serverLog.log.slice(0, num) 
              newLog = diff.concat(publicLog)
              localforage.setItem('log', newLog)
            } else {
            localforage.setItem('log', serverLog.log)
            }
          })
        } 
      }
    } else {
      ws.onopen = function () {
        var clientLog = {
          publicKey: src,
          log: []
        }
        ws.send(JSON.stringify(clientLog))
      }
      ws.onmessage = function (ev) {
        serverLog = JSON.parse(ev.data)
        localforage.setItem(src, serverLog.log)
        localforage.getItem('log', function (err, publicLog) {
          if (publicLog) {
            newLog = serverLog.log.concat(publicLog)
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

      var pubkey = nacl.util.decodeBase64(keys.publicKey.substring(1))
      var sig = nacl.util.decodeBase64(lastPost.signature) 
      var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

      console.log(opened)

      var seq = opened.sequence
      content.sequence = ++seq
      content.previous = nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(log[0]))))

      var post = {
         author: keys.publicKey,
         key: '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(content)))),
         signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(content)), nacl.util.decodeBase64(keys.privateKey)))
      }

      // update the log
      updateLog(keys.publicKey, post)

      var scroller = document.getElementById('scroller')
      if (scroller.firstChild) {
        scroller.insertBefore(renderMessage(post), scroller.childNodes[1])
      } else {
        scroller.appendChild(renderMessage(post))
      }

    } else {
      content.sequence = 0

      var post = {
         author: keys.publicKey,
         key: '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(content)))),
         signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(content)), nacl.util.decodeBase64(keys.privateKey)))
      }

      updateLog(keys.publicKey, post)

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
            console.log(post.content.name)
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


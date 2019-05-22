// bog.open -- opens a signature and returns content if you pass a signature and a public key
// EX:  open(msg).then(content => { console.log(content) })

async function open (msg) {

  var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
  var sig = nacl.util.decodeBase64(msg.signature)
  var opened = await JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))

  opened.key = msg.key

  return opened
}

// bog.keys -- gets your public/private keypair, generates one if there is none
// EX: keys().then(key => { console.log(key)})

async function keys (key) { 
  var keypair = await localforage.getItem('id')
  if (keypair != null) {
    return keypair
  } else {
    var genkey = nacl.sign.keyPair()
    var keypair = {
      publicKey: '@' + nacl.util.encodeBase64(genkey.publicKey),
      privateKey: nacl.util.encodeBase64(genkey.secretKey)
    }
    if (keypair.publicKey.includes('/')) {
      console.log('TRYING AGAIN')
      setTimeout(function () {
        location.reload()
      }, 10)
    } else {
      localforage.setItem('id', keypair)
    }

    return keypair 
  }
}

// bog.get -- iterates over log and returns a post.
// EX: get('%x5T7KZ5haR2F59ynUuCggwEdFXlLHEtFoBQIyKYppZYerq9oMoIqH76YzXQpw2DnYiM0ugEjePXv61g3E4l/Gw==').then(msg => { console.log(msg)})

async function get (key) {
  var log = await localforage.getItem('log')
  if (log != null) {
    for (var i = log.length - 1; i >= 0; --i) {
      if (log[i].key === key) {
        return log[i]
      }
    }
  }
}

// bog.getName -- iterates over a feed and returns a person's name

function getName (id) {
  var name = h('span')

  name.textContent = id.substring(0, 10) + '...'

  bog().then(log => {
    for (var i = 0; i < log.length; i++ ) {
      if (log[i].named == id) {
        console.log(log[i].name)
        return name.textContent = '@' + log[i].name
      }
    }
  })

  return name
}

// bog.regenerate -- regenerates main log by taking all of the feed logs, combinging them, and then sorting them

function regenerate () {
  var newlog = []
  var openedlog = []
  localforage.iterate(function(value, key, i) {
    if (key[0] == '@') {
      newlog = newlog.concat(value)
    }
    console.log(newlog)
  }).then(function () {
    newlog.forEach(function (msg) {
      var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
      var sig = nacl.util.decodeBase64(msg.signature)
      var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
      opened.key = msg.key

      openedlog.push(opened)
    })
    console.log(openedlog)

    openedlog.sort((a, b) => a.timestamp - b.timestamp)

    var reversed = openedlog.reverse()
    console.log('REGENERATE')
    localforage.setItem('log', reversed).then(function () {location.reload()})
  })
}

// bog.log (feed) -- returns a specific feed if a parameter is passed, if not returns the entire log
// EX: bog().then(log => { console.log(log)})
// EX: bog('@ExE3QXmBhYQlGVA3WM2BD851turNzwhruWbIpMd7rbQ=').then(log => { console.log(log)})


async function bog (feed) {
  if (feed) {
    var log = await localforage.getItem(feed)
    return log
  } else {
    var log = await localforage.getItem('log')
    return log
  }
}

// bog.publish -- publishes a new bog post and updates the feeds
// EX: publish({type: 'post', timestamp: Date.now(), text: 'Hello World'}).then(msg => { console.log(msg)})

async function publish (post, keys) {
  post.author = keys.publicKey

  post.timestamp = Date.now() 

  var message = { 
    author: keys.publicKey 
  }
  
  var feed = await localforage.getItem(keys.publicKey)

  if (feed) {
    var firstMsg = await open(feed[0])

    post.seq = ++firstMsg.seq

    message.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post)))),
    message.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(post)), nacl.util.decodeBase64(keys.privateKey)))

    var openedMsg = await open(message)

    localforage.getItem('log').then(log => {
      if (log) {
        log.unshift(openedMsg)
        localforage.setItem('log', log)
      } else {
        var feed = [openedMessage]
        localforage.setItem('log', feed)
      }
    })

    feed.unshift(message)
    localforage.setItem(keys.publicKey, feed)
    sync(keys.publicKey, keys)    
    return message

  } else {

    post.seq = 1 

    message.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post)))),
    message.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(post)), nacl.util.decodeBase64(keys.privateKey)))

    var openedMsg = await open(message)

    localforage.getItem('log').then(log => {
      if (log) {
        log.unshift(openedMessage)
        localforage.setItem('log', log)
      } else {
        var feed = [openedMessage]
        localforage.setItem('log', feed)
      }
    })

    var feed = [message]
    localforage.setItem(keys.publicKey, feed)

    sync(keys.publicKey, keys)    
    return message
  }
}



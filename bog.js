
// so bog.js works in node.js and the browser
if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  var fs = require('fs')
  var nacl = require('tweetnacl')
      nacl.util = require('tweetnacl-util')
  var ed2curve = require('ed2curve')
  var homedir = require('os').homedir()
}

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


function generatekey () {
  var keypair = {
    publicKey : '@/'
  }
  console.log('generating new keypair')
  while (keypair.publicKey.includes('/')) {
    var genkey = nacl.sign.keyPair()
    keypair.publicKey = '@' + nacl.util.encodeBase64(genkey.publicKey),
    keypair.privateKey = nacl.util.encodeBase64(genkey.secretKey)
  }
  return keypair
}

async function keys () {
  try {
    if (fs) {
      var keypair = JSON.parse(fs.readFileSync(homedir + '/.bogbook/keypair'))
    } else {
      var keypair = await localforage.getItem('id')
      if (keypair === null) {
        var keypair = generatekey()
        localforage.setItem('id', keypair)
      }
    }
  } catch (err) {
    var keypair = generatekey()
    if (fs) {
      if (!fs.existsSync(homedir + '/.bogbook')){
        fs.mkdirSync(homedir + '/.bogbook')
      }
      fs.writeFileSync(homedir + '/.bogbook/keypair', JSON.stringify(keypair), 'UTF-8')
    }
  }
  return keypair
}

// bog.box -- encrypts a message to a pubkey

async function box (msg, recp, keys) {
  var nonce = nacl.randomBytes(nacl.box.nonceLength)
  var message = nacl.util.decodeUTF8(msg)
  var encrypted = nacl.box(message, nonce, ed2curve.convertPublicKey(nacl.util.decodeBase64(recp.substring(1))), ed2curve.convertSecretKey(nacl.util.decodeBase64(keys.privateKey)))
  var nonceMsg = nacl.util.encodeBase64(nonce) + nacl.util.encodeBase64(encrypted)
  return nonceMsg 
}

//bog.unbox -- decrypts a message sent to our pubkey
async function unbox (boxed, sender, keys) {
  var nonceMsg = nacl.util.decodeBase64(boxed)
  var nonce = nonceMsg.slice(0, nacl.box.nonceLength)
  var msg = nonceMsg.slice(nacl.box.nonceLength, nonceMsg.length)
  var message = nacl.box.open(msg, nonce, ed2curve.convertPublicKey(nacl.util.decodeBase64(sender.substring(1))), ed2curve.convertSecretKey(nacl.util.decodeBase64(keys.privateKey)))
  return message
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

// bog.getImage

function getImage (id, keys, classList) {
  if (classList) {
    var image = h('img', {classList: classList})
  } else {
    var image = h('img', {classList: 'avatar'})
  }

  localforage.getItem('image:' + id).then(cache => {
    //if (cache) {
    //  return image.src = cache
    //} else {
      bog().then(log => {
        if (log) {
          for (var i = 0; i < log.length; i++) {
            if ((log[i].imaged === id) && (log[i].author === keys.publicKey)) {
              // if you've identified someone as something else show that something else
              localforage.setItem('image:' + id, log[i].image)
              image.src = cache
              return image.src = cache
            } else if ((log[i].imaged === id) && (log[i].author === id)) {
              // else if show the image they gave themselves
              localforage.setItem('image:' + id, log[i].image)
              image.src = cache
              return image.src = cache
            }
          }
        }
      })
    //}
  })
  return image
}

// bog.getName -- iterates over a feed and returns a person's name

function getName (id, keys) {
  var name = h('span')

  name.textContent = id.substring(0, 10) + '...'

  localforage.getItem('name:' + id).then(cache => {
    if (cache) {
      //console.log(cache)
      return name.textContent = '@' + cache
    } else {
      bog().then(log => {
        if (log) {
          for (var i = 0; i < log.length; i++ ) {
            if ((log[i].named === id) && (log[i].author === keys.publicKey)) {
              // if you've identified someone as something else show that something else
              localforage.setItem('name:' + id, log[i].name)
              return name.textContent = '@' + log[i].name
            } else if ((log[i].named === id) && (log[i].author === id)) {
              // else if show the name they gave themselves
              localforage.setItem('name:' + id, log[i].name)
              return name.textContent = '@' + log[i].name
            }
            // there should probably be some sort of sybil attack resiliance here (weight avatar name based on number of times used by individuals), but this will do for now.
          }
        } 
      })
    }
  })
  return name
}

async function quickName (id, keys) {
  var cache = await localforage.getItem('name:' + id)

  if (cache) {
    return '@' + cache
  } else {
    return id.substring(0, 10)
  }
}

// bog.regenerate -- regenerates main log by taking all of the feed logs, combinging them, and then sorting them

function regenerate (home) {
  var newlog = []
  var openedlog = []
  localforage.iterate(function(value, key, i) {
    if (key[0] == '@') {
      newlog = newlog.concat(value)
    }
    //console.log(newlog)
  }).then(function () {
    newlog.forEach(function (msg) {
      var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
      var sig = nacl.util.decodeBase64(msg.signature)
      var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
      opened.key = msg.key

      openedlog.push(opened)
    })
    //console.log(openedlog)

    openedlog.sort((a, b) => a.timestamp - b.timestamp)

    var reversed = openedlog.reverse()
    console.log('REGENERATE')
    localforage.setItem('log', reversed).then(function () {
      if (home) {
        location.hash = ''
      }
      location.reload()
    })
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

async function publish (post, keys, preview) {
  post.author = keys.publicKey
  post.timestamp = Date.now() 

  var message = { 
    author: keys.publicKey 
  }
  
  var feed = await localforage.getItem(keys.publicKey)

  if (feed) {
    var firstMsg = await open(feed[0])
    post.seq = ++firstMsg.seq
  } else {
    post.seq = 1
  }

  message.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post)))),
  message.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(post)), nacl.util.decodeBase64(keys.privateKey)))

  var openedMsg = await open(message)

  if (!preview) {
    console.log('ADDING TO LOG AND FEED')
    localforage.getItem('log').then(log => {
      if (log) {
        log.unshift(openedMsg)
        localforage.setItem('log', log)
      } else {
        var newlog = [openedMsg]
        localforage.setItem('log', newlog)
      }
    })

    var subs = [keys.publicKey]

    if (feed) {
      feed.unshift(message)
    } else {
      var feed = [message]
    }

    localforage.setItem(keys.publicKey, feed).then(function () {
      sync(subs, keys)    
    })
  }
  return message
}

if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  module.exports = {
    keys,
    open,
    box,
    unbox
  }
}

// so bog.js works in node.js and the browser
if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  // We are on the server
  var fs = require('fs')
  var pfs = fs.promises
  var nacl = require('tweetnacl')
      nacl.util = require('tweetnacl-util')
  var ed2curve = require('ed2curve')
  var bogdir = require('os').homedir() + '/.bogbook/'
} else {
  // We are in the browser
  var fs = new LightningFS('bogbook')
  var pfs = fs.promises
  var bogdir = '/'
}

pfs.readdir(bogdir + 'bogs/').then(result => {
  console.log(result)
}).catch(error => {
  pfs.mkdir(bogdir + 'bogs/')
})

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
  while (keypair.publicKey.includes('/')) {
    var genkey = nacl.sign.keyPair()
    keypair.publicKey = '@' + nacl.util.encodeBase64(genkey.publicKey),
    keypair.privateKey = nacl.util.encodeBase64(genkey.secretKey)
  }
  return keypair
}

async function keys () {
  try {
    var keypair = JSON.parse(await pfs.readFile(bogdir + 'keypair', 'utf8'))
  } catch {
    keypair = generatekey()
    await pfs.writeFile(bogdir + 'keypair', JSON.stringify(keypair), 'utf8')
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
  var message = nacl.util.encodeUTF8(nacl.box.open(msg, nonce, ed2curve.convertPublicKey(nacl.util.decodeBase64(sender.substring(1))), ed2curve.convertSecretKey(nacl.util.decodeBase64(keys.privateKey))))
  return message
}

// bog.get -- iterates over log and returns a post.
// EX: get('%x5T7KZ5haR2F59ynUuCggwEdFXlLHEtFoBQIyKYppZYerq9oMoIqH76YzXQpw2DnYiM0ugEjePXv61g3E4l/Gw==').then(msg => { console.log(msg)})

async function get (key) {
  var log = await readBog()

  for (var i = log.length - 1; i >= 0; --i) {
    if (log[i].key === key) {
      return log[i]
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

  readBog().then(log => {
    for (var i = 0; i < log.length; i++) {
      if ((log[i].imaged === id) && (log[i].author === keys.publicKey)) {
        // if you've identified someone as something else show that something else
        pfs.writeFile(bogdir + 'image:' + id, log[i].image, 'utf8')
        return image.src = log[i].image
      } else if ((log[i].imaged === id) && (log[i].author === id)) {
        // else if show the image they gave themselves
        pfs.writeFile(bogdir + 'image:' + id, log[i].image, 'utf8')
        return image.src = log[i].image
      }
    }
  })
  return image
}

// bog.getName -- iterates over a feed and returns a person's name

function getName (id, keys) {
  var name = h('span')

  name.textContent = id.substring(0, 10) + '...'

  readBog().then(log => {
    for (var i = 0; i < log.length; i++ ) {
      if ((log[i].named === id) && (log[i].author === keys.publicKey)) {
        // if you've identified someone as something else show that something else
        pfs.writeFile(bogdir + 'name:' + id, log[i].name, 'utf8')
        return name.textContent = '@' + log[i].name
      } else if ((log[i].named === id) && (log[i].author === id)) {
        // else if show the name they gave themselves
        pfs.writeFile(bogdir + 'name:' + id, log[i].name, 'utf8')
        return name.textContent = '@' + log[i].name
      }
      // there should probably be some sort of sybil attack resiliance here (weight avatar name based on number of times used by individuals), but this will do for now.
    }
  })
  return name
}

function getQuickImage (id, keys) {
  var image = h('img', {classList: 'avatar'})
  pfs.readFile(bogdir + 'image:' + id, 'utf8').then(cache => {
    image.src = cache
  }).catch(error => {})

  return image
}

function getQuickName (id, keys) {
  var name = h('span', [id.substring(0, 10)])

  pfs.readFile(bogdir + 'name:' + id, 'utf8').then(cache => {
    if (cache) {
      name.textContent = '@' + cache
    } 
  }).catch(error => {})

  return name
}

async function quickName (id, keys) {
  try { 
    var cache = await pfs.readFile(bogdir + 'name:' + id, 'utf8') 
    return '@' + cache
  } catch {
    return id.substring(0, 10)
  }
}

async function removefeed (src) {
  if (src[0] == '@') {
    await pfs.unlink(bogdir + 'bogs/' + src)
  } else {
    await pfs.unlink(bogdir + src)
  }
}

async function removeall () {
  var bogs = await(pfs.readdir(bogdir + 'bogs/'))

  for (i = 0; i < bogs.length; i++) {
    await pfs.unlink(bogdir + 'bogs/' + bogs[i])
  }

  var array = await(pfs.readdir(bogdir))
  for (i = 0; i < array.length; i++) {
    await pfs.unlink(bogdir + array[i])
  }
}

// bog.regenerate -- regenerates main log by taking all of the feed logs, combining them, and then sorting them -- this is only run when you delete a feed these days

async function regenerate () {
  var newlog = []
  var openedlog = []

  var array = await(pfs.readdir(bogdir + 'bogs/'))

  for (i = 0; i < array.length; i++) {
    var name = array[i]
    console.log(name[0])
    if(name[0] == '@') {
      var value = await readBog(name)
      console.log(value)
      newlog = newlog.concat(value)
      console.log(newlog)
    }
  }

  newlog.forEach(function (msg) {
    console.log(msg)
    var pubkey = nacl.util.decodeBase64(msg.author.substring(1))
    var sig = nacl.util.decodeBase64(msg.signature)
    var opened = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))
    opened.key = msg.key

    openedlog.push(opened)
  })

  openedlog.sort((a, b) => a.timestamp - b.timestamp)

  var reversed = openedlog.reverse()
  await writeBog('log', reversed)
  return
}

// readBog (feed) -- returns a specific feed if a parameter is passed
// EX: bog('log').then(log => { console.log(log)})
// EX: bog('@ExE3QXmBhYQlGVA3WM2BD851turNzwhruWbIpMd7rbQ=').then(log => { console.log(log)})

async function readBog (feed) {
  if (!feed) { var feed = 'log' }
  if (feed[0] == '@') {
    try {
      var log = JSON.parse(await pfs.readFile(bogdir + 'bogs/' + feed, 'utf8'))
    } catch {
      var log = [] 
    }
  } else {
    try {
      var log = JSON.parse(await pfs.readFile(bogdir + feed, 'utf8'))
    } catch {
      var log = [] 
    }
  }
  return log
}

async function writeBog (feed, log) {
  if (feed[0] == '@') { 
    await pfs.writeFile(bogdir + 'bogs/'+ feed, JSON.stringify(log), 'utf8')
  } else {
    await pfs.writeFile(bogdir + feed, JSON.stringify(log), 'utf8')
  }
}

// bog.publish -- publishes a new bog post and updates the feeds
// EX: publish({type: 'post', timestamp: Date.now(), text: 'Hello World'}, keys).then(msg => { console.log(msg)})

async function publish (post, keys, preview) {
  post.author = keys.publicKey
  post.timestamp = Date.now() 

  var message = { 
    author: keys.publicKey 
  }

  var feed = await readBog(keys.publicKey)

  if (feed[0]) {
    var firstMsg = await open(feed[0])
    post.seq = ++firstMsg.seq
  } else {
    post.seq = 1
  }

  // we need to change the key to a shorter hash such as sha2 or blake2
  message.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post))))
  message.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(post)), nacl.util.decodeBase64(keys.privateKey)))

  var openedMsg = await open(message)

  if (!preview) {
    readBog().then(log => {
      log.unshift(openedMsg)
      writeBog('log', log)
      feed.unshift(message)
      writeBog(keys.publicKey, feed)  
    })
  }
  return message
}

if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
  module.exports = {
    keys,
    open,
    box,
    unbox,
    regenerate,
    readBog,
    writeBog
  }
}

// generate a public.private keypair with TweetNaCl.js

function getKeys () {
  if (localStorage['id']) {
    var keys = JSON.parse(localStorage['id'])
    return keys
  } else {

    var genkey = nacl.sign.keyPair()
    if (genkey) {
      var keys = {
        publicKey: '@' + nacl.util.encodeBase64(genkey.publicKey),
        privateKey: nacl.util.encodeBase64(genkey.secretKey),
      }

      console.log(genkey)

      // for some reason keys with /'s in them mess up node, so we'll try generating keys again if they contain slashes
      if (keys.publicKey.includes('/')) {
        console.log('TRYING AGAIN')
        setTimeout(function () {
          window.location.reload()
        }, 10)
      } else {
        localStorage['id'] = JSON.stringify(keys)
        return keys
      }
    }
  }
}

// publish new messages to your log
function publish (content, keys) {

  if (localStorage[keys.publicKey]) {
    var log = JSON.parse(localStorage[keys.publicKey])
    var lastPost = log[0]
    var seq = lastPost.content.sequence
    content.sequence = ++seq
    content.previous = nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(log[0]))))
    console.log(content.previous)
  } else {
    console.log('SEQUENCE 0')
    content.sequence = 0
  }

  var post = {
     content: content,
     signature: nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(content)), nacl.util.decodeBase64(keys.privateKey)))
   }

  // add key (which is a hash of the stringified object post)
  post.key = '%' + nacl.util.encodeBase64(nacl.hash(nacl.util.decodeUTF8(JSON.stringify(post))))

  // update the log
  updateLog(keys.publicKey, post)

  var scroller = document.getElementById('scroller')
  if (scroller.firstChild) {
    scroller.insertBefore(renderMessage(post), scroller.childNodes[1])
  } else {
    scroller.appendChild(renderMessage(post))
  }
}

// update your log in the browser

function updateLog (feed, post) {
  if (localStorage[feed]) {
    var log = JSON.parse(localStorage[feed])
    log.unshift(post)
    localStorage[feed] = JSON.stringify(log)
  } else {
    var log = [post]
    localStorage[feed] = JSON.stringify(log)
  }

  if (localStorage['log']) {
    var log = JSON.parse(localStorage['log'])
    log.unshift(post) 
    localStorage['log'] = JSON.stringify(log)
  } else {
    var log = [post]
    localStorage['log'] = JSON.stringify(log)
  }
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

    var log = JSON.parse(localStorage['log'])
    setTimeout(function () {
    for (var i = log.length - 1; i >= 0; --i) {
      //console.log(i)
      if (log[i].content.reply == post.key) {
          var nextPost = log[i]
          console.log(nextPost)
          var messageExists = (document.getElementById(nextPost.key) !== null);
          if (!messageExists) {
            messageDiv.appendChild(h('div', {classList: 'submessage'}, [
              renderMessage(nextPost)
            ]))
          }
        }
      }
    }, 10)

    var renderer = new marked.Renderer();
    renderer.link = function(href, title, text) {
        if (href[0] == '@') {
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
        h('a', {href: '#' + post.content.reply}, [post.content.reply])
      ]))
    }

    message.appendChild(h('div', {innerHTML: marked(post.content.text)}))
    message.appendChild(h('pre', [JSON.stringify(post)]))

    var gotName = getName(post.content.author)

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
          console.log(content)
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
    messageDiv.appendChild(message)
  }

  return messageDiv
}


function getImage (id) {
  var image = h('img', {classList: 'small'})

  if (localStorage[id]) {
    var log = JSON.parse(localStorage[id])
    for (var i=0; i < log.length; i++) {
      var imagePost = log[i]
      if (imagePost.content.type == 'image') {
        image = h('img', {classList: 'small', src: imagePost.content.image})
        return image
      } 
    }
  }

  return image
}

function getName (id) {
  var name = h('span', [id])
  if (localStorage[id]) {
    var log = JSON.parse(localStorage[id])
    for (var i=0; i < log.length; i++) {
      var namePost = log[i]
      if (namePost.content.type == 'name') {
        name = h('span', ['@' + namePost.content.text])
        return name
      }
    }
  }
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


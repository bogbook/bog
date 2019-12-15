function renderAd (ad) {
  var screen = document.getElementById('screen')
  var adspot = document.getElementById('ad')

  if (adspot) {
    adspot.parentNode.removeChild(adspot)
  }

  var adspace = h('span')

  if (ad.views) {
    adspace.appendChild(h('span', {classList: 'right'}, [h('pre', [ad.views + ' views'])]))
  } else {
    adspace.appendChild(h('span', {classList: 'right'}, [h('pre', ['ad'])]))
  }

  open(ad).then(opened => {
    quickName(ad.author).then(gotName => {
      newAd = h('div', {id: 'ad'}, [
        adspace,
        h('p', {innerHTML: marked(opened)}),
        h('button', {classList: 'right',
          onclick: function () {
            adspot = document.getElementById('ad')
            adspot.parentNode.removeChild(adspot)
          }
        }, ['Heard']),
        h('span', [
          '—',
          h('a', {href: '#' + ad.author}, [gotName]),
          ' from ',
          h('a', {href: ad.name}, [ad.name])
        ])
      ])
      screen.appendChild(newAd)
    }) 
  })
}

function getHeader (post, keys, mini) {
  var getRaw = h('button', {
    onclick: function () {
      var raw = h('pre', [h('code', [JSON.stringify(post)])])
      var removeRaw = h('button', {
        onclick: function () {
          raw.parentNode.removeChild(raw)
          removeRaw.parentNode.replaceChild(getRaw, removeRaw)
        }   
      }, ['hide'])
      getRaw.parentNode.replaceChild(removeRaw, getRaw)      
      head.appendChild(raw)
    }
  }, ['raw'])

  var head = h('span', [
    h('p', {classList: 'right'}, [
      h('a', {href: '#' + post.key}, [
        human(new Date(post.timestamp)),
      ]),
      ' ',
      getRaw
    ]),
    h('p', [
      h('a', {href: '#' + post.author}, [
        getImage(post.author, keys),
        getName(post.author, keys)
      ]),
      mini 
    ])
  ])
  return head
}

function render (msg, keys, preview) {
  var messageDiv = h('div', {id: msg.key})
  var message = h('div', {classList: 'message'})

  bog().then(log => {
    if (log) {
      log.reverse().forEach(function (nextPost) {
        if (nextPost.edited == msg.key) {
          var messageExists = (document.getElementById(nextPost.key) !== null)
          var msgcontents = document.getElementById('content:' + msg.key)

          msg.text = nextPost.text

          var editedcontents = h('span', {id : 'content:' + msg.key, innerHTML: marked(nextPost.text)}) 
          if (msgcontents) {
            msgcontents.parentNode.replaceChild(editedcontents, msgcontents)
          }
          message.firstChild.appendChild(h('div', [
            'edited in:', 
            h('a', {href: '#' + nextPost.key}, [nextPost.key.substring(0, 10) + '...'])
          ]))
          if (!messageExists) {
            messageDiv.appendChild(h('div', {classList: 'submessage'}, [render(nextPost, keys)]))
          }
        }

        if (nextPost.reply == msg.key) {
          var messageExists = (document.getElementById(nextPost.key) !== null)
          if (!messageExists) {
            messageDiv.appendChild(h('div', {classList: 'submessage'}, [render(nextPost, keys)]))
          }
        }
      })
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
  })

  if (msg.type == 'edit') {
    message.appendChild(getHeader(msg, keys))

    message.firstChild.appendChild(h('span', [
      'edited: ',
       h('a', {href: '#' + msg.edited}, [msg.edited.substring(0, 10) + '...'])
    ]))

    var contents = h('div')
    message.appendChild(contents)

    get(msg.edited).then(previous => {
      fragment = document.createDocumentFragment()
      var diff = JsDiff.diffWords(previous.text, msg.text)
      diff.forEach(function (part) {
        if (part.added === true) {
          color = 'blue'
        } else if (part.removed === true) {
          color = 'gray'
        } else {color = '#333'}
        var span = h('span')
        span.style.color = color
        if (part.removed === true) {
          span.appendChild(h('del', document.createTextNode(part.value)))
        } else {
          span.appendChild(document.createTextNode(part.value))
        }
        fragment.appendChild(span)
      })
      contents.appendChild(h('code', [fragment]))
    })
  }

  if (msg.type == 'post') {
    message.appendChild(getHeader(msg, keys))

    if (msg.reply) {
      //message.appendChild(h('span', [
      message.firstChild.appendChild(h('span', [
        're: ',
        h('a', {href: '#' + msg.reply}, [msg.reply.substring(0, 10) + '...'])
      ]))
    }
    message.appendChild(h('div',{id: 'content:' + msg.key, innerHTML: marked(msg.text)}))
    if (!preview) {
      message.appendChild(h('button', {
        onclick: function () {
          quickName(msg.author).then(name => {
            if (messageDiv.firstChild) {
              messageDiv.insertBefore(h('div', {classList: 'submessage'}, [composer(keys, msg, name)]), messageDiv.childNodes[1])
            } else {
              messageDiv.appendChild(h('div', {classList: 'submessage'}, [composer(keys, msg, name)])) 
            }
          })
        }
      }, ['Reply']))
      if (msg.author === keys.publicKey) {
        message.appendChild(h('button', {
          onclick: function () {
            var editor = h('div', {classList: 'submessage'}, [composer(keys, msg, {name: false}, {edit: true})])
            messageDiv.appendChild(editor)
          }
        }, ['Edit']))
      }
    }
  } else if (msg.type == 'name') {
    var mini = h('span', [' identified ', h('a', {href: '#' + msg.named }, [msg.named.substring(0, 10) + '...']), ' as ' + msg.name])
    message.appendChild(getHeader(msg, keys, mini))
  } else if (msg.type == 'image') {
    var mini = h('span', [
      ' identified ', 
      h('a', { href: '#' + msg.imaged }, [msg.imaged.substring(0, 10) + '...']), 
      ' as ', 
      h('img', {src: msg.image, classList: 'avatar'})
    ])
    message.appendChild(getHeader(msg, keys, mini))
  } 

  messageDiv.appendChild(message)
  return messageDiv
}

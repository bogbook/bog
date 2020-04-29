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
      getLoc(post),
      ' ',
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

  readBog().then(log => {
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

        if (nextPost.imaged == msg.key) {

          var img = h('img', {
            src: nextPost.image,
            classList: 'image',
            onclick: function () {
              var viewimg = h('div', {id: 'viewer', onclick: function () {
                  var viewer = document.getElementById('viewer')
                  viewer.parentNode.removeChild(viewer)
                }}, [
                h('img', {
                  src: nextPost.image
                })
              ])
              document.body.appendChild(viewimg)
            }
          })
          
           message.insertBefore(img, message.childNodes[message.childNodes.length - 1])
        }
      })
    }
  })

  var renderer = new marked.Renderer();
  renderer.paragraph = function (paragraph) {
    var array = paragraph.split(' ')

    for (i = 0; i < array.length; i++) {
      word = array[i]
      if (word.startsWith('#')) {
        let end
        //console.log(word + ' is a hashtag')
        if ((word[word.length -1] === '.') || word[word.length - 1] === ',') {
          //console.log('and it ends with a ' + word[word.length - 1])
          end = word[word.length - 1]
          word = word.substring(0, word.length - 1)
        }
        var hashtag = "<a href='#?" + word + "'>" + word + "</a>"
        if (end) {
          hashtag = hashtag + end
        }
        //console.log(hashtag)
        array[i] = hashtag
      }
    }

    newgraph = array.join(' ')
    
    return newgraph + '<br /><br />'
  }
  renderer.link = function (href, title, text) {
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
      if (previous) {
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
      }
    })
  }

  if (msg.type == 'post') {
    var mini = h('span', [' '])

    message.appendChild(getHeader(msg, keys, mini))

    if (msg.reply) {
      get(msg.reply).then(msgg => {
        if (!msgg) {
          title = msg.reply.substring(0, 15) + '…'
        } else {
          title = msgg.text.substring(0, 15) + '…'
        }
        mini.appendChild(h('span', [
          '↳ ',
          h('a', {href: '#' + msg.reply}, [title])
        ]))

      })
    }


    message.appendChild(h('div',{id: 'content:' + msg.key, innerHTML: marked(msg.text)}))
    var buttons = h('div')
    if (!preview) {
      buttons.appendChild(h('button', {
        onclick: function () {
          quickName(msg.author).then(name => {
            var compose = h('div', {classList: 'submessage'}, [composer(keys, msg, name)])
            if (messageDiv.firstChild) {
              messageDiv.insertBefore(compose, messageDiv.childNodes[1])
            } else {
              messageDiv.appendChild(compose) 
            }
          })
        }
      }, ['Reply']))
      if (msg.author === keys.publicKey) {
        buttons.appendChild(h('button', {
          onclick: function () {
            var editor = h('div', {classList: 'submessage'}, [composer(keys, msg, {name: false}, {edit: true})])
            messageDiv.appendChild(editor)
          }
        }, ['Edit']))
        buttons.appendChild(identify(msg.key, message, keys))
      }

      message.appendChild(buttons)
    }
  } if (msg.type == 'name') {
    var mini = h('span', [' identified ', h('a', {href: '#' + msg.named }, [msg.named.substring(0, 10) + '...']), ' as ' + msg.name])
    message.appendChild(getHeader(msg, keys, mini))

  } if (msg.type == 'image') {
    var mini = h('span', [
      ' added an image to ', 
      h('a', { href: '#' + msg.imaged }, [
        msg.imaged.substring(0, 10) + '...',
        ' ', 
        h('img', {src: msg.image, classList: 'avatar'})
      ]) 
    ])
    message.appendChild(getHeader(msg, keys, mini))

  } if (msg.type == 'background') {
    var mini = h('span', [
      ' added a background to ', 
      h('a', { href: '#' + msg.backgrounded }, [msg.backgrounded.substring(0, 10) + '...']), 
      ' ', 
      h('img', {src: msg.background, classList: 'avatar'})
    ])
    message.appendChild(getHeader(msg, keys, mini))

  } if (msg.type == 'description') {
    var mini = h('span', [
      ' added a description to ',
      h('a', { href: '#' + msg.descripted }, [msg.descripted.substring(0, 10) + '...']),
      ' ',
      h('div', {innerHTML: marked(msg.description)})
    ])
    message.appendChild(getHeader(msg, keys, mini))

  } if (msg.type == 'location') {
    var mini = h('span', [
      ' added a location to ',
      h('a', { href: '#' + msg.located }, [msg.located.substring(0, 10) + '...']),
    ': ',
    msg.loc
    ])
    message.appendChild(getHeader(msg, keys, mini))
  }

  messageDiv.appendChild(message)
  return messageDiv
}

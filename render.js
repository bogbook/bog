function addButton (post, message, keys) {
  function readFile () {
    if (this.files && this.files[0]) {
  
      var fr = new FileReader()
  
      fr.addEventListener("load", function(e) {
        var image = e.target.result
        document.getElementById("img").src = image
      });
  
      fr.readAsDataURL( this.files[0] )
    }
  }

  readFile()

  var imageInput = h('span', [
    h('input', {id: 'inp', type:'file'}),
    h('img', {id: 'img'})
  ])


  var locInput = h('input', {placeholder: 'New location'})
  var locDiv = h('div', [
    locInput,
    h('button', {
      onclick: function () {
        var obj = {
          type: 'location',
          located: post.key,
          loc: locInput.value 
        }
        publish(obj, keys).then(published => {
          open(published).then(opened => {
	    message.parentNode.appendChild(h('div', {classList: 'submessage'}, [render(opened, keys)]))
            locDiv.parentNode.removeChild(locDiv)
          })
        })
      }
    }, ['Publish'])
  ]) 

  var valueInput = h('input', {placeholder: '0.00'})
  var currencyInput = h('input', {placeholder: 'Currency'})
  var valueDiv = h('div', [
    valueInput,
    currencyInput,
    h('button', {
      onclick: function () {
        var obj = {
          type: 'value',
          value: valueInput.value,
          valuated: post.key,
          currency: currencyInput.value
        }
        publish(obj, keys).then(published => {
          open(published).then(opened => {
            message.parentNode.appendChild(h('div', {classList: 'submessage'}, [render(opened, keys)]))
            valueDiv.parentNode.removeChild(valueDiv)
          })
        })
      }
    }, ['Publish'])
  ])

  var button = h('button', {classList: 'right',
    onclick: function () {
      message.appendChild(h('button', {classList: 'right', 
        onclick: function () {
          message.appendChild(locDiv)
        }
      }, ['Location']))
           
      message.appendChild(h('button', {classList: 'right',
        onclick: function () { 
          message.appendChild(imageInput)
          document.getElementById("inp").addEventListener("change", readFile);
        }
      }, ['Image']))     

      message.appendChild(h('button', {classList: 'right',
        onclick: function () {
          message.appendChild(valueDiv)
        }
      }, ['Value']))     
    }

  }, ['Add'])

  

  return button
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
        if (nextPost.located == msg.key) {
          var locatedExists = document.getElementById('located:' + msg.key)
          var located = h('div', {id: 'located:' + msg.key}, [h('strong', ['Location: ']), nextPost.loc])
          if (locatedExists) {
            locatedExists.parentNode.removeChild(locatedExists)  
          }
          message.appendChild(located)
        }

        if (nextPost.valuated == msg.key) {
          var valuatedExists = document.getElementById('valuated:' + msg.key)
          var valuated = h('div', {id: 'valuated:' + msg.key}, [h('strong', ['Price: ' ]), nextPost.value + ' ' + nextPost.currency])
          if (valuatedExists) {
            valuatedExists.parentNode.removeChild(valuatedExists)
          }
          message.appendChild(valuated)
        }

        if (nextPost.edited == msg.key) {
          var messageExists = (document.getElementById(nextPost.key) !== null)
          var msgcontents = document.getElementById('content:' + msg.key)

          msg.text = nextPost.text

          var editedcontents = h('span', {id : 'content:' + msg.key, innerHTML: marked(nextPost.text)}) 

          msgcontents.parentNode.replaceChild(editedcontents, msgcontents)
          
          message.appendChild(h('div', [
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

    message.appendChild(h('span', [
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
      message.appendChild(h('span', [
        're: ',
        h('a', {href: '#' + msg.reply}, [msg.reply.substring(0, 10) + '...'])
      ]))
    }
    var gotName = getName(msg.author, keys)
    message.appendChild(h('div',{id: 'content:' + msg.key, innerHTML: marked(msg.text)}))
    if (!preview) {
      message.appendChild(h('button', {
        onclick: function () {
          if (messageDiv.firstChild) {
            messageDiv.insertBefore(h('div', {classList: 'submessage'}, [composer(keys, msg, gotName)]), messageDiv.childNodes[1])
          } else {
            messageDiv.appendChild(h('div', {classList: 'submessage'}, [composer(keys, msg, gotName)])) 
          }
        }
      }, ['Reply']))
      if (msg.author === keys.publicKey) {
        message.appendChild(h('button', {
          onclick: function () {
            var editor = h('div', [composer(keys, msg, {gotName: false}, {edit: true})])
            message.appendChild(editor)
          }
        }, ['Edit']))
      }
      message.appendChild(addButton(msg, message, keys))
    }
  } else if (msg.type == 'name') {
    message.appendChild(getHeader(msg, keys))
    message.appendChild(h('span', ['identified ', h('a', {href: '#' + msg.named }, [msg.named.substring(0, 10) + '...']), ' as ' + msg.name]))
  } else if (msg.type == 'location') {
    message.appendChild(getHeader(msg, keys))
    message.appendChild(h('span', [h('a', {href: '#' + msg.located }, [msg.located.substring(0, 10) + '...']), ' is located: ' + msg.loc]))
  } else if (msg.type == 'value') {
    message.appendChild(getHeader(msg, keys))
    message.appendChild(h('span', [h('a', {href: '#' + msg.valuated}, [msg.valuated.substring(0, 10) + '...']), ' is worth: ' + msg.value + ' ' + msg.currency]))
  }

  messageDiv.appendChild(message)
  return messageDiv
}

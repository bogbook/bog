function contacts (textarea, keys) {
  var contacts = h('span')

  var div = h('p')

  var close = h('button', {
    onclick: function () {
      div.parentNode.removeChild(div)
      div = h('p')
      close.parentNode.removeChild(close)
      contacts.appendChild(button)
    }
  }, ['- Contacts'])
 
  var button = h('button', {
    onclick: function () {
      button.parentNode.removeChild(button)
      contacts.appendChild(close)
      contacts.appendChild(div)
      localforage.getItem('subscriptions').then(function (subs) {
        subs.forEach(sub => {
          var name = getQuickName(sub, keys)
          div.appendChild(h('div', [
            h('a', {href: '#' + sub}, [
              getQuickImage(sub, keys),
              name
            ]),
            ' ',
            h('button', {
              onclick: function () {
                textarea.value = textarea.value + ' [' + name.textContent + '](' + sub + ')'
              }
            }, ['Add'])
          ]))
        })
      })
    }
  },['Contacts']) 

  contacts.appendChild(button)

  return contacts
}

function composer (keys, reply, gotName, edit) {
  var messageDiv = h('div')
  var message = h('div', {classList: 'message'})

  if (edit) {
    console.log(reply)
    var textarea = h('textarea', [reply.text])
  } else if (gotName) {
    var textarea = h('textarea', ['[' + gotName + '](' + reply.author + ')'])
  } else {
    var textarea = h('textarea', {placeholder: 'Write a new bog post...'})
  }

  var publisher = h('div', [
    textarea,
    h('button', {
      onclick: function () {
        if (textarea.value) {
          if (edit) {
            var content = {
              type: 'edit',
              text: textarea.value
            }
          } else {
            var content = {
              type: 'post',
              text: textarea.value
            }
          }

          if (edit) {
            content.edited = reply.key
          } else if (reply) {
            content.reply = reply.key
          }

          publish(content, keys, {preview: true}).then(post => {
            open(post).then(msg => {
              var preview = render(msg, keys, {preview: true})
              var cache = messageDiv.firstChild
              messageDiv.appendChild(preview)
              messageDiv.removeChild(messageDiv.firstChild)
              preview.firstChild.appendChild(h('button', {
                onclick: function () {
                  messageDiv.removeChild(messageDiv.firstChild)
                  messageDiv.appendChild(cache)
                }
              }, ['Cancel']))
              preview.firstChild.appendChild(h('button', {
                onclick: function () {
                  publish(content, keys).then(post => {
                    open(post).then(msg => {
                      textarea.value = ''
                      if (edit) {
                        console.log('APPENDING EDIT')
                        var gotit = document.getElementById(reply.key)
                        //gotit.appendChild(h('div', {classList: 'submessage'}, [render(msg, keys)]))
                        var newContent = h('div', {innerHTML: marked(msg.text)})
                        //console.log(gotit.childNodes.length)
                        gotit.firstChild.replaceChild(newContent, gotit.firstChild.childNodes[1])
                      }
                      if (reply) {
                        messageDiv.removeChild(messageDiv.firstChild)
                        messageDiv.appendChild(render(msg, keys))
                      } 
                      else if (messageDiv.firstChild) {
                        messageDiv.removeChild(messageDiv.firstChild)
                        messageDiv = h('div')
                        messageDiv.appendChild(cache)
                        scroller.insertBefore(messageDiv, scroller.childNodes[1])
                        scroller.insertBefore(render(msg, keys), scroller.childNodes[2])
                      } else {
                        messageDiv.appendChild(render(msg, keys))
                      }
                    })
                  })
                }
              }, ['Publish']))
            })
          })
        }
      }
    }, ['Preview']),
    contacts(textarea, keys)
  ])

  message.appendChild(publisher)
  messageDiv.appendChild(message)
  return messageDiv
}


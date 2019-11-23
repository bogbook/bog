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
                        gotit.appendChild(h('div', {classList: 'submessage'}, [render(msg, keys)]))
                        var newContent = h('div', {innerHTML: marked(msg.text)})
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
                        scroller.insertBefore(messageDiv, scroller.childNodes[2])
                        scroller.insertBefore(render(msg, keys), scroller.childNodes[3])
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
    }, ['Preview'])
  ])

  message.appendChild(publisher)
  messageDiv.appendChild(message)
  return messageDiv
}


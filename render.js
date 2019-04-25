function getHeader (post, mini) {
  var head = h('span', [
    h('a', {href: '#' + post.key}, [
      h('p', {classList: 'right'}, [human(new Date(post.timestamp))]),
    ]),
    h('p', [
      h('a', {href: '#' + post.author}, [
        getName(post.author)
      ]),
      mini 
    ])
  ])
  return head
}

function render (msg, keys) {
  var messageDiv = h('messageDiv', {id: msg.key})
  var message = h('div', {classList: 'message'})

  bog().then(log => {
    log.forEach(function (nextPost) {
      open(nextPost).then(nextMessage => {
        var messageExists = (document.getElementById(nextMessage.key) !== null);
        if (nextMessage.reply == msg.key) {
          if (!messageExists) {
            messageDiv.appendChild(h('div', {classList: 'submessage'}, [render(nextMessage, keys)]))
          }
        }
      })
    })
  }) 

  if (msg.type == 'post') {
    message.appendChild(getHeader(msg))

    if (msg.reply) {
      message.appendChild(h('span', [
        're: ',
        h('a', {href: '#' + msg.reply}, [msg.reply.substring(0, 10) + '...'])
      ]))
    }

    message.appendChild(h('div', [msg.text]))
    message.appendChild(h('button', {
      onclick: function () {
        messageDiv.appendChild(composer(keys, msg)) 
      }
    }, ['Reply']))
  } 

  messageDiv.appendChild(message)
  return messageDiv
}

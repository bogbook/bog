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
  var messageDiv = h('div', {id: msg.key})
  var message = h('div', {classList: 'message'})

  bog().then(logger => {
    logger.forEach(function (nextPost) {
      if (nextPost.reply == msg.key) {
        var messageExists = (document.getElementById(nextPost.key) !== null);

        if (!messageExists) {
          messageDiv.appendChild(h('div', {classList: 'submessage'}, [render(nextPost, keys)]))
        }
      }
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
        if (messageDiv.firstChild) {
          messageDiv.insertBefore(h('div', {classList: 'submessage'}, [composer(keys, msg)]), messageDiv.childNodes[1])
        } else {
          messageDiv.appendChild(h('div', {classList: 'submessage'}, [composer(keys, msg)])) 
        }

      }
    }, ['Reply']))
  } else if (msg.type == 'name') {
    message.appendChild(getHeader(msg))

    message.appendChild(h('span', ['identified ', h('a', {href: '#' + msg.named }, [msg.named.substring(0, 10) + '...']), ' as ' + msg.name]))
  } 

  messageDiv.appendChild(message)
  return messageDiv
}

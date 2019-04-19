function renderMessage (post) {
  var messageDiv = h('messageDiv', {id: post.key})
  var message = h('div', {classList: 'message'})

  var pubkey = nacl.util.decodeBase64(post.author.substring(1))
  var sig = nacl.util.decodeBase64(post.signature)
  post.content = JSON.parse(nacl.util.encodeUTF8(nacl.sign.open(sig, pubkey)))


  if (post.content.type == 'name') {
    var mini = h('span', [
      ' identified as ',
      post.content.name
    ])

    message.appendChild(getHeader(post, mini))

    messageDiv.appendChild(message)
  }


  if (post.content.type == 'post') {

    localforage.getItem('log', function (err, log) {
      if (log) {
        for (var i = log.length - 1; i >= 0; --i) {
         
          if (log[i].content.reply == post.key) {
            var nextPost = log[i]
            var messageExists = (document.getElementById(nextPost.key) !== null);
            if (!messageExists) {
              messageDiv.appendChild(h('div', {classList: 'submessage'}, [
                renderMessage(nextPost)
              ]))
            }
          }
        }
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
    });

    message.appendChild(getHeader(post))
    
    if (post.content.reply) {
      message.appendChild(h('span', [
        're: ',
        h('a', {href: '#' + post.content.reply}, [post.content.reply.substring(0, 10) + '...'])
      ]))
    }

    message.appendChild(h('div', {innerHTML: marked(post.content.text)}))

    message.appendChild(h('span', {id: post.key + 'src', classList: 'right'}, [
      h('a', {
        onclick: function () {
          message.appendChild(h('pre', [JSON.stringify(post)]))
          var span = document.getElementById(post.key + 'src') 
          span.parentNode.removeChild(span)
        }
      }, ['[src]'])
    ]))

    var gotName = getName(post.content.author)

    localforage.getItem('id', function (err, keys) {

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
    })

    messageDiv.appendChild(message)
  }

  return messageDiv
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
        getName(post.content.author)
      ]),
      inner
    ])
  ])
  return head
}


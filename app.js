var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

function composer (keys, reply, gotName) {
  var messageDiv = h('div')
  var message = h('div', {classList: 'message'})

  if (gotName) {
    console.log(gotName.textContent)
    var textarea = h('textarea', ['[' + gotName.textContent + '](' + reply.author + ')'])
  } else {

    var textarea = h('textarea', {placeholder: 'Write a new bog post...'})
  }

  var publisher = h('div', [
    textarea,
    h('button', {
      onclick: function () {
        if (textarea.value) {
          var content = {
            type: 'post',
            text: textarea.value
          }
          if (reply) {
            content.reply = reply.key
          }
          publish(content, keys).then(post => {
            open(post).then(msg => {
              textarea.value = ''
              if (reply) {
                messageDiv.removeChild(messageDiv.firstChild)
              }
              if (messageDiv.firstChild) {
                messageDiv.insertBefore(render(msg, keys), messageDiv.childNodes[1])
              } else {
                messageDiv.appendChild(render(msg, keys))
              }
            })
          }) 
        }
      }
    }, ['Publish'])
  ])

  message.appendChild(publisher)
  messageDiv.appendChild(message)
  return messageDiv
}

function route (keys) {
  src = window.location.hash.substring(1)

  var scroller = h('div', {id: 'scroller'})
  var screen = document.getElementById('screen')
  screen.appendChild(scroller)

  if (src === 'key') {
    keyPage(keys)
  } else if (src[0] === '@') {
    profilePage(src, keys)
  } else if (src[0] === '%') {
    threadPage(src, keys)
  } else {
    publicPage(keys)
  }
}

keys().then(key => { 

  var navbar = h('div', {classList: 'navbar'}, [
    h('div', {classList: 'internal'}, [
      h('li', [h('a', {href: '#'}, ['Home'])]),
      h('li', [h('a', {href: '#' + key.publicKey}, [getName(key.publicKey)])]),
      h('li', [h('a', {href: '#key'}, ['Key'])]),
      h('li', {classList: 'right'}, [h('a', {href: 'http://github.com/bogbook/bog/'}, ['Git Repo'])])
    ])
  ])
  document.body.appendChild(navbar)

  route(key)
})

window.onhashchange = function () {
  keys().then(key => {
    var oldscreen = document.getElementById('screen')
    var newscreen = h('div', {id: 'screen'})
    oldscreen.parentNode.replaceChild(newscreen, oldscreen)

    route(key)
  })
}



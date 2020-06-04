async function render (msg) {
  var message = h('div', {classList: 'message'})

  message.appendChild(h('span', {classList: 'right'}, [
    h('a', {href: msg.raw.substring(0, 44)}, [
      human(new Date(msg.timestamp))
    ])
  ]))

  message.appendChild(h('span', [
    h('a', {href: msg.author}, [
      msg.author.substring(0, 10)
    ])
  ]))

  if (msg.text) {
    message.appendChild(h('div', [msg.text]))
  }

  return message
}


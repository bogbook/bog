async function render (msg, keys) {
  var renderer = new marked.Renderer()
  renderer.paragraph = function (paragraph) {
    var array = paragraph.split(' ')

    for (i = 0; i < array.length; i++) {
      word = array[i]
      if (word.startsWith('#')) {
        let end
        if ((word[word.length -1] === '.') || (word[word.length - 1] === ',') || (word[word.length -1] === ':') || (word[word.length -1] === '?')) {
          end = word[word.length - 1]
          word = word.substring(0, word.length - 1)
        }
        var counter = 0
        log.forEach(msg => {
          var search = word.toUpperCase()
          if (msg.text && msg.text.toUpperCase().includes(search)) {
          //if (msg.text && msg.text.toUpperCase().split(" ").indexOf(search)!= -1) {
            ++counter
  	}
        })
        var hashtag = "<a href='#?" + word + "'>" + word + "</a><sup>(" + counter + ")</sup>"
        if (end) {
          hashtag = hashtag + end
        }
        array[i] = hashtag
      }
    }

    newgraph = array.join(' ')

    return newgraph + '<br /><br />'
  }
  renderer.link = function (href, title, text) {
    if (href.length == 44) {
      var image
      if (cache[href]) {
        image = '<a href="#' + href +'"><img src="' + cache[href].image + '" class="avatar ' + cache[href].filter + '" /></a>'
        href = '#' + href
        var link = image + marked.Renderer.prototype.link.call(this, href, title, text);
        return link
      } else {
        href = '#' + href
        var link = marked.Renderer.prototype.link.call(this, href, title, text);
        return link
      }
    } else { 
      var link = marked.Renderer.prototype.link.call(this, href, title, text);
      return link
    }
  }

  marked.setOptions({
    renderer: renderer
  })

  var messageDiv = h('div', {id: msg.raw.substring(0, 44)})

  var message = h('div', {classList: 'message'})

  messageDiv.appendChild(message)

  message.appendChild(h('span', {classList: 'right'}, [
    h('code', [msg.author.substring(0, 7)]),
    ' ',
    h('a', {href: '#' + msg.raw.substring(0, 44)}, [
      human(new Date(msg.timestamp))
    ])
  ]))
  
  message.appendChild(h('span', [
    h('a', {href: '#' + msg.author}, [
      getImage(msg.author, log),
      getName(msg.author, log)
    ])
  ]))

  var retractor = h('span', [
    h('button', {onclick: function () {
      retractor.parentNode.replaceChild(expander, retractor)
    }},['-'])
  ])

  var expander = h('button', {onclick: function () {
    expander.parentNode.replaceChild(retractor, expander)
  }}, ['+'])

  if (msg.text) {
    message.appendChild(h('div', {classList: 'content', innerHTML: marked(msg.text)}))
    if (msg.author === keys.substring(0, 44)) {
      makeBio = h('button', {
        onclick: function (e) {
          e.preventDefault(),
          makeBio.parentNode.removeChild(makeBio)
          var obj = {bio: msg.raw.substring(0, 44)}
          bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
            obj.seq = ++opened.seq
            obj.previous = opened.raw.substring(0,44)
            createpost(obj, keys)
          })
        }
      }, ['Set as bio'])
      retractor.appendChild(makeBio)
    }
  }
  if (msg.name) {
    /*if (msg.author == keys.substring(0, 44)) {
      if (navbar.id) {navbar.id = ''}
    }*/
    message.appendChild(h('span', [' identified as ' + msg.name]))
  }
  if (msg.avatar) {
    message.appendChild(h('span', [' set profile photo as ', h('a', {href: '#' + msg.avatar}, [msg.avatar.substring(0, 7)])]))
  }
  if (msg.background) {
    message.appendChild(h('span', [' set background photo as ', h('a', {href: '#' + msg.background}, [msg.background.substring(0, 7)])]))
  }
  if (msg.bio) {
    message.appendChild(h('span', [' set bio as ', h('a', {href: '#' + msg.bio}, [msg.bio.substring(0, 7)])]))
  }

  if (msg.image) {
    var image = h('img', {
      src: msg.image,
      style: 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;',
      onclick: function () {
        if (image.style.width === '100%') {
          image.style = 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;'
        } else {
          image.style = 'width: 100%; cursor: pointer;'
        }
      }
    })
    var div = h('div', [image])
    if (msg.filter) { image.classList = msg.filter}
    message.appendChild(div)
    if (msg.author === keys.substring(0, 44)) {
      makeProfile = h('button', {
        onclick: function (e) {
          e.preventDefault(),
          makeProfile.parentNode.removeChild(makeProfile) 
          var obj = {avatar: msg.raw.substring(0, 44)}
          bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
            obj.seq = ++opened.seq
            obj.previous = opened.raw.substring(0,44)
            createpost(obj, keys)
          })
        }
      }, ['Set as profile photo'])
      retractor.appendChild(makeProfile)
      makeBackground = h('button', {
        onclick: function (e) {
          e.preventDefault(),
          makeBackground.parentNode.removeChild(makeBackground)
          var obj = {background: msg.raw.substring(0, 44)}
          bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
            obj.seq = ++opened.seq
            obj.previous = opened.raw.substring(0,44)
            createpost(obj, keys)
          })
        }
      }, ['Set as profile background'])
      retractor.appendChild(makeBackground)
    }
  }
  var reply = composer(keys, msg)
  var cancel = h('button', {
    onclick: function () {
      reply.parentNode.removeChild(reply)
      cancel.parentNode.removeChild(cancel)
    }
  }, ['Cancel'])
  if (!(msg.name || msg.avatar || msg.background || msg.bio)) {
    message.appendChild(h('button', {
      onclick: function () {
        messageDiv.appendChild(reply)
        reply.appendChild(cancel)
      }
    }, ['Reply']))
    if (retractor.childNodes[1]) {
      message.appendChild(expander)
    }
  }

  log.forEach(reply => {
    if (reply.text && reply.text.includes(msg.raw.substring(0, 44))) {
      setTimeout(function () {
        var messageExists = (document.getElementById(reply.raw.substring(0, 44)) !== null)
        if (!messageExists) {
          render(reply, keys).then(rendered => {
            messageDiv.appendChild(h('div', {classList: 'reply'}, [rendered]))
          })
        }
      }, 50)
    }
  })

  return messageDiv
}

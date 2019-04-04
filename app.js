var screen = h('div', {id: 'screen'})

document.body.appendChild(screen)

//var header = h('div', {classList: 'message'})

var keys = getKeys()

function compose (keys, opts) {
  var header = h('div', {classList: 'message'})
  var scroller = document.getElementById('scroller')
  
  scroller.insertBefore(header, scroller.firstChild)
 
  var textarea = h('textarea', {placeholder: 'Write a new bog post'})
  
  header.appendChild(textarea)
  
  var composer = h('div', [
    h('button', {
      onclick: function () {
        if (textarea.value) {
          var content = {
            author: keys.publicKey,
            type: 'post',
            text: textarea.value,
            timestamp: Date.now()
          }
          textarea.value = ''
          publish(content, keys)
        }
      }
    }, ['Publish'])
  ])
  
  header.appendChild(composer)
}

function route () {
  src = window.location.hash.substring(1)
  var scroller = h('div', {id: 'scroller'})
  var screen = document.getElementById('screen')


  screen.appendChild(scroller)

  if (src === 'key') {
    var keyMessage = h('div', {classList: 'message'})    

    // delete key button
    keyMessage.appendChild(h('button', {classList: 'right', 
      onclick: function () {
       localStorage['id'] = ''
       location.reload() 
      }
    }, ['Delete Key'])) 
    
    // print stringified keypair
    keyMessage.appendChild(h('pre', {style: 'width: 80%'}, [h('code', [JSON.stringify(keys)])]))

    scroller.appendChild(keyMessage)
  }

  else if (src[0] === '@') {
    var profile = h('div', {classList: 'message'})
    scroller.appendChild(profile)

    var nameInput = h('input', {placeholder: 'Publish a new name'})

    var namePublisher = h('div',[
      nameInput,
      h('button', {
        onclick: function () {
          if (nameInput.value) {

            var content = {
              author: keys.publicKey,
              type: 'name',
              text: nameInput.value,
              timestamp: Date.now()
            }

            publish(content, keys)
          }
        }
      }, ['Publish'])
    ])

    profile.appendChild(namePublisher)

    readFile()

    var imageInput = h('span', [
      h('input', {id: 'inp', type:'file'}),
      h('span', {id: 'b64'}),
      h('img', {id: 'img'})
    ])

    var imagePublisher = h('div', [
      imageInput,
      h('button', {
        onclick: function () {
          var content = {
            author: keys.publicKey,
            type: 'image',
            image: document.getElementById("img").src,
            timestamp: Date.now()
          }

          publish(content, keys)
        }
      }, ['Publish'])
    ])

    profile.appendChild(imagePublisher)

    document.getElementById("inp").addEventListener("change", readFile);


    var ws = new WebSocket('ws://localhost:8080/' + src)

    var clientLog = {
      publicKey: src
    }

    if (localStorage[src]) {
      clientLog.log = JSON.parse(localStorage[src])
    } else {
      clientLog.log = []
    }

    ws.onopen = function () {
      ws.send(JSON.stringify(clientLog))
    }

    ws.onmessage = function (ev) {
      var serverData = JSON.parse(ev.data)
      if (serverData.log.length > clientLog.log.length) {

        // update the log of the id
        localStorage[src] = JSON.stringify(serverData.log)

        // contact new items from the log onto the client's log of everything
        var num = serverData.log.length - clientLog.log.length
        var diff = serverData.log.slice(0, num)
        var oldLog = JSON.parse(localStorage['log'])
        var newLog = diff.concat(oldLog)
        localStorage['log'] = JSON.stringify(newLog)

        location.reload()
      }
    }

    if (localStorage[src]) {
      var log = JSON.parse(localStorage[src])
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))
      }
    }
  }

  else if (src[0] === '%') {
    if (localStorage['log']) {
      var log = JSON.parse(localStorage['log']) 
      for (var i=0; i < log.length; i++) {
        if (log[i].key === src) {
          var post = log[i]
          scroller.appendChild(renderMessage(post))
        }
      }
    }     
  }

  else {
    compose(keys)
    if (localStorage['log']) {
      var log = JSON.parse(localStorage['log'])
      for (var i=0; i < log.length; i++) {
        var post = log[i]
        scroller.appendChild(renderMessage(post))

      }
    }
  }
}


route()

window.onhashchange = function () {
  var oldscreen = document.getElementById('screen')
  var newscreen = h('div', {id: 'screen'})
  oldscreen.parentNode.replaceChild(newscreen, oldscreen)
  route()
}


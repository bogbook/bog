function identify (src, profile, keys) {

  var identifyDiv = h('div')

  if ((src[0] == '@') && (src != keys.publicKey)) {
    identifyDiv.appendChild(h('p', ['Please note: ' + src + ' is not you.']))
  }

  var photoURL = {}

  // this could be a hell of a lot dry-er

  // also we need to get rid of UI glitches when you hit the cancel button (it should return to the same state it started in)

  var newBackground = h('span', [
    h('input', {id: 'input', type: 'file', 
      onclick: function () {
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        
        var maxW
        var maxH
        
        var input = document.getElementById('input')
        input.addEventListener('change', handleFiles)
        
        function handleFiles(e) {
          var img = new Image
          img.onload = function() {
            var iw = img.width
            var ih = img.height

            maxW = 800
            maxH = 800
            
            var scale = Math.min((maxW/iw), (maxH/ih))
            var iwScaled = iw*scale
            var ihScaled = ih*scale
            canvas.width = iwScaled
            canvas.height = ihScaled
            ctx.drawImage(img, 0, 0, iwScaled, ihScaled)
            photoURL.value = canvas.toDataURL('image/jpeg', 0.7)
          }
          img.src = URL.createObjectURL(e.target.files[0])
        } 
      }
    }),
    h('canvas', {id: 'canvas', width: '0', height: '0'}),
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(identifyButtons)
        newBackground.parentNode.removeChild(newBackground)
      }
    }, ['Cancel']),
    h('button', {
      onclick: function () {
        if (photoURL.value) {
          content = {
            type: 'background',
            backgrounded: src,
            background: photoURL.value
          }
          localforage.removeItem('image:' + src)
          publish(content, keys).then(post => {
            open(post).then(msg => {
              nameInput.value = ''
              scroller.insertBefore(render(msg, keys), scroller.childNodes[1])
            })
          })
          newBackground.parentNode.removeChild(newBackground)
          identifyDiv.appendChild(identifyButton)
        }
      }
    }, ['Publish'])
  ])

  var newPhoto = h('span', [
    h('input', {id: 'input', type: 'file', 
      onclick: function () {
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        
        var maxW
        var maxH
        
        var input = document.getElementById('input')
        input.addEventListener('change', handleFiles)
        
        function handleFiles(e) {
          var img = new Image
          img.onload = function() {
            var iw = img.width
            console.log(iw)
            var ih = img.height
            console.log(ih)

            if (iw > ih) {
              maxW = 680
              maxH = 500
            } 
            if (iw < ih) {
              maxW = 500
              maxH = 680
            } 
            if (iw == ih) {
              maxW = 500
              maxH = 500
            }  
            
            var scale = Math.min((maxW/iw), (maxH/ih))
            var iwScaled = iw*scale
            var ihScaled = ih*scale
            canvas.width = iwScaled
            canvas.height = ihScaled
            ctx.drawImage(img, 0, 0, iwScaled, ihScaled)
            photoURL.value = canvas.toDataURL('image/jpeg', 0.9)
          }
          img.src = URL.createObjectURL(e.target.files[0])
        } 
      }
    }),
    h('canvas', {id: 'canvas', width: '0', height: '0'}),
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(identifyButtons)
        newPhoto.parentNode.removeChild(newPhoto)
      }
    }, ['Cancel']),
    h('button', {
      onclick: function () {
        if (photoURL.value) {
          content = {
            type: 'image',
            imaged: src,
            image: photoURL.value
          }
          localforage.removeItem('image:' + src)
          publish(content, keys).then(post => {
            open(post).then(msg => {
              nameInput.value = ''
              scroller.insertBefore(render(msg, keys), scroller.childNodes[1])
            })
          })
          newPhoto.parentNode.removeChild(newPhoto)
          identifyDiv.appendChild(identifyButton)
        }
      }
    }, ['Publish'])
  ])




  var nameInput = h('input', {placeholder: 'New name'})

  var newName = h('div', [
    nameInput,
    h('button', {
      onclick: function () {
        if (nameInput.value) {
          content = {
            type: 'name',
            named: src,
            name: nameInput.value
          }
          localforage.removeItem('name:' + src)
          publish(content, keys).then(post => {
            open(post).then(msg => {
              nameInput.value = ''
              scroller.insertBefore(render(msg, keys), scroller.childNodes[1])
            })
          })
          newName.parentNode.removeChild(newName)
          identifyDiv.appendChild(identifyButton)
        }
      }
    }, ['Publish']),
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(identifyButtons)
        newName.parentNode.removeChild(newName)
      }
    }, ['Cancel'])
  ])
 
  var identifyButtons = h('span')

  if (src[0] == '@') {
    identifyButtons.appendChild(h('button', {
      onclick: function () {
        identifyDiv.appendChild(newName)
        identifyButtons.parentNode.removeChild(identifyButtons)
      }
    }, ['New name']))
    identifyButtons.appendChild(h('button', {
      onclick: function () {
        identifyDiv.appendChild(newBackground)
        identifyButtons.parentNode.removeChild(identifyButtons)
      }
    }, ['New background']))
  }
  //}, ['Identify ' + src.substring(0, 10) + '... with a new name']),
  identifyButtons.appendChild(h('button', {
    onclick: function () {
      identifyDiv.appendChild(newPhoto)
      identifyButtons.parentNode.removeChild(identifyButtons)
    }
  }, ['New image']))
  //}, ['Identify ' + src.substring(0, 10) + '... with a new photo']),
  identifyButtons.appendChild(h('button', {
    onclick: function () {
      identifyDiv.appendChild(identifyButton)
      identifyButtons.parentNode.removeChild(identifyButtons)
    }
  }, ['Cancel']))

  if (src[0] == '@') {
    var identifyButton = h('button', {
      onclick: function () {
        profile.appendChild(identifyDiv) 
        profile.appendChild(identifyButtons)
        identifyButton.parentNode.removeChild(identifyButton)
      }
    }, ['Identify ' + src.substring(0, 10) + '...'])
  } else {
    var identifyButton = h('button', {
      onclick: function () {
        profile.appendChild(identifyDiv) 
        profile.appendChild(identifyButtons)
        identifyButton.parentNode.removeChild(identifyButton)
      }
    }, ['Add to ' + src.substring(0, 10) + '...'])
  }
  return identifyButton
}


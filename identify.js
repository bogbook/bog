function identify (src, profile, keys) {

  var identifyDiv = h('div')

  if (src != keys.publicKey) {
    identifyDiv.appendChild(h('p', ['Please note: ' + src + ' is not you.']))
  }

  var photoURL = {}

  var newPhoto = h('span', [
    h('input', {id: 'input', type: 'file', 
      onclick: function () {
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        
        var maxW = 250
        var maxH = 250
        
        var input = document.getElementById('input')
        input.addEventListener('change', handleFiles)
        
        function handleFiles(e) {
          var img = new Image
          img.onload = function() {
            var iw = img.width
            var ih = img.height
            var scale = Math.min((maxW/iw), (maxH/ih))
            var iwScaled = iw*scale
            var ihScaled = ih*scale
            canvas.width = iwScaled
            canvas.height = ihScaled
            ctx.drawImage(img, 0, 0, iwScaled, ihScaled)
            console.log(canvas.toDataURL('image/jpeg', 0.9))
            photoURL.value = canvas.toDataURL('image/jpeg', 0.9)
            //identifyDiv.appendChild(h('img', {src: photoURL.value}))
          }
          img.src = URL.createObjectURL(e.target.files[0])
        } 
      }
    }),
    h('p', ['We recommend uploading a square photo. It will automatically be cropped to 250 x 250 px.']),
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
          console.log(content)
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
 
  var identifyButtons = h('span', [
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(newName)
        identifyButtons.parentNode.removeChild(identifyButtons)
      }
    }, ['Identify ' + src.substring(0, 10) + '... with a new name']),
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(newPhoto)
        identifyButtons.parentNode.removeChild(identifyButtons)
      }
    }, ['Identify ' + src.substring(0, 10) + '... with a new photo']),
    h('button', {
      onclick: function () {
        identifyDiv.appendChild(identifyButton)
        identifyButtons.parentNode.removeChild(identifyButtons)
      }
    }, ['Cancel'])
  ])

  var identifyButton = h('button', {
    onclick: function () {
      profile.appendChild(identifyDiv) 
      profile.appendChild(identifyButtons)
      identifyButton.parentNode.removeChild(identifyButton)
    }
  },['Identify ' + src.substring(0, 10) + '...'])

  return identifyButton
}


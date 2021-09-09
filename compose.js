function createpost (obj, keys, compose) {
  bog.publish(obj, keys).then(msg => {
    bog.open(msg).then(opened => {
      if (feeds[keys.substring(0, 44)]) {
        if (opened.previous === feeds[keys.substring(0,44)][0].substring(0, 44)) {
          var gossip = {feed: opened.author, seq: opened.seq}
          dispatch(gossip, keys)
          feeds[keys.substring(0, 44)].unshift(msg)
          log.push(opened)
          savefeeds(feeds, log)
          render(opened, keys).then(rendered => {
            if (compose) {
              compose.parentNode.replaceChild(h('div', {classList: 'reply'}, [rendered]), compose)
            } else {
              scroller.insertBefore(rendered, scroller.childNodes[1])
            }
          })
        }
      }
      if (opened.seq === 1) {
        feeds[keys.substring(0, 44)] = [msg]
        log.push(opened)
        savefeeds(feeds, log)
        render(opened, keys).then(rendered => {
          if (compose) {
            compose.parentNode.replaceChild(h('div', {classList: 'reply'}, [rendered]), compose)
          } else {
            scroller.insertBefore(rendered, scroller.firstChild)
          }
        })
      }
    })
  })
}

function getContacts (textarea, preview) {
  var span = h('span')

  var button = h('button', {onclick: function () {
    Object.keys(feeds).forEach(function (key, index) {
      span.appendChild(h('button', {onclick: function () {
        textarea.value = textarea.value + ' [' + getName(key, log) + '](' + key + ')'
        preview.innerHTML = marked(textarea.value)
      }}, [getImage(key, log), getName(key, log)]))
    })
  }}, ['📇'])

  span.appendChild(button)

  return span
}

function composer (keys, msg) {

  var photoURL = {}
  var croppedURL = {}
  var uncroppedURL = {}
  if (msg) {
    if (msg.raw) {
      var canvasID = msg.raw.substring(0, 44)
    } else {
      var canvasID = msg.author
    }
  } else {
    var canvasID = "composer"
  }

  var input = h('input', {id: 'input' + canvasID, type: 'file', style: 'display: none',
    onclick: function () {
      //var input = document.getElementById('input' + canvasID)
      input.addEventListener('change', handleFile)

      function handleFile (e) {
        var img = new Image
        img.onload = function() {

          var cropped = h('canvas', {width: 680, height: 680})
          var cctx = cropped.getContext('2d')
          var scale = Math.max(cropped.width / img.width, cropped.height / img.height)
          var x = (cropped.width / 2) - (img.width / 2) * scale
          var y = (cropped.height / 2) - (img.height / 2) * scale
          cctx.drawImage(img, x, y, img.width * scale, img.height * scale)
          croppedURL.value = cropped.toDataURL('image/jpeg', 0.8)

          var croppedImg = h('img', {
            src: croppedURL.value,
            style: 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;',
            onclick: function () {
              if (this.style.width === '100%') {
                this.style = 'width: 175px; height: 175px; object-fit: cover; cursor: pointer;'
              } else {
                this.style = 'width: 100%; cursor: pointer;'
              }
            }
          })

          photoDiv.appendChild(croppedImg)

          photoURL = croppedURL

          if (!(img.width === img.height)) {
            var crop = true
            var autocrop = h('div', [
              h('button', { onclick: function () {
                if (crop) { 
                  croppedImg.parentNode.replaceChild(uncroppedImg, croppedImg)
                  crop = false
                  photoURL = uncroppedURL
                  this.textContent = 'Crop'
                } else {
                  uncroppedImg.parentNode.replaceChild(croppedImg, uncroppedImg)
                  photoURL = croppedURL
                  crop = true
                  this.textContent = 'Uncrop'
                }
              }}, ['Uncrop']),
            ])

            photoDiv.appendChild(autocrop)
            
            var aspect = img.width / img.height
            var uncropped = h('canvas', {width: 680, height: 680 / aspect}) 
            var uctx = uncropped.getContext('2d')
            uctx.drawImage(img, 0, 0, uncropped.width, uncropped.height)
            uncroppedURL.value = uncropped.toDataURL('image.jpeg', 0.8)
            var uncroppedImg = h('img', {
              src: uncroppedURL.value,
              style: 'width: 175px; cursor: pointer;',
              onclick: function () {
                if (this.style.width === '100%') {
                  this.style = 'width: 175px; cursor: pointer;'
                } else {
                  this.style = 'width: 100%; cursor: pointer;'
                }
              }
            })
          } else { photoURL = croppedURL}
          img.src = ''
        }
        img.src = URL.createObjectURL(e.target.files[0])
        input.value = ''
      }

      var buttonsDiv = h('div', {id: 'buttons:'+ canvasID}, [
        photoDiv,
        filters,
        h('button', { onclick: function () {
          photoURL.value = ''
          croppedURL.value = ''
          uncroppedURL.value = ''
          filter = null
          photoDiv.parentNode.removeChild(photoDiv)
          photoDiv = h('div')
          buttonsDiv.parentNode.removeChild(buttonsDiv)
          newPhoto.appendChild(uploadButton)                
        }}, ['Cancel'])
      ])

      input.parentNode.appendChild(buttonsDiv)
    }
  })

  var uploadButton = h('button', {onclick: function () {
    input.click()
    uploadButton.parentNode.removeChild(uploadButton)
  }, innerHTML: '&#128247;'})

  var photoDiv = h('div')

  var newPhoto = h('span', [
    photoDiv,
    input,
    uploadButton
  ])

  var filters = h('span')

  var filterList = [
    {name: '#nofilter', filter: null},
    {name: 'Thoreau', filter: 'thoreau'},
    {name: 'Melville', filter: 'melville'},
    {name: 'Hoover', filter: 'hoover'},
    {name: 'Yeats', filter: 'yeats'}
  ]

  var filter

  filterList.forEach(f => {
    filters.appendChild(h('a', {onclick: function () {
      filter = f.filter
      photoDiv.classList = filter
    }}, [f.name]))
    filters.appendChild(h('span', [' ']))
  })

  if (msg) {
    var compose = h('div', {classList: 'message reply'})
  } else {
    var compose = h('div', {classList: 'message'})
  }

  var header = h('div', [
    h('span', {classList: 'right'}, [
      h('code', [keys.substring(0, 7)]),
      ' Preview'
    ]),
    h('a', {href: '#' + keys.substring(0, 44)}, [getImage(keys.substring(0, 44), log), getName(keys.substring(0, 44), log)])
  ])

  var preview = h('div', {classList: 'content'})

  var textarea = h('textarea', {placeholder: 'Write a message here.'})

  textarea.addEventListener('input', function (e) {
    preview.innerHTML = marked(textarea.value)
  })

  if (msg) {
    if (msg.raw) {
      var select = window.getSelection().toString()
      var thread = '↳ [' + (select || msg.raw.substring(0, 7)) + '](' + msg.raw.substring(0, 44) + ')'
    } else {
      var thread = ''
    }
    textarea.value = thread
    kv.get('name:' + msg.author).then(name => {
      if (name === null) {
        name = msg.author.substring(0, 10) + '...'
      }
      textarea.value = textarea.value + ' ← [' + name + '](' + msg.author + ')\n\n'
    })
  }

  var publish = h('button', {
    onclick: function () {
      if (textarea.value || photoURL.value) {
        var obj = {}
        if (textarea.value) {
          obj.text = textarea.value
          textarea.value = ''
        }
        if (photoURL.value) {
          obj.image = photoURL.value
          photoURL.value = ''
          photoDiv = h('div')
          var buttonsDiv = document.getElementById('buttons:' + canvasID)
          buttonsDiv.parentNode.appendChild(uploadButton)
          buttonsDiv.parentNode.removeChild(buttonsDiv)
        }
        if (filter) {
          obj.filter = filter
          filter = ''
        }

        var newpreview = h('div')
        
        preview.parentNode.replaceChild(newpreview, preview)
        preview = newpreview
        if (feeds[keys.substring(0,44)]) {
          bog.open(feeds[keys.substring(0,44)][0]).then(opened => {
            obj.seq = ++opened.seq
            obj.previous = opened.raw.substring(0,44)
            if (msg) {
              createpost(obj, keys, compose)
            } else {
              createpost(obj, keys)
            }
          })
        } else {
          obj.seq = 1
          obj.previous = null
          if (msg) {
            createpost(obj, keys, compose)
          } else {
            createpost(obj, keys)
          }
        }
      }
    }
  }, ['Publish'])
  compose.appendChild(header)
  compose.appendChild(preview)
  compose.appendChild(newPhoto)
  compose.appendChild(getContacts(textarea, preview))
  compose.appendChild(textarea)
  compose.appendChild(publish) 
  return compose
}

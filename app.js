var screen = h('div', {id: 'screen'})
document.body.appendChild(screen)

function route (keys) {
  src = window.location.hash.substring(1)

  var scroller = h('div', {id: 'scroller'})
  var screen = document.getElementById('screen')
  screen.appendChild(scroller)

  if (src === 'key') {
    keyPage(keys)
  } else if (src === 'pubs') {
    pubs()
  } else if (src[0] === '@') {
    profilePage(src, keys)
  } else if (src[0] === '?') {
    searchPage(src, keys)
  } else if (src[0] === '%') {
    threadPage(src, keys)
  } else {
    publicPage(keys)
  }
}

keys().then(key => { 
  var search = h('input', {placeholder: 'Search', classList: 'search'})

  var navbar = h('div', {classList: 'navbar'}, [
    h('div', {classList: 'internal'}, [
      h('li', [h('a', {href: '#'}, ['Home'])]),
      h('li', [h('a', {href: '#' + key.publicKey}, [getName(key.publicKey, keys)])]),
      h('li', [h('a', {href: '#key'}, ['Key'])]),
      h('li', [h('a', {href: '#pubs'}, ['Pubs'])]),
      h('li', {classList: 'right'}, [h('a', {href: 'http://git.sr.ht/~ev/bogbook'}, ['Git'])]),
      h('form', { classList: 'search', 
        onsubmit: function (e) {
          window.location.hash = '?' + search.value
          e.preventDefault()
        }},
        [search]
      )
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



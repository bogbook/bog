function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function getLoc (src) {
  var loc = h('span')
  readBog().then(log => {
    if (log) {
      for (var i = 0; i < log.length; i++) {
        if (((log[i].located === src) && (log[i].author === src)) || ((log[i].located === src.key) && (log[i].author === src.author))) {
          return loc.textContent = log[i].loc
        }
      }
    }
  })
  return loc
}

function profilePage (src, keys) {

  var timer = setInterval(function () {
    if (window.location.hash.substring(1) != src) {
      clearInterval(timer)
    }
    sync([src], keys)
  }, 5000)

  var msg = {}
  msg.author = src

  var profileDiv = h('div')
  var profile = h('div', {classList: 'profile'})
  var banner = h('div', {classList: 'banner'})

  function getDesc (src) {
    var desc = h('span')
    readBog().then(log => {
      if (log) {
        for (var i = 0; i < log.length; i++) {
          if ((log[i].descripted === src) && (log[i].author === src)) {
            // if you've identified someone as something else show that something else
            return desc.innerHTML = ' ' + marked(log[i].description)
          }
        }
      }
    })
    return desc
  }

  function getBg (src, profile) {
    readBog().then(log => {
      if (log) {
        for (var i = 0; i < log.length; i++) {
          if ((log[i].backgrounded === src) && (log[i].author === src)) {
            banner.style.height = '300px'
            return banner.style.background = 'fixed top/680px no-repeat url(' + log[i].background + ')'
          }
        }
      }
    })
  }

  getBg(src, profile)

  profileDiv.appendChild(banner)
  profileDiv.appendChild(profile)
  scroller.appendChild(profileDiv)

  profile.appendChild(h('span', {classList: 'right'}, [getLoc(src)]))
  profile.appendChild(h('div', [
    h('a', {href: '#' + src}, [
      getImage(src, keys, 'profileAvatar'),
      getName(src, keys)
    ]),
    profile.appendChild(getDesc(src))
  ]))

  quickName(src).then(name => {
    var mentionsButton = h('button', {
      onclick: function () {
        location.href = '#?' + src
      }
    }, [name + '\'s Mentions'])
    profile.appendChild(mentionsButton)
    var respond = h('button', {
      onclick: function () {
        scroller.insertBefore(composer(keys, msg, name), scroller.childNodes[1])
      }
    }, ['Reply to ' + name])
    profile.appendChild(respond)

    profile.appendChild(h('button', {
      onclick: function () {
        removefeed(src).then(function () {
          regenerate()
        })
      }
    }, ['Delete ' + name + '\'s feed']))
 
    if (src != keys.publicKey) {
      readBog('subscriptions').then(function (subs) {
        if (subs.includes(src)) {
          profile.appendChild(h('button', {
            onclick: function () {
              subs = subs.filter(a => a !== src)
              writeBog('subscriptions', subs).then(function () { location.hash = '' })
            }
          }, ['Unsubscribe from ' + name]))
        } else {
          profile.appendChild(h('button', {
            onclick: function () {
              subs.push(src)
              writeBog('subscriptions', subs).then(function () { location.hash = '' })
            }
          }, ['Subscribe to ' + name]))
        }
        profile.appendChild(identify(src, profile, keys))
      })
    } else {
      profile.appendChild(identify(src, profile, keys))
    }
  })

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      if (msg.author === src) {
        scroller.appendChild(render(msg, keys))
      }
    })
  }
  readBog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 33)
      addPosts(posts, keys).then(done => {
        index = index + 33
        window.onscroll = function(ev) {
          if (((window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 2500)) && (window.location.hash.substring(1) === src)) {
            posts = log.slice(index, index + 33)
            index = index + 33
            addPosts(posts, keys)
          }
        }
      })
    }
  })
}

function searchPage (src, keys) {
  var search = src.substring(1).replace("%20"," ").toUpperCase()

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      if (msg.text) {
        if (msg.text.toUpperCase().includes(search)) {
          scroller.appendChild(render(msg, keys))
        }
      }
    })
  }
  readBog().then(log => {
    if (log) {
      addPosts(log, keys)
    }
  })
}

function publicPage (keys) {

  readBog('log').then(log => {
    if (log) {
      log.sort((a, b) => a.timestamp - b.timestamp)
      var reversed = log.reverse()
      writeBog('log', reversed)
    }
  })

  readBog('subscriptions').then(subs => {
    if (subs) {
      if (!subs[1]) {
        var subs = [keys.publicKey, '@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=', '@WVBPY53Bl4aUIngt2TXV8nW+IGKvCTqhv88EvktOX9s=']
        console.log(subs)
        writeBog('subscriptions', subs)
      } 
      subs.forEach(function (sub, index) {
        var timer = setInterval(function () {
          setTimeout(function () {
            sync([sub], keys)
          }, 5000 * index)
        }, 5000)
      })
    } else {
      var subs = [keys.publicKey, '@Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0=', '@WVBPY53Bl4aUIngt2TXV8nW+IGKvCTqhv88EvktOX9s=']
      console.log(subs)
      writeBog('subscriptions', subs)
    }
  })

  scroller.appendChild(composer(keys))

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      scroller.appendChild(render(msg, keys))
    })
  }

  readBog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 25)
      addPosts(posts, keys).then(done => {
        index = index + 25
        window.onscroll = function(ev) {
          if (((window.innerHeight + window.scrollY) >= document.body.scrollHeight) && window.location.hash.substring(1) === '') {
            posts = log.slice(index, index + 25)
            index = index + 25
            addPosts(posts, keys)
            console.log("Bottom of page")
          }
        }
      })
    }
  })
}

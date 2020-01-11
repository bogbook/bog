function threadPage (src, keys) {
  get(src).then(msg => {
    scroller.appendChild(render(msg, keys))
  })
}

function profilePage (src, keys) {
  var msg = {}
  msg.author = src

  var profileDiv = h('div')
  var profile = h('div', {classList: 'profile'})
  var banner = h('div', {classList: 'banner'})

  function getBg (src, profile) {
    bog().then(log => {
      if (log) {
        for (var i = 0; i < log.length; i++) {
          if ((log[i].backgrounded === src) && (log[i].author === src)) {
            // if you've identified someone as something else show that something else  
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

  var subs = [src]

  var interval = 2500
  timer = function() {
    if (src === window.location.hash.substring(1)) {
      if (interval < 10000) { interval = interval + 50 }
      sync(subs, keys)
      setTimeout(timer, interval)
    }
  }
  timer()

  profile.appendChild(h('a', {href: '#' + src}, [
    getImage(src, keys, 'profileAvatar'),
    getName(src, keys),
  ]))

  profile.appendChild(h('br'))

  quickName(src).then(name => {
    profile.appendChild(identify(src, profile, keys, name))
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

    if (src != keys.publicKey) {
      localforage.getItem('subscriptions').then(function (subs) {
        if (subs.includes(src)) {
          profile.appendChild(h('button', {
            onclick: function () {
              subs = subs.filter(a => a !== src)
              localforage.setItem('subscriptions', subs).then(function () { location.reload() })
            }
          }, ['Unsubscribe from ' + name]))
        } else {
          profile.appendChild(h('button', {
            onclick: function () {
              subs.push(src)
              localforage.setItem('subscriptions', subs).then(function () { location.reload() })
            }
          }, ['Subscribe to ' + name]))
        }
      })
    }

    profile.appendChild(h('button', {
      onclick: function () {
        localforage.removeItem(src).then(function () {
          var home = true
          regenerate(home)
        })
      }
    }, ['Delete ' + name + '\'s feed']))
  })


  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      if (msg.author === src) {
        scroller.appendChild(render(msg, keys))
      }
    })
  }
  bog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 25)
      addPosts(posts, keys).then(done => {
        index = index + 25
        window.onscroll = function(ev) {
          if (((window.innerHeight + window.scrollY) >= document.body.scrollHeight) && (window.location.hash.substring(1) === src)) {
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
  bog().then(log => {
    var index = 0
    if (log) {
      var posts = log.slice(index, index + 25)
      addPosts(posts, keys).then(done => {
        index = index + 25
        window.onscroll = function(ev) {
          if (((window.innerHeight + window.scrollY) >= document.body.scrollHeight) && (window.location.hash.substring(1) === src)) {
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

function publicPage (keys) {

  localforage.getItem('log').then(log => {
    log.sort((a, b) => a.timestamp - b.timestamp)
    var reversed = log.reverse()
    localforage.setItem('log', reversed)
  })

  localforage.getItem('subscriptions').then(subs => {
    var interval = 1000
    timer = function() {
      if ('' === window.location.hash.substring(1)) {
        if (interval < 10000) { interval = interval + 1000 }
        sync(subs, keys)
        setTimeout(timer, interval)
      }
    }
    if (subs) {
      // the next two lines just fix a bug where the first sub was being set to null. Delete this code after March 2020.
      subs.forEach(sub => {
        if (sub == null) {
          var subs = [keys.publicKey]
          localforage.setItem('subscriptions', subs)
        }
      })
      timer()
    } else {
      var subs = [keys.publicKey]
      console.log(subs)
      localforage.setItem('subscriptions', subs)
      timer()
    }
  })

  scroller.appendChild(composer(keys))

  async function addPosts (posts, keys) {
    posts.forEach(function (msg) {
      scroller.appendChild(render(msg, keys))
    })
  }

  bog().then(log => {
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



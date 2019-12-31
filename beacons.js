function beaconsPage (keys) {

  var pubslist = h('select')

  localforage.getItem('securepubs').then(function (servers) {
    servers.forEach(function (pub) {
      pubslist.appendChild(
        h('option', {value: pub}, [pub])
      )
    })
  })
  
  var ads = h('div', {classList: 'message'})

  ads.appendChild(h('span', {innerHTML: marked('Sometimes when you\'re lost on the Internet you might want to send out a beacon so that people can see you. \n\n Beacons from guests will run for 100 views before they are deleted by the pub. \n\nSelect a pub:')}))

  ads.appendChild(pubslist)

  var recp = h('input', {placeholder: 'Ex: @Q++V5BbvWIg8B+TqtC9ZKFhetruuw+nOgxEqfjlOZI0='})

  var adstext = h('textarea', {placeholder: 'Hello World!'})

  ads.appendChild(h('span', [
    h('br'),
    h('p', [" Send a beacon (leave the 'To:' field blank for a public beacon): "]),
    h('p', ['To: ',
      recp
    ]),
    adstext,
    h('br'),
    h('button', {
      onclick: function () {
        var split = pubslist.value.split('~')
        console.log(split)
        var serverurl = split[0]
        var serverpub = split[1]
        var ws = new WebSocket(serverurl)

        if ((recp.value) && (adstext.value)) {
          var tobox = {
            author: keys.publicKey,
            timestamp: Date.now(),
            content: adstext.value
          }
          box(JSON.stringify(tobox), recp.value, keys).then(boxedmsg => {
            var msg = {
              type: 'beacon',
              author: keys.publicKey,
              box: boxedmsg
            }
            ws.onopen = function () {
              box(JSON.stringify(msg), serverpub, keys).then(boxed => {
                var obj = {
                  requester: keys.publicKey,
                  box: boxed
                }
                ws.send(JSON.stringify(obj))
              })
              adstext.value = ''
              recp.value = ''
            }
          })
        }

        if ((!recp.value) && (adstext.value)) {
          var msg = {
            type: 'beacon',
            author: keys.publicKey
          }
          msg.signature = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8(JSON.stringify(adstext.value)), nacl.util.decodeBase64(keys.privateKey)))
          ws.onopen = function () {
            box(JSON.stringify(msg), serverpub, keys).then(boxed => {
              var obj = {
                requester: keys.publicKey,
                box: boxed
              }
              ws.send(JSON.stringify(obj))
            })
            adstext.value = ''
          }
        }
      }
    }, ['Publish'])
  ]))

  scroller.appendChild(ads)

  localforage.getItem('beacons').then(beacons => {
    beacons.forEach(beacon => {
      var message = h('div', {classList: 'message'})

      if (beacon.signature) {
        open(beacon).then(opened => {
          quickName(beacon.author).then(gotName => {
            message.appendChild(h('p', {innerHTML: marked(opened)}))
            message.appendChild(h('span', [
                '—',
                h('a', {href: '#' + beacon.author}, [gotName]),
                ' from ',
                h('a', {href: beacon.name}, [beacon.name])
              ])
            )
          })
        })
      }
        
      scroller.appendChild(message)
      console.log(beacon)
    })  
  })
}


var fs = require('fs')
var nacl = require('tweetnacl')
    nacl.util = require('tweetnacl-util')

var homedir = require('os').homedir()
var addir = homedir + '/.bogbook/ads/'

if (!fs.existsSync(homedir + '/.bogbook/')) {fs.mkdirSync(homedir + '/.bogbook/')}
if (!fs.existsSync(addir)){fs.mkdirSync(addir)}

function make (ad) {
  console.log(ad)
  
  var hex = Buffer.from(nacl.hash(nacl.util.decodeUTF8(ad))).toString('hex')
  
  var obj = {
    hash: hex,
    ad: ad,
    views: 0
  }
  
  fs.writeFile(addir + hex, JSON.stringify(obj), 'UTF-8', function () {
    console.log('Saved as ' + hex)
  })
}

if (process.argv[2]) { 
  var ad = process.argv[2]
  makeAd(ad)
} if (ad) {
  console.log(ad)
  makeAd(ad)
} else {
  console.log('Please write an ad. Ex: `node ads.js "Hello World"')
}

module.exports = {
  make
}

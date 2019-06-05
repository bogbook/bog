# bogbook

### secure blockchain logging (blogging). 

To avoid confusion we're dropping the 'l' and calling them 'bogs'. 

**WARNING** This is very new and experimental software, **not intended for use in production**. Pull-requests are welcome, and if you find anything wrong feel free to report it in public.    

Try it online at http://bogbook.com/ ! 

but nothing will load into the browser unless you request a public key,  so try mine: http://bogbook.com/#@218Fd2bCrmXe4gwnMg5Gcb9qVZrjXquym2AlelbkBro=

### What?

bogbook is a distributed social networking application using [TweetNaCl.js](https://tweetnacl.js.org/#/) to publish signed append-only logs to your browser's IndexedDB using [localForage](https://localforage.github.io/localForage). 

The bogs are then gossiped between your bog client and bog 'pub' servers using websockets. You're responsible for syncing your messages between different bog 'pub' servers. Bog 'pubs' themselves don't talk to each other, instead they only talk to clients. 

When you click on a public key, your client will connect to your current pub to see if there are any new messages from the public key that you've clicked on.

### But what about ssb?!

This is _not_ [secure-scuttlebutt](http://scuttlebot.io/). But it is influenced by my 3+ years working on the project, and there are many similarities between bogbook and secure-scuttlebutt.

The biggest difference is that all of the bogging happens in the client, making it a browser-first bogging network. Last I checked, ssb isn't leaving the server.

Right now we have no private bogging, and no blob distribution (besides profile photos, which are saved to your log in base64). 

### how to

bogbook servers

```
git clone git@github.com/bogbook/bogbook.git
cd bog
npm install
npm start
```

Bogbook should launch in your browser. If it doesn't, navigate to http://localhost:8080/


### crypto

All of the bogbook cryptography is produced using [TweetNaCl.js](https://tweetnacl.js.org/#/) which is a port of [TweetNaCl](https://tweetnacl.cr.yp.to/), a cryptography library written in 100 Tweets. 

bogbook generates an ed25519 public/private keypair on load using `nacl.sign.keyPair()`, which is then stored in localForage at `localStorage['id']` as a JSON object with the public/private keypairs base64-encoded.

When you post a new message, bogbook will 

+ iterate up the message sequence number
+ hash the contents of the previous message using sha512
+ generate a hash of the contents of the current message using sha512
+ generate a signature of the contents of the current message with your ed25519 private key

Then you publish a message containing

```
{
  "author": <your publickey>,
  "key": <sha512 hash of content>,
  "signature": <signature of content>
}
```

To view the message, you use `nacl.sign.open` passing Uint8Arrays of the signature and publickey as paramaters.

---

Please note: All logs are append-only, public, and plain text at the current time. While you _can_ moderate your local database and pub servers by deleting logs associated with public keys, it can be difficult to unsay something, so don't drink and bog, people.

Some browsers clear stored data upon exit, others will clear it if you wipe your browser cache. Remember to save your public/private keypair somewhere, because no one can regenerate it for you.   

### contributing

Please report all bugs at http://bogbook.com/

---
MIT

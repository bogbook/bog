# bogbook v2 spec

### by Everett Bogue

![bogbook](bogbook.png)

Bogbook is a distributed news network made up of feeds signed by ed25519 keypairs, and then replicated between bogbook clients in the browser and bogbook pubs. 

On bogbook you can post images with filters and posts that are rendered in markdown. You can identify your ed25519 pubkey with a name, an image, a bio, and a background.

The bogbook protocol is secure (no one can modify your posts) and the data exists in your browser, as well as any bogbook pubs you have replicated to, and all of the clients who have replicated your posts from bogbook pubs.  

+ Try it: [bogbook.com](http://bogbook.com/)
+ Electronic Mail: [ev@evbogue.com](mailto:ev@evbogue.com)
+ IRC: irc.freenode.net #bogbook

If you want to see posts from others, try syncing my feed: http://bogbook.com/#evS+fPu6UGYfcmG5s4X18ORNHyNVrBgOJJZ2uJas+oE=

Prior art:

+ [old bogbook](http://git.sr.ht/~ev/oldbogbookv1) -- the protocol wasn't as optimized as I wanted, and the replication sucked
+ [ssb](http://scuttlebot.io) -- While I invested 4 years developing ssb apps, ssb was always difficult to install and the data never replicated into browsers

---

### Run it

```
git clone https://git.sr.ht/~ev/bogbook
cd bogbook
npm install
node bin
```

Navigate to http://localhost:8081/ to view your local bogbook

### use an alterative .bogbook folder

The first argument passed to node will specify a different directly to save bogs, the server keypair, and used to find config options.

```
node bin testbognet
```

Will use the `.testbognet/` folder instead of the default.

### config options

Save a `config.json` file to your `.bogbookv2` folder in order to configure your local bogbook.

#### specify your url

```
{"url": "yoururl.com"}
```

#### fortify your bog

fortify your bogs by only accepting replication requests from existing boggers. Bogbook will only respond to messages from public keys that have already published bogs to the server, this means all lurkers and new boggers will be unable to publish or replicate from the bogbook while the bog is fortified. This could be useful for a private bogging group, or for possible abuse cases.

```
{"fort": "true"}
```

#### customize pub announcements/welcome messages

announcement messages are sent to boggers who have existing feeds on the server. welcome messages are sent to lurkers.

```
{
  "welcome": "Hey, thanks for lurking on Bogbook",
  "announcement": "Hey, thanks for syncing your bogs to this bogbook server!"
}
```

#### change the port

you can change your bogbook port with

```
{"port": "1337"}
```

---

## log spec

The aim of bogbook is to be a public gossiped news and photo sharing network where you can apply filters to images. There are no private messages on the log (that became a security issue with ssb), we only encrypt/decrypt messages in transit during replication.

### keypairs

keypairs are ed25519 keypairs, encoded in base64, concatenating the public key to private key

```
<publickey><privatekey>
```  

There can be no '/' characters in the public key, because file systems do not like slashes, so we will throw them out when generating new keypairs. If there is a '/' in an imported keypair, we should error out on import.

### signed messages

signed messages exist on a single line, and consist of a hash of the signature, the public key of an author, and the signature

```
<sha2hash><ed25519 public key><ed25519 signature>
```

### opened messages

when opened, it could look this way:

```
{
  text: <text>,
  seq: <sequence number>,
  author: <ed25519 public key>,
  timestamp: <Date.now()>,
  raw: <unopened message>
}
```

`timestamp` is not optional, because we need it to sort the log. 

`seq` is not optional, because we need it to sync the log.

Everything else is optional, but we should have at least `text` or an `image`. The reason we crop images to 680x680 pixels is we want the image size to be managable for replication.

if there's an edit field pointing at a post, then we replace the post with the edit.

NOTE: Unlike bogbook and others, we will not have a reply field or a recp field. We can easily search text to discover if it contains publickeys and/or sha2 hashes of messages that may be contained in our log. These can simply be included in the composer field, as in how it worked in news.

### gossip/replication

servers and clients all have ed25519 keypairs.

opened logs are stored as 'log' and are sorted periodically by timestamp.

signed logs written by unique authors are saved as public keys. Since we're using fs on the server, we shouldn't allow public keys with a '/' because that confuses fs. 

gossip requests can contain either:

```
{
  feed: <ed25519 public key>,
  sequence: <latest sequence number we possess> 
} 
```

the response to this message will be to send one message every time the server sends us a sequence number. If we have a higher sequence number than the requester we respond with the next message in our sequence. If the server has a lower sequence number, then we respond with a gossip message sharing our latest sequence number, so that the client can instead respond to us with a replication message.

---

MIT


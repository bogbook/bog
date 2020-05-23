# bogbook v2 spec

### by Everett Bogue

So after working on [bogbook](https://git.sr.ht/~ev/bogbook) [git.sr.ht] for a year, and [news](https://git.sr.ht/~ev/news) [git.sr.ht] for a few weeks, I realized that append-only logs are a great way to distribute data and treating messages as seperate makes it really challenging to distribute data.

However, some of the ideas from news are very good, so I want to bring them into bogbook. But that'll mean I'll need to throw out how it worked before, and start over from scratch. If you want to read the code it is [here](https://git.sr.ht/~ev/gossip).

In the meantime, just email me [ev@evbogue.com](mailto:ev@evbogue.com) if you want to talk.

Or join #bogbook on irc.freenode.net to talk to me in a chat format. 

---

## log spec

The aim of bogbook is to be a public gossiped news and photo sharing network where you can apply filters to images. There are no private messages on the log (that became a security issue with ssb), we only encrypt/decrypt messages in transit during replication.

### keypairs

keypairs are ed25519 keypairs, exactly like in bogbook v1, where we use a JSON object containing:

```
  publickey: <ed25519 public key>,
  privatekey: <ed25519 private key> 
```  

There can be no '/' characters in the public key, so we'll throw those out on generation.

### signed messages

```
{
  hash: %<sha2 hash of signature>,
  author: @<ed25519 public key>,
  seq: <sequence number>,
  signature: <ed25519 signature>,
  previous: %<sha2 hash from previous message (seq - 1)>
}
```

### opened messages

when opened, they will contain:

```
{
  text: <text>,
  image: <680x680px Base64 encoded image>,
  filter: <css filters for images>,
  edit: <sha2 hash>,
  avatar: <pubkey>,
  timestamp: <Date.now()>
}
```

`timestamp` is not optional, because we need it to sort the log. 

Everything else is optional, but we should have at least `text` or an `image`. The reason we crop images to 680x680 pixels is we want the image size to be managable for replication.

if there's an edit field pointing at a post, then we replace the post with the edit.

if there is an avatar field, then we use the text for a name or the image for a photo.

I don't know if I still want banners, because the image focus is on square images with css filters. 

NOTE: Unlike bogbook and others, we will not have a reply field or a recp field. We can easily search text to discover if it contains publickeys and/or sha2 hashes of messages that may be contained in our log. These can simply be included in the composer field, as in how it worked in news.

### gossip/replication

servers and clients all have ed25519 keypairs.

opened logs are stored as 'log' and are sorted periodically by timestamp.

signed logs written by unique authors are saved as public keys. Since we're using fs on the server, we shouldn't allow public keys with a '/' because that confuses fs. 

gossip requests can contain either:

```
{
  author: <ed25519 public key>,
  sequence: <latest sequence number we possess> 
} 
```

the response to this message will be to send one message every time the server sends us a sequence number. If we have a higher sequence number than the requester we respond with the next message in our sequence. If the server has a lower sequence number, then we respond with a gossip message sharing our latest sequence number, so that the client can instead respond to us with a replication message.

sometimes a gossip message will simply contain a hash, this means we are only requesting one message out of sequence order.

```
{
  hash: <sha2hash>
}
```

If just this message is replicated if we have it, it is not intended to be saved anywhere. We treat it as a permalink, and then the client can ask the recipient if they want to replicate an entire log. We might send a person's avatar name and image with the hash response. 





---

MIT


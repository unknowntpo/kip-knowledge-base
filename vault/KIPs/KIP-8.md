---
id: "KIP-8"
title: "Add a flush method to the producer API"
status: "Adopted"
stub: true
cwiki:
  pageId: "51809757"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51809757"
  lastChecked: "2026-07-24T18:55:49Z"
tags: []
related: []
---

## Summary

Currently there is no way to force the sending of all buffered messages in the new Java producer.

Currently if you want to send a batch of messages and don't care about the error or offset you can do that like this:

javaCurrent Usage results = new ArrayList(); for(String messageToSend: batch) { ProducerMetadata result = producer.send(new ProducerRecord("my-topic", messageToSend)); results.add(result); } for(ProducerMetadata result: results) result.get();]]>There are two problems with this usage, first it is sort of annoying to iterate through all the futures to wait until they are all sent.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51809757)

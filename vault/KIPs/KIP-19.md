---
id: "KIP-19"
title: "Add a request timeout to NetworkClient"
status: "Adopted"
stub: true
cwiki:
  pageId: "55154824"
  version: 36
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55154824"
  lastChecked: "2026-07-24T18:53:43Z"
tags: []
related: []
---

## Summary

In old producer/consumer, we have a socket timeout associated with each request, the producer/consumer will send a request and then wait for response. If no response is received from a broker within specified timeout, the request will fail.

In the NetworkClient of new producer/consumer, currently we don't have a similar timeout for requests. Adding a client side request timeout in NetworkClient would be useful for the following reasons:

1. For KafkaProducer.close() and KafkaProducer.flush() we need the request timeout as implict timeout.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55154824)

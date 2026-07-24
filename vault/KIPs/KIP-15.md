---
id: "KIP-15"
title: "Add a close method with a timeout in the producer"
status: "Adopted"
stub: true
cwiki:
  pageId: "53739782"
  version: 28
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=53739782"
  lastChecked: "2026-07-24T18:56:03Z"
tags: []
related: []
---

## Summary

Current KafkaProducer.close() method will try to finish sending all pending messages before it returns. There are several motivations to add a close method with timeout in the producer.

Sometimes, user will want to close a producer within a bounded time to avoid blocking on producer.close() for too long.

One specific use case of 1) is that in some scenarios, user will want to close the produce immediately and fail all the unsent messages in RecordAccumulator. Some examples are:In mirror maker, if a send failed, we don't want to continue sending messages in RecordAccumulator to avoid reordering.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=53739782)

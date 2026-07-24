---
id: "KIP-1"
title: "Remove support of request.required.acks"
status: "Adopted"
stub: true
cwiki:
  pageId: "50859269"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50859269"
  lastChecked: "2026-07-24T18:55:34Z"
threads:
  - url: "https://lists.apache.org/thread/jlqnnq4ok66odj5ygrrfoqhvvf27ysoj"
    count: 4
  - url: "https://lists.apache.org/thread/x6zmclw1tw4to7g1c2wyf115ykcvztjo"
    count: 6
  - url: "https://lists.apache.org/thread/v77rsyxllrdz9yvmmrl4kqpcy6yo1jlg"
    count: 1
tags: []
related: []
---

## Summary

Until Kafka 0.8.2, if a producer wanted to make sure a message was persisted at a specific number of replicas (N) before an "ack" was returned from the broker, they would specify request.required.acks=N. This was a bit misleading since specifying request.required.acks=2 would not actually protect against data loss in all cases.

In Kafka 0.8.2 we added min.isr feature which is a less misleading implementation of a similar behavior - users can specify request.required.acks=-1 (ack after writing to all ISR) and also specify minimum size of ISR to guarantee a minimum number of guaranteed copies.

In this KIP we propose to remove support of request.required.acks > 1 and return an error message to producers which request that.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50859269)

---
id: "KIP-62"
title: "Allow consumer to send heartbeats from a background thread"
status: "Adopted"
stub: true
cwiki:
  pageId: "63406974"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=63406974"
  lastChecked: "2026-07-25T00:42:12Z"
tags: []
related: []
---

## Summary

A common issue the new consumer is the mix of its single-threaded design and the need to maintain liveness by sending heartbeats to the coordinator. We recommend users do message processing and partition initialization/clean from the same thread as the consumer's poll loop, but if this takes longer than the configured session timeout, the consumer is removed from the group and its partitions are assigned to other members. In the best case, this causes unneeded rebalancing when the consumer has to rejoin. In the worst case, the consumer will not be able to commit offsets for any messages which were handled after the consumer had fallen out of the group, which means that these messages will have to be processed again after the rebalance. If a message or set of messages always takes longer than the session timeout, then the consumer will not be able to make progress until the user notices the problem and makes some adjustment.

The options for the user at the moment to handle this problem are the following:

Increase the session timeout to give more time for record processing.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=63406974)

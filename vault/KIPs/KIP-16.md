---
id: "KIP-16"
title: "Automated Replica Lag Tuning"
status: "Adopted"
stub: true
cwiki:
  pageId: "290982703"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=290982703"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently, replica lag configuration cannot be tuned automatically for high and low volume topics on the same cluster since the lag is computed based on the difference in log end offset between the leader and replicas i.e. number of messages. The default is 4000 messages. For high volume topics, producing even a single large batch can cause replicas to fall out of ISR and in the case of low volume topics detecting a lagging replica takes a very long time. We need a consistent way to measure replica lag in terms of time.

This proposal removes 1 config and changes the meaning of another config.

replica.lag.max.messages - This config is deleted since this proposal no longer measures replica lag in terms of number of messages

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=53740845)

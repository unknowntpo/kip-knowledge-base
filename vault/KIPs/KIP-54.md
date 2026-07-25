---
id: "KIP-54"
title: "Sticky Partition Assignment Strategy"
status: "Adopted"
stub: true
cwiki:
  pageId: "62692483"
  version: 34
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62692483"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Changes introduced in this KIP could potentially be superseded by changes to consumer rebalancing protocol.

There was a bug in the partition assignment algorithm as described in this KIP that was fixed in .Motivation

In certain circumstances the round robin assignor, which produces better assignments compared to range assignor, fails to produce an optimal and balanced assignment of topic partitions to consumers. touches on some of these circumstances. In addition, when a reassignment occurs, none of the existing strategies consider what topic partition assignments were before reassignment, as if they are about to perform a fresh assignment. Preserving the existing assignments could reduce some of the overheads of a reassignment. For example, Kafka consumers retain pre-fetched messages for partitions assigned to them before a reassignment. Therefore, preserving the partition assignment could save on the number of messages delivered to consumers after a reassignment. Another advantage would be reducing the need to cleanup local partition state between rebalances.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62692483)

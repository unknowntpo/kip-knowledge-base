---
id: "KIP-92"
title: "Add per partition lag metrics to KafkaConsumer"
status: "Adopted"
stub: true
cwiki:
  pageId: "66852206"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66852206"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently KafkaConsumer only has a metric of max lag across all the partitions. It would be useful to know per partition lag as well.

There is no programmatic public interface change. We are only adding new metrics.

Add per partition lag metrics to KafkaConsumer. The metric names would be:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66852206)

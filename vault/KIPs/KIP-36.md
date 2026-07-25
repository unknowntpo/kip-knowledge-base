---
id: "KIP-36"
title: "Rack aware replica assignment"
status: "Adopted"
stub: true
cwiki:
  pageId: "61321028"
  version: 52
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61321028"
  lastChecked: "2026-07-25T00:41:22Z"
tags: []
related: []
---

## Summary

Github Pull Request: https://github.com/apache/kafka/pull/132

Machines in data center are sometimes grouped in racks. Racks provide isolation as each rack may be in a different physical location and has its own power source. When resources are properly replicated across racks, it provides fault tolerance in that if a rack goes down, the remaining racks can continue to serve traffic.

In Kafka, if there are more than one replica for a partition, it would be nice to have replicas placed in as many different racks as possible so that the partition can continue to function if a rack goes down. In addition, it makes maintenance of Kafka cluster easier as you can take down the whole rack at a time.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61321028)

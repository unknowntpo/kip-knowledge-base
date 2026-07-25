---
id: "KIP-89"
title: "Allow sink connectors to decouple flush and offset commit"
status: "Adopted"
stub: true
cwiki:
  pageId: "66850974"
  version: 6
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66850974"
  lastChecked: "2026-07-25T00:43:06Z"
tags: []
related: []
---

## Summary

This KIP is with regard to sink connectors and the offset commit process managed by the Connect runtime.

Periodic offset commits (controlled with offset.flush.interval.ms) require knowing what offset state is safe to commit to ensure at-least-once delivery from Kafka to the sink connector.

With the current API guarantees that are available, after SinkTask.flush() and before any further put() calls the current offset state is safe to commit. So this is what the runtime relies upon, and connectors have an expectation of periodic calls to SinkTask.flush().

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66850974)

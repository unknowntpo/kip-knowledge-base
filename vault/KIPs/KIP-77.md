---
id: "KIP-77"
title: "Improve Kafka Streams Join Semantics"
status: "Unknown"
stub: true
cwiki:
  pageId: "65866201"
  version: 9
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65866201"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently, Kafka Streams join semantics are not very intuitive for many users with regard to reasoning about expected results. Although stream-based join semantics (as used in Kafka Streams) cannot be completely consistent with join semantics in RDBMS SQL, we observed that our current join semantics can still be improved to make them more intuitive to understand.

As of Kafka 0.10.0.0 Kafka Streams offers three types of joins (with multiple variants):

These join types vary primarily based on three dimensions:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65866201)

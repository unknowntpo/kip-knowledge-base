---
id: "KIP-90"
title: "Remove zkClient dependency from Streams"
status: "Adopted"
stub: true
cwiki:
  pageId: "66851589"
  version: 10
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66851589"
  lastChecked: "2026-07-25T00:43:09Z"
tags: []
related: []
---

## Summary

This KIP removes the Zookeeper dependency from Kafka Streams. Currently, for Kafka Streams API accesses Zookeeper directly to create internal topics. We will use the client admin API introduced in KIP-4 to manage the internal topics via Kafka broker instead of directly accessing Zookeeper.

Zookeeper related config value, ZOOKEEPER_CONNECT_CONFIG in StreamsConfig, is deprecated.

We add a new KafkaStreams client which is used for internal topic management in Kafka Streams API. We will remove the dependency to Zookeeper from Kafka Streams API..

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66851589)

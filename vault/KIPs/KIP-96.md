---
id: "KIP-96"
title: "Add per partition metrics for in-sync and assigned replica count"
status: "Adopted"
stub: true
cwiki:
  pageId: "66854629"
  version: 11
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66854629"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently Kafka only reports metrics on the in-sync state of a partition, but does not give finer level detail on the number of in- / out-of- sync replicas per partition.

This proposal would add the number of in-sync replicas, as well as the number of replicas per topic-partition, as reported by the partition leader.

This proposal would add the following two yammer metrics (and resulting JMX metrics):

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66854629)

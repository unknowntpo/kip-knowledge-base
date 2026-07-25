---
id: "KIP-63"
title: "Unify store and downstream caching in streams"
status: "Adopted"
stub: true
cwiki:
  pageId: "64553012"
  version: 14
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=64553012"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Today a stateful processor node, such as one that performs aggregates, stores intermediate data in a local state store as well as forwards it downstream to the next processor node. Local stores usually have a cache to batch writes and reduce the load on their backend. However, no such cache exists for data sent downstream. This increases both the CPU load on the system as well as the load on Kafka itself where data is ultimately stored.

The input is a sequence of messages <K,V>: <K1, V1>, <K2, V5>, …, <K1, V10>, <K1, V100> (Note: The focus in this example is on the messages with key == K1.)

A processor node computes the sum of values, grouped by key, for the input above.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=64553012)

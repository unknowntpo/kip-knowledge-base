---
id: "KIP-67"
title: "Queryable state for Kafka Streams"
status: "Adopted"
stub: true
cwiki:
  pageId: "65144300"
  version: 19
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65144300"
  lastChecked: "2026-07-25T00:42:22Z"
tags: []
related: []
---

## Summary

Today a Kafka Streams application will implicitly create state. This state is used for storing intermediate data such as aggregation results. The state is also used to store KTable’s data when they are materialized. The problem this document addresses is that this state is hidden from application developers and they cannot access it directly. The DSL allows users to make a copy of the data (using the through operator) but this leads to a doubling in the amount of state that is kept. In addition, this leads to extra IOs to external databases/key value stores that could potentially slow down the entire pipeline.

Here is a simple example that illustrates the problem:

1 KTable<String, Long> wordCounts = textLine

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65144300)

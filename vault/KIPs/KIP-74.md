---
id: "KIP-74"
title: "Add Fetch Response Size Limit in Bytes"
status: "Adopted"
stub: true
cwiki:
  pageId: "65864887"
  version: 14
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864887"
  lastChecked: "2026-07-25T00:42:36Z"
tags: []
related: []
---

## Summary

Currently the only possible way for client to limit fetch response size is via per-partition response limit max_bytes taken from config setting max.partition.fetch.bytes.

So the maximum amount of memory the client can consume is max.partition.fetch.bytes * num_partitions, where num_partitions is the total number of partitions currently being fetched by consumer.

Since num_partitions can be quite big (several thousands), the memory required for fetch responses can be several GB

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864887)

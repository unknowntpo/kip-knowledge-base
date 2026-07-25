---
id: "KIP-66"
title: "Single Message Transforms for Kafka Connect"
status: "Adopted"
stub: true
cwiki:
  pageId: "65145676"
  version: 34
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65145676"
  lastChecked: "2026-07-25T00:42:19Z"
tags: []
related: []
---

## Summary

The framework for Single Message Transforms was released on 0.10.2.0 but only some of the built-in transformations were included with that version. The table below indicates what version each transformation was or will be released with. A few don't have the exact name as listed in the KIP because they were found to be slightly inaccurate during code review.

The Kafka documentation also includes references for each transformation.

This proposal is for adding a record transformation API to Kafka Connect as well as certain bundled transformations. At the same time, we should not extend Connect's area of focus beyond moving data between Kafka and other systems. We will only support simple 1:{0,1} transformations – i.e. map and filter operations.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65145676)

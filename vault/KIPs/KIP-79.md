---
id: "KIP-79"
title: "ListOffsetRequest/ListOffsetResponse v1 and add timestamp search methods to the new consumer"
status: "Adopted"
stub: true
cwiki:
  pageId: "65868090"
  version: 21
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65868090"
  lastChecked: "2026-07-25T00:42:48Z"
tags: []
related: []
---

## Summary

Part 1: Introduce ListOffsetRequest v1 to support accurate search based on timestamp.

With KIP-33, the brokers can now search messages by timestamp accurately. To maintain the backwards compatibility, we did not change the behavior of ListOffsetRequest v0. In this KIP, we will introduce ListOffsetRequest v1 to provide more accurate search based on timestamp.

Part 2: Add a search message by timestamps method to o.a.k.c.consumer.Consumer

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65868090)

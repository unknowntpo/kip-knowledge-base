---
id: "KIP-3"
title: "Mirror Maker Enhancement"
status: "Adopted"
stub: true
cwiki:
  pageId: "50860288"
  version: 39
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50860288"
  lastChecked: "2026-07-24T18:55:42Z"
threads:
  - url: "https://lists.apache.org/thread/z18lhokgz661sjybtjxjslfbj2mg4pr3"
    count: 30
tags: []
related: []
---

## Summary

The Mirror Maker has a potential data loss issue as explained below:

1. Mirror Maker consumer consume some messages and called producer.send(). The messages sit in producer accumulator and haven't been sent yet.

2. Mirror Maker consumer commits the offsets

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=50860288)

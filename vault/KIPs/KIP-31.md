---
id: "KIP-31"
title: "Move to relative offsets in compressed message sets"
status: "Adopted"
stub: true
cwiki:
  pageId: "61317519"
  version: 30
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61317519"
  lastChecked: "2026-07-24T18:54:10Z"
tags: []
related: []
---

## Summary

Today the broker needs to decompress compressed messages, assign offsets to each message and recompress the messages again. This causes additional CPU cost. This KIP is trying to avoid server side recompression.

This KIP is a distilled/improved version of an earlier discussion that we started.

We propose the following change to the message format

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61317519)

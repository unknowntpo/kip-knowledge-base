---
id: "KIP-33"
title: "Add a time based log index"
status: "Adopted"
stub: true
cwiki:
  pageId: "61318517"
  version: 51
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61318517"
  lastChecked: "2026-07-24T18:54:18Z"
tags: []
related: []
---

## Summary

Kafka has a few timestamp based functions, including

Currently these operations depend on the create time / modification time of the log segment file. This has a few issues.

Searching offset by timestamp has very coarse granularity (log segment level), it also does not work well when replica is reassigned.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61318517)

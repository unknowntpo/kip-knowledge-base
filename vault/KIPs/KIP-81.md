---
id: "KIP-81"
title: "Bound Fetch memory usage in the consumer"
status: "Adopted"
stub: true
cwiki:
  pageId: "65869847"
  version: 35
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65869847"
  lastChecked: "2026-07-25T00:42:50Z"
tags: []
related: []
---

## Summary

This work was done in collaboration with

With , we now have a good way to limit the size of Fetch responses, but it may still be difficult for users to control overall memory since the consumer will send fetches in parallel to all the brokers which own partitions that the client is subscribed to. Currently we have:

-max.fetch.bytes: This enables to control how much data will be returned by the broker for one fetch

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65869847)

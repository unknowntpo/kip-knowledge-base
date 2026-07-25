---
id: "KIP-72"
title: "Allow putting a bound on memory consumed by Incoming request"
status: "Unknown"
stub: true
cwiki:
  pageId: "65864580"
  version: 21
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864580"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Kafka currently supports setting an upper bound on the number of requests allowed into the (incoming) request queue. This is an indirect way of controlling memory consumption and has a few drawbacks:

An administrator needs to estimate the average request size in order to provide a meaningful size limit.

This size limit may need to be periodically updated as the workload changes.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864580)

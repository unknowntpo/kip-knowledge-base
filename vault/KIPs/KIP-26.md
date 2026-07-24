---
id: "KIP-26"
title: "Add Kafka Connect framework for data import/export"
status: "Adopted"
stub: true
cwiki:
  pageId: "58851767"
  version: 17
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=58851767"
  lastChecked: "2026-07-24T18:54:03Z"
tags: []
related: []
---

## Summary

Kafka has become a standard storage system for large scale, streaming data. However, the current user experience when trying to adopt Kafka is poor because Kafka provides little support for getting data into or out of Kafka.

Consider some of these common use cases:

Stream processing existing data (import) - the user has existing data from another source (such as logs or a database change log) and wants to use a stream processing framework on that data.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=58851767)

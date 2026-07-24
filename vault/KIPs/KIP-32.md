---
id: "KIP-32"
title: "Add timestamps to Kafka message"
status: "Adopted"
stub: true
cwiki:
  pageId: "61318265"
  version: 60
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61318265"
  lastChecked: "2026-07-24T18:54:14Z"
tags: []
related: []
---

## Summary

This KIP tries to address the following issues in Kafka.

Log retention might not be honored: Log retention is currently at the log segment level, and is driven off the last modification time of a log segment. This approach does not quite work when a replica reassignment happens because the newly created log segment will effectively have its modification time reset to now.

Log rolling might break for a newly created replica as well because of the same reason as (1).

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61318265)

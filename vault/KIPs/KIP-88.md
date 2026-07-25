---
id: "KIP-88"
title: "OffsetFetch Protocol Update"
status: "Adopted"
stub: true
cwiki:
  pageId: "66849788"
  version: 27
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66849788"
  lastChecked: "2026-07-25T00:43:03Z"
tags: []
related: []
---

## Summary

This KIP was prepared thanks to valuable feedback by .

KAFKA-3853 asks for an improvement to the describe option of the consumer group command for new (Java API based) consumers. This command, when passed a consumer group that has no consumer (i.e., when the group state is Empty), currently reports an error indicating that there is no active member:

bashThe requested improvement is returning offsets within the group (and leaving the consumer column empty) instead of returning the error message above. The error message can still be printed to stderr as a warning.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66849788)

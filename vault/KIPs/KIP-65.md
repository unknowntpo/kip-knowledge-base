---
id: "KIP-65"
title: "Expose timestamps to Connect"
status: "Adopted"
stub: true
cwiki:
  pageId: "65143827"
  version: 5
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65143827"
  lastChecked: "2026-07-25T00:42:17Z"
tags: []
related: []
---

## Summary

Timestamps were added to Kafka record types in the 0.10 release (KIP-32), however this does not get propagated automatically to Connect because it uses custom wrappers to add fields and rename some for clarity.

The addition of timestamps is trivial, but can be really useful:

in source connectors for topics where CreateTime timestamps are configured

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65143827)

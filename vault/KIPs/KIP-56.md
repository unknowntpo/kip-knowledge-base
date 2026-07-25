---
id: "KIP-56"
title: "Allow cross origin HTTP requests on all HTTP methods"
status: "Adopted"
stub: true
cwiki:
  pageId: "62693138"
  version: 2
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62693138"
  lastChecked: "2026-07-25T00:41:57Z"
tags: []
related: []
---

## Summary

Currently, Kafka Connect only allows requests from the same domain of the Kafka Connect cluster. To allow Kafka Connect to process requests from other domains, we need to allow cross origin HTTP requests.

Add the following configurations to Kafka Connect’s worker config: access.control.allow.methods

access.control.allow.methods controls which HTTP methods are allowed for cross origin HTTP requests.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62693138)

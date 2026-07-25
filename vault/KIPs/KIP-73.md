---
id: "KIP-73"
title: "Replication Quotas"
status: "Adopted"
stub: true
cwiki:
  pageId: "65864833"
  version: 24
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864833"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

10th Aug 2016: Switched from a delay-based approach, which uses dedicated throttled fetcher threads, to an inclusion-based approach, which puts throttled and unthrottled replicas in the same request/response

25th Sept 2016: Split throttled replica list into two properties. One for leader side. One for follower side.

30th Sept 2016: Split the quota property into two values, one for the leader and one for the follower. This adds consistency with the replicas property changed previously.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65864833)

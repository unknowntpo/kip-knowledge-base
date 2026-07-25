---
id: "KIP-70"
title: "Revise Partition Assignment Semantics on New Consumer's Subscription Change"
status: "Unknown"
stub: true
cwiki:
  pageId: "64553788"
  version: 33
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=64553788"
  lastChecked: "2026-07-25T00:42:24Z"
tags: []
related: []
---

## Summary

The idea behind this KIP was initiated as a result of the discussion on the pull request for KAFKA-3664. The original issue reported in the JIRA was about offsets of partitions not being committed when a consumer unsubscribes from them. Specifically, when users are using group management, if they call consumer.subscribe() or consumer.unsubscribe() to change the subscription, the removed subscriptions will be immediately removed and their offset will not be committed. The fix provided in the corresponding pull request includes performing a commitAsync() in subscribe() and unsubscribe() methods to trigger an offset commit only when auto commit is enabled for the consumer. This solution maintains the current invariants as far as consistency between the assignment and offset commits, and it addresses the main problem from the JIRA, which is basically that users will see duplicates when they change subscriptions with auto commit enabled. For users who are using manual commit, they will have to call commitSync() prior to changing their subscription, but that seems reasonable.

But if we consider the issue reported in the JIRA more carefully, we conclude that the root cause is consumer assignment that is currently updated immediately upon subscription changes (e.g. through this call, then this, and finally this). This behavior is something that can be improved due to following reasons (reference):

There is no known pattern for application development that would rely on the current behavior where the assignment is filtered immediately.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=64553788)

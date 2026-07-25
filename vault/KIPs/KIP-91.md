---
id: "KIP-91"
title: "Provide Intuitive User Timeouts in The Producer"
status: "Adopted"
stub: true
cwiki:
  pageId: "66851583"
  version: 22
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66851583"
  lastChecked: "2026-07-25T00:43:14Z"
tags: []
related: []
---

## Summary

In KIP-19, we added a request timeout to the network client. This change was necessary primarily to bound the time to detection of broker failures. In the absence of such a timeout, the producer would learn of the failure only much later (typically several minutes depending on the TCP timeout) during which the accumulator could fill up and cause requests to either block or get dropped depending on the block.on.buffer.full configuration. One additional goal of KIP-19 was to make timeouts intuitive. It is important for users to be provided with a guarantee on the maximum duration from when the call to send returns and when the callback fires (or future is ready). Notwithstanding the fact that intuition is a subjective thing, we will see shortly that this goal has not been met.

In order to clarify the motivation, it will be helpful to review the lifecycle of records and record-batches in the producer, where the timeouts apply, and changes that have been made since KIP-19.

The initial call to send can block up to max.block.ms either waiting on metadata or for available space in the producer's accumulator. After this the record is placed in a (possibly new) batch of records.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66851583)

---
id: "KIP-45"
title: "Standardize all client sequence interaction on j.u.Collection."
status: "Unknown"
stub: true
cwiki:
  pageId: "61337336"
  version: 5
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337336"
  lastChecked: "2026-07-25T00:41:38Z"
tags: []
related: []
---

## Summary

The KafkaConsumer API has some annoying inconsistencies in the usage of collection types. For example, subscribe() takes a list, but subscription() returns a set. Similarly for assign() and assignment(). We also have pause() , seekToBeginning(), seekToEnd(), and resume() which annoyingly use a variable argument array, which means you have to copy the result of assignment() to an array if you want to pause all assigned partitions.

Briefly list any new interfaces that will be introduced as part of this proposal or any existing interfaces that will be removed or changed. The purpose of this section is to concisely call out the public contract that will come along with this feature.

No new public interfaces are introduced, but changes to the existing ones are introduced:

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337336)

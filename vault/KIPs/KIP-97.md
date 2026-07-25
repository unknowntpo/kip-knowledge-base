---
id: "KIP-97"
title: "Improved Kafka Client RPC Compatibility Policy"
status: "Adopted"
stub: true
cwiki:
  pageId: "66854726"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66854726"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Currently, we have a “one-way” backwards compatibility policy. New brokers support older clients, but new clients do not support older broker versions. This policy makes it difficult for users to upgrade Kafka clients. Essentially, they must upgrade to the corresponding broker version before rolling out a new client version.

Upgrading the Kafka client should be a lightweight operation. It should be possible to restart individual clients separately and at different times, since they run in separate processes. However, the one-way compatibility policy forces system administrators to perform a heavyweight broker upgrade before they can execute the lightweight client upgrades.

Currently, users are incentivized to use the oldest client they can put up with. Old clients can talk to both new and old brokers, whereas new clients can only talk to new brokers. Users may miss out on important security, performance, and functionality upgrades because of these perverse incentives. The limited compatibility policy makes deploying and using Kafka more difficult for system administrators.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=66854726)

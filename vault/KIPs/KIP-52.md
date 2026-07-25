---
id: "KIP-52"
title: "Connector Control APIs"
status: "Under Discussion"
stub: true
cwiki:
  pageId: "62690048"
  version: 8
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62690048"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

After a connector is submitted to the Connect framework, users have limited control over its runtime operation. They can change its configuration and they can remove it, but there is no direct way to restart a failed connector or one of its tasks, nor to temporarily suspend processing while an upstream/downstream system is undergoing maintenance. In this KIP, we propose to add several control APIs to address this gap.

Description: This API asynchronously causes the connector and its tasks to suspend processing. If the connector is already paused, this is a no-op. The paused state is persistent, which means that the connector will stay paused even after cluster rebalances or is restarted.

Response Codes: 202 (Accepted) on successful pause initiation or if the command is a no-op, 404 if the connector doesn't exist

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62690048)

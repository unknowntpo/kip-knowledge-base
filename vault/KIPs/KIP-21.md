---
id: "KIP-21"
title: "Dynamic Configuration"
status: "Adopted"
stub: true
cwiki:
  pageId: "55156351"
  version: 45
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55156351"
  lastChecked: "2026-07-24T18:53:52Z"
tags: []
related: []
---

## Summary

In Kafka, there is no general mechanism to change entity configuration without doing a rolling restart of the entire cluster. Currently, only topic configs can be changed dynamically. This proposal attempts to build a unified mechanism for modeling configuration across various entities within Kafka i.e. topics, clients etc.

We will add a new tool called ConfigChangeCommand that can manage all config changes in ZK. New methods will be added in AdminUtils to change configuration. This will be similar to the TopicCommand tool already present.

AlterConfig and DescribeConfig APIs will be added (after KIP-4 is complete) to alter and view configs

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55156351)

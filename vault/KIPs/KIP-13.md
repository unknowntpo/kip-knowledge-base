---
id: "KIP-13"
title: "Quota Design"
status: "Adopted"
stub: true
cwiki:
  pageId: "51812210"
  version: 49
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51812210"
  lastChecked: "2026-07-24T18:56:00Z"
tags: []
related: []
---

## Summary

Currently, the Kafka cluster does not have the ability to throttle/rate limit producers and consumers. It is possible for a consumer to consume extremely fast and thus monopolize broker resources as well as cause network saturation. It is also possible for a producer to push extremely large amounts to data thus causing memory pressure and large IO on broker instances. We need a mechanism to enforce quotas on a per-client basis.

In this KIP, we will discuss a proposal to implement quotas in Kafka. We are proposing an approach that can used for both producer and consumer side quotas.

Metrics - The Quota Metrics which will be captured on a per-clientId basis, will be exposed to JMX. These are new metrics and do not use codahale. Instead, they use KM (Kafka Metrics) which is a new metrics library written for Kafka. More details in the Metrics section below.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51812210)

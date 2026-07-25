---
id: "KIP-43"
title: "Kafka SASL enhancements"
status: "Adopted"
stub: true
cwiki:
  pageId: "61337259"
  version: 30
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337259"
  lastChecked: "2026-07-25T00:41:35Z"
tags: []
related: []
---

## Summary

Kafka 0.9.0.0 added SASL-based authentication for clients and inter-broker communication. SASL is a framework that enables authentication and data security via replaceable mechanisms. But at the moment, SASL implementation in Kafka supports only SASL/GSSAPI using Kerberos and does not allow other SASL mechanisms to be plugged in. Enabling other SASL mechanisms will allow better integration with existing non-Kerberos authentication servers. In this KIP, we discuss a proposal for enabling other SASL mechanisms.

This KIP addresses the following extensions to the existing implementation:

Configurable SASL mechanism to enable integration with existing authentication servers

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=61337259)

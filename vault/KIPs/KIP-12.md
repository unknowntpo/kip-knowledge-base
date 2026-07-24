---
id: "KIP-12"
title: "Kafka Sasl/Kerberos and SSL implementation"
status: "Unknown"
stub: true
cwiki:
  pageId: "51809888"
  version: 16
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51809888"
  lastChecked: "2026-07-24T18:55:56Z"
tags: []
related: []
---

## Summary

The goal is to add sasl authentication capability to Kafka brokers and provide ssl for encryption.

Channel wrapper for TransportLayer and AuthenticationLayer providing necessary handshake and authentication methods and also read(ByteBuffer buf) , write(ByteBuffer buf), write(ByteBuffer[] buf).

TransportLayer is an interface for network transportLayer.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51809888)

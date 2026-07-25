---
id: "KIP-84"
title: "Support SASL SCRAM mechanisms"
status: "Unknown"
stub: true
cwiki:
  pageId: "65873453"
  version: 26
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65873453"
  lastChecked: "2026-07-25T00:42:56Z"
tags: []
related: []
---

## Summary

Kafka currently supports two SASL mechanisms out-of-the-box. SASL/GSSAPI enables authentication using Kerberos and SASL/PLAIN enables simple username-password authentication. Support for more mechanisms will provide Kafka users more choice and the option to use the same security infrastructure for different services. Salted Challenge Response Authentication Mechanism (SCRAM) is a family of SASL mechanisms that addresses the security concerns with traditional mechanisms like PLAIN and DIGEST-MD5. The mechanism is defined in RFC 5802 (https://tools.ietf.org/html/rfc5802).

This KIP proposes to add support for SCRAM SASL mechanisms to Kafka clients and brokers:

No public interface changes or new configuration options are required for this KIP.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65873453)

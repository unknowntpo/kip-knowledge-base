---
id: "KIP-86"
title: "Configurable SASL callback handlers"
status: "Unknown"
stub: true
cwiki:
  pageId: "65874679"
  version: 24
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65874679"
  lastChecked: "2026-07-25T00:43:01Z"
tags: []
related: []
---

## Summary

Kafka currently supports SASL authentication using SASL/PLAIN mechanism and KIP-84 addresses the addition of SASL/SCRAM. Credential verification in SASL/PLAIN servers is currently based on hard-coded credentials in JAAS configuration similar to Digest-MD5 configuration in Zookeeper. This is useful as a sample, but not suitable for production use since clear passwords are stored on disk. KIP-84 added SCRAM mechanism with Zookeeper as the password store. In production installations where Zookeeper is not secure (e.g. Kafka on the cloud), an alternative password store may be required.

With the current Kafka implementation, the entire SaslServer implementation needs to be replaced to enable new credential providers. It will be useful to add an extension point for SASL that enables just the credential providers to be replaced with a custom implementation. This should be done in a consistent way for all SASL mechanisms.

This KIP proposes to enable customization of SASL server and clients using configurable callback handlers. Configurable callback handlers for SASL/PLAIN and SASL/SCRAM will enable credential providers to be replaced in a simple and consistent way. In addition to this, configurable callback handlers for both server and clients make it easier to configure new or custom SASL mechanisms that are not implemented in Kafka.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=65874679)

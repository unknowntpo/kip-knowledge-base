---
id: "KIP-11"
title: "Kafka Authorizer design"
status: "Adopted"
stub: true
cwiki:
  pageId: "51807580"
  version: 128
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51807580"
  lastChecked: "2026-07-24T18:55:52Z"
tags: []
related: []
---

## Summary

As more enterprises have started using Kafka, there is a increasing demand for authorization for who can publish or consume from the topics. Authorization can be based on different available session attributes or context, like user, IP, common name in certificate, etc. Having an extendable authorization interface will help us to implement the core requirements in the initial phase and make it enterprise ready. Having a pluggable interface will enable other security focused products to provide more advanced and enterprise grade implementations.

A public interface is any change to the following:

The APIs will now do authorizations so the clients will see a new exception if they are not authorized for an operation.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=51807580)

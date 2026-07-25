---
id: "KIP-60"
title: "Make Java client classloading more flexible"
status: "Under Discussion"
stub: true
cwiki:
  pageId: "62696048"
  version: 4
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62696048"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

Kafka producers and consumers have several configuration options which are classes or list of classes. At the moment, these classes are dynamically loaded using the thread context classloader (TCCL) if one is set, or using the classloader that loaded Kafka classes if a context classloader is not set on the current thread. This works well in most environments including JEE where thread context classloaders are typically used. But some environments like OSGi don’t use thread context classloader and hence the current implementation of dynamic classloading in Kafka doesn’t work well in these environments. This KIP proposes some simple changes to enable Kafka clients to be run in any classloading environment including modular multi-classloader environments like OSGi.

Custom classes may be specified for configuration properties of type Type.CLASS and Type.LIST. Values of Type.CLASS may be an actual class object or a class name. Elements of Type.LIST may currently only be Strings and hence are a list of class names.

This KIP proposes to modify Type.LIST to optionally specify class objects when the list represents classes. This enables all classloading to be performed by client applications outside of Kafka, making the configuration of Kafka fully flexible. The existing classloading implementation will be retained for dynamic classloading when class names are specified, avoiding any impact on existing applications.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=62696048)

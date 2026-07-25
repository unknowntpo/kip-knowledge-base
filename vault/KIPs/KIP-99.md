---
id: "KIP-99"
title: "Add Global Tables to Kafka Streams"
status: "Adopted"
stub: true
cwiki:
  pageId: "67633649"
  version: 12
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=67633649"
  lastChecked: "2026-07-25T07:04:11Z"
tags: []
related: []
---

## Summary

In streams applications it is common to chain multiple joins together in-order to enrich a large dataset with some, often, smaller side-data. For example: enriching an Order with customer data. This also maps into the relational world where it is common to join some fact tables with some dimensional data. The facts are often large, with frequent updates and/or new data arrivals, i.e., a Purchases stream, whereas the dimensional data is generally much smaller with a potentially less frequent update rate, i.e., Products.

In Kafka Streams we can join the fact and dimension tables today, by partitioning both the fact stream & dimension table on the same key. This works ok if you only ever need to join the fact with one dimension, however joining to multiple dimensions requires repartitioning of the fact stream once for each dimension. This is quite expensive in terms of network I/O, disk usage, and processing latency, i.e., every re-partitioning operation results in duplicating the input stream to another topic. This requires consuming the input topic, re-keying and then writing to an intermediate topic, and then subsequently consuming from the intermediate topic. Further, this requires that the dimension tables be co-partitioned with the fact table, i.e. they are all required to have the same number of partitions. This can obviously result in over-the-top partitioning for small dimension data sets.

A convenient solution, where the dimensions are of a manageable size, is to replicate the dimension data, in their entirety, onto each Kafka Streams node. This then allows joins to be performed without the prerequisite that the fact stream be partitioned by the dimension table’s key, i.e., all dimension data is available to all partitions of the fact table, so we could perform non-key based joins from a fact to many dimensions regardless of their partitioning key, all at low cost.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=67633649)

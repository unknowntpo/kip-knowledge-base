---
id: "KIP-22"
title: "Expose a Partitioner interface in the new producer"
status: "Adopted"
stub: true
cwiki:
  pageId: "55156546"
  version: 16
  url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55156546"
  lastChecked: "2026-07-24T18:53:55Z"
tags: []
related: []
---

## Summary

In the new producer you can pass in a key or hard code the partition as part of ProducerRecord. Internally we are using a class org.apache.kafka.producer.internals.Partitioner . This class uses the specified partition if there is one; uses a hash of the key if there isn't a partition but there is a key; and simply chooses a partition round robin if there is neither a partition nor a key.

However there are several partitioning strategies that could be useful that we don't support out of the box. An example would be having each producer periodically choose a random partition. This tends to be the most efficient since all data goes to one server and uses the fewest TCP connections, however it only produces good load balancing if there are many producers. Of course a user can do this now by just setting the partition manually, but that is a bit inconvenient if you need to do that across a bunch of apps since each will need to remember to set the partition every time.

The idea would be to expose a configuration to set the partitioner implementation like partitioner.class=org.apache.kafka.producer.DefaultPartitioner . This would default to the existing partitioner implementation.

> [!note] Imported stub — full structured content pending. [View on cwiki](https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=55156546)

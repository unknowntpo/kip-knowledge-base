import { groupFeedRecords } from "../src/v1/feed-grouping";
import { feedGroupingBehaviorContract } from "./feed-grouping.behavior-contract";

feedGroupingBehaviorContract("production in-memory grouper", groupFeedRecords);

import { createLiveFeedLoader, ReferencePipelineController } from "./pipeline-controller";

/**
 * Process-local reference runtime. FeedPoller prevents per-request polling;
 * the controller retains the explicit event log and committed checkpoint
 * between scheduled refreshes. Production durability remains a later Fluss
 * stage, as recorded by Spec 004.
 */
export const liveReferenceController = new ReferencePipelineController();
export const loadLiveFeed = createLiveFeedLoader(liveReferenceController);

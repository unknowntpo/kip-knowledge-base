export type Status = "Adopted" | "Early Access" | "Under Discussion";

export interface Rejected {
  name: string;
  why: string;
}
export interface DiscussionMsg {
  author: string;
  date: string;
  text: string;
}
export interface VoteRow {
  vote: string; // "+1" | "-1" ...
  name: string;
  role: string; // "binding" | "non-binding"
}
export interface Vote {
  result: string;
  tally: string;
  closed: string;
  votes: VoteRow[];
}

export interface Kip {
  id: string;
  title: string;
  status: Status;
  category: string;
  release: string;
  authors: string;
  tags: string[];
  summary: string;
  motivation: string[];
  design: string[];
  pros: string[];
  cons: string[];
  rejected: Rejected[];
  discussionMeta: string;
  discussion: DiscussionMsg[];
  vote: Vote;
  related: string[];
}

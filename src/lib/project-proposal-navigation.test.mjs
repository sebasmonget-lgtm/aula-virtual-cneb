import test from "node:test";
import assert from "node:assert/strict";
import { nextPlanProposalIndex, proposalStatus } from "./project-proposal-navigation.mjs";

const proposals = [{ proposal_id: "p1" }, { proposal_id: "p2" }, { proposal_id: "p3" }];
const item = (id, status, index) => ({ annual_plan_id: "plan", source_proposal_id: id, source_proposal_index: index, status, version: 1 });

test("follows confirmed plan order and current state without relying on today's date", () => {
  assert.equal(nextPlanProposalIndex(proposals, [], "plan"), 0);
  assert.equal(nextPlanProposalIndex(proposals, [item("p1", "active", 0)], "plan"), 1);
  assert.equal(nextPlanProposalIndex(proposals, [item("p1", "active", 0), item("p2", "draft", 1)], "plan"), 1);
  assert.equal(nextPlanProposalIndex(proposals, [item("p1", "active", 0), item("p2", "active", 1), item("p3", "active", 2)], "plan"), 2);
  assert.equal(proposalStatus(item("p2", "draft", 1)), "En preparación");
});

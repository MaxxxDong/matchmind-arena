import { ethers } from "ethers";
import { encodeJsonDataUri } from "./metadataStore.mjs";

export function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function validateSignalVector(signal) {
  const values = ["homeBps", "drawBps", "awayBps", "confidenceBps"].map((key) => Number(signal[key]));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 10000)) {
    throw new Error("homeBps, drawBps, awayBps, and confidenceBps must be integers from 0 to 10000.");
  }
  if (values[0] + values[1] + values[2] !== 10000) {
    throw new Error("homeBps + drawBps + awayBps must equal 10000.");
  }
  return {
    homeBps: values[0],
    drawBps: values[1],
    awayBps: values[2],
    confidenceBps: values[3],
  };
}

export function buildSignalCommitment(match, signal = {}) {
  const vector = validateSignalVector({
    homeBps: signal.homeBps ?? match.homeBps,
    drawBps: signal.drawBps ?? match.drawBps,
    awayBps: signal.awayBps ?? match.awayBps,
    confidenceBps: signal.confidenceBps ?? match.confidenceBps,
  });
  const context = {
    matchId: match.id,
    title: match.title,
    source: signal.contextSource ?? "MatchMind browser context pack",
    notes: [match.bias, match.status, match.venue],
  };
  const rawEvidence = signal.rawEvidence ?? `evidence:${match.id}:browser-signal`;
  const metadata = {
    app: "MatchMind Arena",
    type: "signal-metadata",
    schemaVersion: 1,
    matchId: match.id,
    title: match.title,
    model: signal.model ?? "sports-signal-agent",
    explanation: signal.explanation ??
      "Signal generated from match context, public evidence, and the agent's own prediction method.",
    probabilities: {
      home: vector.homeBps,
      draw: vector.drawBps,
      away: vector.awayBps,
    },
    confidenceBps: vector.confidenceBps,
    generatedBy: signal.generatedBy ?? "agent-or-browser",
    generatedAt: signal.generatedAt ?? "unknown",
    rawEvidence: rawEvidence && typeof rawEvidence === "object" ? rawEvidence : { evidenceNote: rawEvidence },
  };
  const metadataHash = ethers.id(stableJson(metadata));
  return {
    matchId: ethers.id(match.id),
    contextHash: ethers.id(stableJson(context)),
    matchWindow: match.window,
    homeBps: vector.homeBps,
    drawBps: vector.drawBps,
    awayBps: vector.awayBps,
    confidenceBps: vector.confidenceBps,
    evidenceHash: ethers.id(typeof rawEvidence === "string" ? rawEvidence : stableJson(rawEvidence)),
    metadataHash,
    metadataUri: signal.metadataUri ?? encodeJsonDataUri({ ...metadata, metadataHash }),
  };
}

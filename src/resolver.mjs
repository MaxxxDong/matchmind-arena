import { ethers } from "ethers";
import { PUBLIC_RESULT_SOURCES, attachResultSource } from "./resultSources.mjs";

function normalizeText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .trim()
    .toLowerCase();
}

function groupMatches(text, group) {
  const normalized = normalizeText(text);
  return group.find((candidate) => normalized.includes(normalizeText(candidate))) || null;
}

export async function resolvePublicResults({ fetchImpl = fetch } = {}) {
  const resolutions = {};
  const sourceChecks = [];

  for (const [sourceId, source] of Object.entries(PUBLIC_RESULT_SOURCES)) {
    if (!source.resolver) continue;
    const startedAt = new Date().toISOString();
    const response = await fetchImpl(source.uri, {
      headers: { "user-agent": "MatchMindArenaResolver/0.1" },
    });
    const text = await response.text();
    const matchedGroups = source.resolver.requiredTextGroups.map((group) => groupMatches(text, group));
    const ok = response.ok && matchedGroups.every(Boolean);

    sourceChecks.push({
      sourceId,
      provider: source.provider,
      uri: source.uri,
      status: response.status,
      ok,
      checkedAt: startedAt,
      contentLength: text.length,
      contentHash: ethers.id(text),
      matchedGroups,
    });

    if (!ok) continue;
    const resolution = {
      result: source.resolver.result,
      resultScope: source.resolver.resultScope,
      sourceId,
      source: source.evidenceSummary,
      resolvedAt: startedAt,
      resolverStatus: "verified-from-public-source",
    };
    resolutions[source.resolver.matchId] = attachResultSource(resolution);
  }

  return {
    generatedAt: new Date().toISOString(),
    resolver: "matchmind-public-result-resolver",
    resolutions,
    sourceChecks,
  };
}

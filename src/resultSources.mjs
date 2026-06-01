import { ethers } from "ethers";

export const PUBLIC_RESULT_SOURCES = {
  espnArgentinaFrance2022: {
    provider: "ESPN",
    title: "Argentina 3-3 France (Dec 18, 2022) Final Score",
    uri: "https://global.espn.com/football/match/_/gameId/633850",
    checkedAt: "2026-06-01",
    evidenceSummary:
      "ESPN lists Argentina 3(4), France 3(2), with the match decided by a penalty shootout after a 3-3 draw.",
    resolver: {
      matchId: "demo-replay:argentina-france-2022",
      result: "draw",
      resultScope: "regular-time-1x2",
      requiredTextGroups: [
        ["Argentina"],
        ["France"],
        ["3(4), France 3(2)", "Argentina 3-3 France", "Argentina 3 - 3 France"],
        ["Penalty Shootout", "penalties", "penalty"],
      ],
    },
  },
};

function stableJson(value) {
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

export function sourceHash(source) {
  return ethers.id(stableJson(source));
}

export function attachResultSource(resolution) {
  const source = PUBLIC_RESULT_SOURCES[resolution?.sourceId];
  if (!source) return resolution;
  return {
    ...resolution,
    sourceProvider: source.provider,
    sourceTitle: source.title,
    sourceUri: source.uri,
    sourceCheckedAt: source.checkedAt,
    sourceEvidenceSummary: source.evidenceSummary,
    sourceHash: sourceHash(source),
  };
}

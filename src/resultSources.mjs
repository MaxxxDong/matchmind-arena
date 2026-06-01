import { ethers } from "ethers";

export const PUBLIC_RESULT_SOURCES = {
  fifaArgentinaFrance2022: {
    provider: "FIFA",
    title: "Argentina v France | Greatest Games | FIFA World Cup 2022",
    uri: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/argentina-france-2022-final-greatest-games",
    checkedAt: "2026-06-01",
    evidenceSummary:
      "FIFA lists Argentina 3-3 France (4-2 PSO), with France equalising in the 80th and 81st minutes before extra time.",
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

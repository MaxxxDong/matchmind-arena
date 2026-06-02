const JSON_DATA_URI_PREFIX = "data:application/json;base64,";

function utf8ToBase64(value) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(value) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeJsonDataUri(value) {
  return `${JSON_DATA_URI_PREFIX}${utf8ToBase64(JSON.stringify(value))}`;
}

export function decodeJsonDataUri(uri) {
  const text = String(uri || "");
  const commaIndex = text.indexOf(",");
  if (!text.startsWith("data:application/json") || commaIndex < 0) return null;
  const meta = text.slice(0, commaIndex).toLowerCase();
  const payload = text.slice(commaIndex + 1);
  const json = meta.includes(";base64")
    ? base64ToUtf8(payload)
    : decodeURIComponent(payload);
  return JSON.parse(json);
}

export function rawEvidenceFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  return metadata.rawEvidence
    || metadata.signal?.rawEvidence
    || metadata.signalPayload
    || metadata.evidence
    || null;
}

export function metadataAgentId(metadata) {
  return metadata?.agentId
    || metadata?.agent?.agentId
    || metadata?.profile?.agentId
    || metadata?.rawEvidence?.agentId
    || null;
}

export function attachMetadataToEvent(event, metadata) {
  if (!metadata) return event;
  const rawEvidence = rawEvidenceFromMetadata(metadata);
  return {
    ...event,
    rawEvidence: rawEvidence || event.rawEvidence || null,
    metadataRecord: metadata,
    agentId: metadataAgentId(metadata) || event.agentId || null,
  };
}

export function metadataMatchesEvent(record, event) {
  if (!record || !event) return false;
  const eventHash = String(event.metadataHash || "").toLowerCase();
  const recordHash = String(record.metadataHash || record.commitment?.metadataHash || "").toLowerCase();
  if (eventHash && recordHash && eventHash === recordHash) return true;

  const eventUri = String(event.metadataUri || "");
  const recordUri = String(record.metadataUri || record.commitment?.metadataUri || "");
  if (eventUri && recordUri && eventUri === recordUri) return true;

  const eventTx = String(event.txHash || "").toLowerCase();
  const recordTx = String(record.txHash || "").toLowerCase();
  return Boolean(eventTx && recordTx && eventTx === recordTx);
}

export function findLocalMetadata(event, records = []) {
  return records.find((record) => metadataMatchesEvent(record, event)) || null;
}

export function hydrateEventMetadataSync(event, { records = [] } = {}) {
  const localRecord = findLocalMetadata(event, records);
  if (localRecord) return attachMetadataToEvent(event, localRecord);
  const decoded = decodeJsonDataUri(event?.metadataUri);
  return decoded ? attachMetadataToEvent(event, decoded) : event;
}

export async function loadJsonMetadata(uri, { fetchImpl = globalThis.fetch } = {}) {
  const decoded = decodeJsonDataUri(uri);
  if (decoded) return decoded;
  const text = String(uri || "");
  if (!/^https?:\/\//i.test(text) || !fetchImpl) return null;
  const response = await fetchImpl(text, { headers: { "accept": "application/json" } });
  if (!response.ok) return null;
  return response.json();
}

export async function hydrateEventMetadata(event, { records = [], fetchImpl = globalThis.fetch } = {}) {
  const sync = hydrateEventMetadataSync(event, { records });
  if (sync.rawEvidence || sync.metadataRecord) return sync;
  try {
    const metadata = await loadJsonMetadata(event?.metadataUri, { fetchImpl });
    return metadata ? attachMetadataToEvent(event, metadata) : event;
  } catch (error) {
    return {
      ...event,
      metadataError: error?.message || "metadata fetch failed",
    };
  }
}

export async function hydrateEventsWithMetadata(events = [], options = {}) {
  return Promise.all(events.map((event) => hydrateEventMetadata(event, options)));
}

/**
 * Nest `/api/v1/incidents/*` — live data only from the API (e.g. Render), never from static `.txt` on Firebase Hosting.
 * Browser base: `getApiBaseUrl()` → `https://host/api/v1`.
 */
export const API_INCIDENTS_QUEUE_PATH = "/incidents/queue";

export const API_INCIDENTS_RESPONDERS_ASSIGNABLE_PATH = "/incidents/responders-assignable";

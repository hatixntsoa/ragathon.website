import { apiClient } from "./api_client";

// Simple submission helper — edit API_BASE in src/lib/api_client.ts to point to your backend if needed.
export async function submitResponseFile(file: File) {
  const fd = new FormData();
  fd.append("model", file, file.name);
  return apiClient.post("/submissions", fd);
}

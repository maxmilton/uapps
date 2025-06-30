import { AppError } from "#utils.ts";
export { Status } from "@uapps/http-status-codes";

export async function getEndpoint<T>(url: string): Promise<T> {
  const response = await fetch(process.env.FRONTEND_APP_API_ENDPOINT + url, {
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
  });

  if (!response.ok) {
    throw new AppError(await response.text(), response.status);
  }

  return response.json();
}

export async function sendEndpoint(
  method: "DELETE",
  url: string,
  data?: never,
): Promise<Response>;
export async function sendEndpoint(
  method: "PATCH" | "POST" | "PUT",
  url: string,
  data: Record<string, unknown> | undefined,
): Promise<Response>;
export async function sendEndpoint(
  method: string,
  url: string,
  data: Record<string, unknown> | undefined,
): Promise<Response> {
  const response = await fetch(process.env.FRONTEND_APP_API_ENDPOINT + url, {
    method,
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new AppError(await response.text(), response.status);
  }

  return response;
}

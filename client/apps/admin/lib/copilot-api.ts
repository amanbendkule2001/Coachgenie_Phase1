// // lib/copilot-api.ts

// const COPILOT_BASE =
//   process.env.NEXT_PUBLIC_COPILOT_URL!;

// function getHeaders(): HeadersInit {

//   return {

//     "Content-Type": "application/json",

//     Authorization: `Bearer ${
//       localStorage.getItem("cg_access_token") ?? ""
//     }`,

//     "X-Tenant-ID":
//       localStorage.getItem("tenant_id") ?? "",

//   };

// }

// async function handleResponse(res: Response) {

//   if (!res.ok) {

//     throw new Error(await res.text());

//   }

//   return res;

// }

// export const copilotApi = {

//   post: (
//     path: string,
//     body?: unknown,
//   ) =>

//     fetch(
//       `${COPILOT_BASE}${path}`,
//       {

//         method: "POST",

//         headers: getHeaders(),

//         body:
//           body !== undefined
//             ? JSON.stringify(body)
//             : undefined,

//       },
//     ).then(handleResponse),

// };

// NEW CODE

// lib/copilot-api.ts
const COPILOT_BASE = process.env.NEXT_PUBLIC_COPILOT_URL!;

function getHeaders(): HeadersInit {
  let tenantId: string | null = null;
  let userId: string | null = null;

  try {
    const raw = localStorage.getItem("coachgenie-ui");
    const state = raw ? JSON.parse(raw)?.state : null;
    tenantId = state?.tenantId ?? null;
    userId = state?.user?.id ?? null;
  } catch {}

  return {
    "Content-Type": "application/json",
    ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

export const copilotApi = {
  post: (path: string, body?: unknown) =>
    fetch(`${COPILOT_BASE}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse),
};
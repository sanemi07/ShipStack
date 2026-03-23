import { BackendStatus } from "@/components/StatusCard";

type CreateDeploymentResponse = {
  id: string;
};

type GetDeploymentStatusResponse = {
  status: BackendStatus;
};

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002").replace(
    /\/$/,
    "",
  );
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
    };

    return data.error || data.message || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export async function createDeployment(
  repourl: string,
): Promise<CreateDeploymentResponse> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repourl }),
    });
  } catch {
    throw new Error(
      `Unable to reach the deployment API at ${getApiBaseUrl()}. Check NEXT_PUBLIC_API_URL and make sure uploadService is running.`,
    );
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as CreateDeploymentResponse;
}

export async function getDeploymentStatus(
  id: string,
): Promise<GetDeploymentStatusResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${getApiBaseUrl()}/status?id=${encodeURIComponent(id)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
  } catch {
    throw new Error(
      `Unable to reach the deployment API at ${getApiBaseUrl()}. Check NEXT_PUBLIC_API_URL and make sure uploadService is running.`,
    );
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as GetDeploymentStatusResponse;
}

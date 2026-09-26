type VercelVerificationChallenge = {
  type?: string;
  domain?: string;
  value?: string;
  reason?: string;
};

type VercelProjectDomain = {
  name?: string;
  apexName?: string;
  projectId?: string;
  verified?: boolean;
  verification?: VercelVerificationChallenge[];
};

type VercelDomainConfig = {
  configuredBy?: "A" | "CNAME" | "http" | "dns-01" | null;
  misconfigured?: boolean;
  recommendedIPv4?: Array<{
    rank?: number;
    value?: string[];
  }>;
  recommendedCNAME?: Array<{
    rank?: number;
    value?: string;
  }>;
};

type VercelApiError = {
  error?: {
    code?: string;
    message?: string;
    domain?: string;
  };
};

export type BloomWebsiteRoutingDnsRecord = {
  type: "A" | "CNAME";
  name: string;
  value: string;
};

export type BloomWebsiteVercelStatus = {
  providerConfigured: boolean;
  attached: boolean;
  projectVerified: boolean;
  routingReady: boolean;
  configuredBy: string | null;
  dnsRecord: BloomWebsiteRoutingDnsRecord | null;
  providerVerification: VercelVerificationChallenge[];
  message: string;
};

function getVercelConfig() {
  const token = process.env.VERCEL_API_TOKEN?.trim() || "";
  const project =
    process.env.VERCEL_PROJECT_ID?.trim() ||
    process.env.VERCEL_PROJECT_NAME?.trim() ||
    "";
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || "";

  return {
    token,
    project,
    teamId,
    configured: Boolean(token && project),
  };
}

function buildTeamQuery(teamId: string) {
  return teamId ? `teamId=${encodeURIComponent(teamId)}` : "";
}

async function parseVercelResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload = {} as T & VercelApiError;

  if (raw) {
    try {
      payload = JSON.parse(raw) as T & VercelApiError;
    } catch {
      // Some successful Vercel endpoints can return an empty
      // or non-JSON response. HTTP status remains authoritative.
    }
  }

  if (!response.ok) {
    const message =
      payload.error?.message ||
      `Vercel returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  return payload;
}

async function vercelFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = getVercelConfig();

  if (!config.configured) {
    throw new Error("Vercel domain provisioning is not configured.");
  }

  const separator = path.includes("?") ? "&" : "?";
  const teamQuery = buildTeamQuery(config.teamId);
  const url = teamQuery
    ? `https://api.vercel.com${path}${separator}${teamQuery}`
    : `https://api.vercel.com${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  return parseVercelResponse<T>(response);
}

function getPreferredIPv4(config: VercelDomainConfig) {
  const entries = [...(config.recommendedIPv4 || [])].sort(
    (a, b) => (a.rank ?? 999) - (b.rank ?? 999),
  );

  return entries.flatMap((entry) => entry.value || [])[0] || "";
}

function getPreferredCname(config: VercelDomainConfig) {
  const entries = [...(config.recommendedCNAME || [])].sort(
    (a, b) => (a.rank ?? 999) - (b.rank ?? 999),
  );

  return entries[0]?.value?.replace(/\.$/, "") || "";
}

function getRoutingRecord(
  domain: string,
  projectDomain: VercelProjectDomain,
  config: VercelDomainConfig,
): BloomWebsiteRoutingDnsRecord | null {
  const isApex =
    Boolean(projectDomain.apexName) &&
    projectDomain.apexName?.toLowerCase() === domain.toLowerCase();

  if (isApex) {
    const value = getPreferredIPv4(config);

    return value
      ? {
          type: "A",
          name: "@",
          value,
        }
      : null;
  }

  const value = getPreferredCname(config);

  if (!value) {
    return null;
  }

  const apex = projectDomain.apexName?.toLowerCase() || "";
  const normalizedDomain = domain.toLowerCase();

  const relativeName =
    apex && normalizedDomain.endsWith(`.${apex}`)
      ? normalizedDomain.slice(0, -(apex.length + 1))
      : normalizedDomain;

  return {
    type: "CNAME",
    name: relativeName || domain,
    value,
  };
}

export function isVercelDomainProvisioningConfigured() {
  return getVercelConfig().configured;
}

export async function addBloomWebsiteDomainToVercel(domain: string) {
  const config = getVercelConfig();

  if (!config.configured) {
    return {
      providerConfigured: false,
      attached: false,
      projectVerified: false,
      routingReady: false,
      configuredBy: null,
      dnsRecord: null,
      providerVerification: [],
      message:
        "Bloom hosting is not connected to the Vercel domain API yet.",
    } satisfies BloomWebsiteVercelStatus;
  }

  try {
    await vercelFetch<VercelProjectDomain>(
      `/v10/projects/${encodeURIComponent(config.project)}/domains`,
      {
        method: "POST",
        body: JSON.stringify({
          name: domain,
        }),
      },
    );
  } catch (error) {
    /*
     * "Already attached" is harmless, but permission,
     * ownership, plan, and provider failures must not be
     * swallowed.
     */
    const existingStatus = await getBloomWebsiteVercelStatus(domain);

    if (!existingStatus.attached) {
      throw error;
    }
  }

  let status = await getBloomWebsiteVercelStatus(domain);

  /*
   * Vercel may require its own account-level TXT challenge
   * when the domain is associated with another Vercel
   * account/team. Bloom's TXT proves ownership to Bloom;
   * this call asks Vercel to re-check its own challenge.
   */
  if (status.attached && !status.projectVerified) {
    try {
      await vercelFetch<VercelProjectDomain>(
        `/v9/projects/${encodeURIComponent(
          config.project,
        )}/domains/${encodeURIComponent(domain)}/verify`,
        {
          method: "POST",
        },
      );
    } catch {
      // Keep returning the challenge/status so the UI can
      // show the exact provider TXT record still required.
    }

    status = await getBloomWebsiteVercelStatus(domain);
  }

  return status;
}

export async function getBloomWebsiteVercelStatus(
  domain: string,
): Promise<BloomWebsiteVercelStatus> {
  const config = getVercelConfig();

  if (!config.configured) {
    return {
      providerConfigured: false,
      attached: false,
      projectVerified: false,
      routingReady: false,
      configuredBy: null,
      dnsRecord: null,
      providerVerification: [],
      message:
        "Bloom hosting is not connected to the Vercel domain API yet.",
    };
  }

  let projectDomain: VercelProjectDomain;

  try {
    projectDomain = await vercelFetch<VercelProjectDomain>(
      `/v9/projects/${encodeURIComponent(config.project)}/domains/${encodeURIComponent(
        domain,
      )}`,
    );
  } catch (error) {
    return {
      providerConfigured: true,
      attached: false,
      projectVerified: false,
      routingReady: false,
      configuredBy: null,
      dnsRecord: null,
      providerVerification: [],
      message:
        error instanceof Error
          ? error.message
          : "The domain is not attached to Bloom hosting yet.",
    };
  }

  const domainConfig = await vercelFetch<VercelDomainConfig>(
    `/v6/domains/${encodeURIComponent(
      domain,
    )}/config?projectIdOrName=${encodeURIComponent(config.project)}`,
  );

  const projectVerified = projectDomain.verified === true;
  const routingReady =
    projectVerified && domainConfig.misconfigured === false;

  return {
    providerConfigured: true,
    attached: true,
    projectVerified,
    routingReady,
    configuredBy: domainConfig.configuredBy || null,
    dnsRecord: getRoutingRecord(domain, projectDomain, domainConfig),
    providerVerification: projectDomain.verification || [],
    message: routingReady
      ? "The domain is attached to Bloom hosting and its routing DNS is valid."
      : "The domain is attached to Bloom hosting, but its routing DNS still needs attention.",
  };
}


export async function removeBloomWebsiteDomainFromVercel(domain: string) {
  const config = getVercelConfig();

  if (!config.configured) {
    return {
      providerConfigured: false,
      removed: false,
      message:
        "Bloom hosting is not connected to the Vercel domain API, so the existing hostname cannot be safely detached.",
    };
  }

  const current = await getBloomWebsiteVercelStatus(domain);

  if (!current.attached) {
    return {
      providerConfigured: true,
      removed: true,
      message: "The hostname is not attached to the Bloom hosting project.",
    };
  }

  await vercelFetch<Record<string, never>>(
    `/v9/projects/${encodeURIComponent(
      config.project,
    )}/domains/${encodeURIComponent(domain)}`,
    {
      method: "DELETE",
    },
  );

  const after = await getBloomWebsiteVercelStatus(domain);

  if (after.attached) {
    throw new Error(
      "Vercel still reports this hostname as attached after the removal request.",
    );
  }

  return {
    providerConfigured: true,
    removed: true,
    message: "The hostname was detached from Bloom hosting.",
  };
}

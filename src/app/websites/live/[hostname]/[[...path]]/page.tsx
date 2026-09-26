import BloomWebsiteCartProvider from "@/components/websites/storefront/BloomWebsiteCartProvider";
import BloomWebsiteCardMessageCheckout from "@/components/websites/storefront/BloomWebsiteCardMessageCheckout";
import BloomWebsiteCheckoutProvider from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";
import BloomWebsiteDeliveryCheckout from "@/components/websites/storefront/BloomWebsiteDeliveryCheckout";
import BloomWebsitePaymentCheckout from "@/components/websites/storefront/BloomWebsitePaymentCheckout";
import BloomWebsiteOrderConfirmation from "@/components/websites/storefront/BloomWebsiteOrderConfirmation";
import BloomWebsiteProductStorefront from "@/components/websites/storefront/BloomWebsiteProductStorefront";
import BloomWebsiteShopStorefront from "@/components/websites/storefront/BloomWebsiteShopStorefront";
import BloomWebsiteThemeSurface from "@/components/websites/storefront/BloomWebsiteThemeSurface";
import BloomClassicTheme from "@/components/websites/themes/BloomClassicTheme";

import { getBloomWebsiteLiveTenant } from "@/lib/bloom-websites/getBloomWebsiteLiveTenant";
import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import { getBloomWebsiteStorefrontCatalog } from "@/lib/bloom-websites/getBloomWebsiteStorefrontCatalog";
import { getBloomWebsiteStorefrontProduct } from "@/lib/bloom-websites/getBloomWebsiteStorefrontProduct";
import {
  isBloomWebsiteRequestHostMatch,
  normalizeBloomWebsiteHostname,
} from "@/lib/bloom-websites/storefront-hostname";
import {
  getBloomWebsiteCatalogMetadata,
  getBloomWebsiteHomepageMetadata,
  getBloomWebsitePreviewFallbackMetadata,
  getBloomWebsiteProductMetadata,
} from "@/lib/bloom-websites/storefront-metadata";
import {
  BloomWebsiteJsonLd,
  getBloomWebsiteHomepageStructuredData,
  getBloomWebsiteProductStructuredData,
} from "@/lib/bloom-websites/storefront-structured-data";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string | string[];
  occasion?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

type BloomWebsiteLiveRouteProps = {
  params: Promise<{
    hostname: string;
    path?: string[];
  }>;

  searchParams: Promise<SearchParams>;
};

function isKnownStorefrontPagePath(path: string[]) {
  if (path.length === 0) {
    return true;
  }

  if (path.length === 1 && path[0] === "shop") {
    return true;
  }

  if (
    path.length === 2 &&
    path[0] === "products" &&
    Boolean(path[1])
  ) {
    return true;
  }

  if (
    path.length === 2 &&
    path[0] === "checkout" &&
    ["delivery", "message", "payment"].includes(path[1] || "")
  ) {
    return true;
  }

  if (
    path.length === 2 &&
    path[0] === "order-confirmation" &&
    Boolean(path[1])
  ) {
    return true;
  }

  return false;
}

async function requestMatchesStorefrontHostname(hostname: string) {
  const requestHeaders = await headers();

  return isBloomWebsiteRequestHostMatch(requestHeaders, hostname);
}


export async function generateMetadata({
  params,
}: BloomWebsiteLiveRouteProps): Promise<Metadata> {
  const resolvedParams = await params;
  const hostname = normalizeBloomWebsiteHostname(
    decodeURIComponent(resolvedParams.hostname),
  );
  const path = resolvedParams.path || [];

  if (
    !hostname ||
    !isKnownStorefrontPagePath(path) ||
    !(await requestMatchesStorefrontHostname(hostname))
  ) {
    return {
      title: {
        absolute: "Storefront unavailable",
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const tenant = await getBloomWebsiteLiveTenant(hostname);

  if (!tenant) {
    return {
      title: {
        absolute: "Storefront unavailable",
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const publicOrigin = `https://${tenant.customDomain}`;

  if (path.length === 0) {
    const storefront = await getBloomWebsiteStorefront(
      tenant.previewSlug,
      tenant.shopId,
    );

    if (!storefront) {
      return getBloomWebsitePreviewFallbackMetadata();
    }

    return getBloomWebsiteHomepageMetadata(storefront, {
      publicOrigin,
    });
  }

  if (path.length === 1 && path[0] === "shop") {
    const catalog = await getBloomWebsiteStorefrontCatalog(
      tenant.previewSlug,
      tenant.shopId,
    );

    if (!catalog) {
      return getBloomWebsitePreviewFallbackMetadata();
    }

    return getBloomWebsiteCatalogMetadata(catalog, {
      publicOrigin,
    });
  }

  if (path[0] === "products" && path[1]) {
    const storefront = await getBloomWebsiteStorefrontProduct(
      tenant.previewSlug,
      path[1],
      tenant.shopId,
    );

    if (!storefront) {
      return getBloomWebsitePreviewFallbackMetadata();
    }

    return getBloomWebsiteProductMetadata(storefront, {
      publicOrigin,
    });
  }

  return {
    title: {
      absolute: `Checkout | ${tenant.siteName}`,
    },
    robots: {
      index: false,
      follow: false,
      noarchive: true,
    },
  };
}

export default async function BloomWebsiteLiveRouteBoundary({
  params,
  searchParams,
}: BloomWebsiteLiveRouteProps) {
  const resolvedParams = await params;
  const hostname = normalizeBloomWebsiteHostname(
    decodeURIComponent(resolvedParams.hostname),
  );
  const path = resolvedParams.path || [];

  if (
    !hostname ||
    !isKnownStorefrontPagePath(path) ||
    !(await requestMatchesStorefrontHostname(hostname))
  ) {
    notFound();
  }

  const tenant = await getBloomWebsiteLiveTenant(hostname);

  if (!tenant) {
    notFound();
  }

  /*
   * Use the already-resolved owner shop id as a second
   * ownership constraint when loading storefront data.
   *
   * This prevents a preview slug collision or stale route
   * from ever crossing tenant boundaries.
   */
  const storefront = await getBloomWebsiteStorefront(
    tenant.previewSlug,
    tenant.shopId,
  );

  if (!storefront || storefront.website.status !== "live") {
    notFound();
  }

  let content;

  if (path.length === 0) {
    const structuredData = getBloomWebsiteHomepageStructuredData(
      storefront,
      {
        publicOrigin: `https://${tenant.customDomain}`,
      },
    );

    content = (
      <>
        <BloomWebsiteJsonLd data={structuredData} />

        <BloomClassicTheme
          storefront={storefront}
          basePath=""
        />
      </>
    );
  } else if (path.length === 1 && path[0] === "shop") {
    const catalog = await getBloomWebsiteStorefrontCatalog(
      tenant.previewSlug,
      tenant.shopId,
    );

    if (!catalog) {
      notFound();
    }

    content = (
      <BloomWebsiteShopStorefront
        catalog={catalog}
        basePath=""
        searchParams={await searchParams}
      />
    );
  } else if (path[0] === "products" && path[1]) {
    const productStorefront = await getBloomWebsiteStorefrontProduct(
      tenant.previewSlug,
      path[1],
      tenant.shopId,
    );

    if (!productStorefront) {
      notFound();
    }

    const structuredData = getBloomWebsiteProductStructuredData(
      productStorefront,
      {
        publicOrigin: `https://${tenant.customDomain}`,
      },
    );

    content = (
      <>
        <BloomWebsiteJsonLd data={structuredData} />

        <BloomWebsiteProductStorefront
          storefront={productStorefront}
          basePath=""
        />
      </>
    );
  } else if (path[0] === "checkout" && path[1] === "delivery") {
    content = (
      <BloomWebsiteDeliveryCheckout
        previewSlug={tenant.previewSlug}
        basePath=""
      />
    );
  } else if (path[0] === "checkout" && path[1] === "message") {
    content = (
      <BloomWebsiteCardMessageCheckout
        previewSlug={tenant.previewSlug}
        basePath=""
      />
    );
  } else if (path[0] === "checkout" && path[1] === "payment") {
    content = (
      <BloomWebsitePaymentCheckout
        previewSlug={tenant.previewSlug}
        basePath=""
      />
    );
  } else if (path[0] === "order-confirmation" && path[1]) {
    content = (
      <BloomWebsiteOrderConfirmation
        previewSlug={tenant.previewSlug}
        attemptId={path[1]}
        storefrontBasePath=""
      />
    );
  } else {
    notFound();
  }

  return (
    <BloomWebsiteThemeSurface theme={storefront.website.storefrontTheme}>
      <BloomWebsiteCheckoutProvider previewSlug={tenant.previewSlug}>
        <BloomWebsiteCartProvider
          previewSlug={tenant.previewSlug}
          basePath=""
        >
          {content}
        </BloomWebsiteCartProvider>
      </BloomWebsiteCheckoutProvider>
    </BloomWebsiteThemeSurface>
  );
}

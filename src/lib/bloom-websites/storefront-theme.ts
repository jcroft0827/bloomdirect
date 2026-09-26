import type {
  BloomWebsiteBackgroundStyle,
  BloomWebsiteStorefrontTheme,
  BloomWebsiteThemeName,
} from "@/types/bloom-website";

export const DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR = "#654783";

export const DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR = "#37a156";

export const DEFAULT_BLOOM_WEBSITE_THEME_NAME: BloomWebsiteThemeName =
  "bloom-classic";

export const DEFAULT_BLOOM_WEBSITE_BACKGROUND_STYLE: BloomWebsiteBackgroundStyle =
  "clean";

export const BLOOM_WEBSITE_BACKGROUND_STYLES: readonly BloomWebsiteBackgroundStyle[] =
  ["clean", "soft_floral", "botanical", "romantic", "minimal_texture"] as const;

type NormalizeBloomWebsiteStorefrontThemeInput = {
  themeName?: string | null;

  logo?: string | null;

  primaryColor?: string | null;
  accentColor?: string | null;

  tagline?: string | null;

  backgroundStyle?: string | null;
};

/**
 * Expands valid shorthand hex colors.
 *
 * #abc -> #aabbcc
 */
function expandShortHex(value: string) {
  return `#${value
    .slice(1)
    .split("")
    .map((character) => character + character)
    .join("")}`;
}

/**
 * Normalize an arbitrary value into a safe six-character
 * hexadecimal CSS color.
 *
 * Accepted:
 *
 * #654783
 * 654783
 * #abc
 * abc
 *
 * Invalid values fall back to Bloom's supplied default.
 */
export function normalizeStorefrontHexColor(
  value: string | null | undefined,
  fallback: string,
) {
  const normalizedFallback = fallback.trim().toLowerCase();

  if (!value) {
    return normalizedFallback;
  }

  let candidate = value.trim().toLowerCase();

  if (!candidate) {
    return normalizedFallback;
  }

  if (!candidate.startsWith("#")) {
    candidate = `#${candidate}`;
  }

  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return expandShortHex(candidate);
  }

  if (/^#[0-9a-f]{6}$/i.test(candidate)) {
    return candidate;
  }

  return normalizedFallback;
}

/**
 * Convert #rrggbb to RGB.
 *
 * This helper expects a normalized six-character hex value.
 */
function hexToRgb(hex: string) {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),

    green: Number.parseInt(hex.slice(3, 5), 16),

    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * WCAG-style relative luminance calculation.
 *
 * We use this to decide whether black or white text provides
 * better contrast against a florist-selected brand color.
 */
function getRelativeLuminance(hex: string) {
  const { red, green, blue } = hexToRgb(hex);

  const channels = [red, green, blue].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Return whichever foreground - black or white - gives the
 * stronger contrast ratio against the supplied background.
 *
 * This means a florist can choose a pale brand color without
 * Bloom blindly placing unreadable white text on top of it.
 */
export function getStorefrontContrastText(
  backgroundColor: string | null | undefined,
): "#000000" | "#ffffff" {
  const normalizedColor = normalizeStorefrontHexColor(
    backgroundColor,
    DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  );

  const luminance = getRelativeLuminance(normalizedColor);

  const contrastWithBlack = (luminance + 0.05) / 0.05;

  const contrastWithWhite = 1.05 / (luminance + 0.05);

  return contrastWithBlack >= contrastWithWhite ? "#000000" : "#ffffff";
}

export function isBloomWebsiteBackgroundStyle(
  value: string | null | undefined,
): value is BloomWebsiteBackgroundStyle {
  if (!value) {
    return false;
  }

  return BLOOM_WEBSITE_BACKGROUND_STYLES.includes(
    value as BloomWebsiteBackgroundStyle,
  );
}

function normalizeThemeName(
  value: string | null | undefined,
): BloomWebsiteThemeName {
  switch (value) {
    case "bloom-classic":
      return value;

    default:
      return DEFAULT_BLOOM_WEBSITE_THEME_NAME;
  }
}

/**
 * The single normalization boundary for BloomWebsite
 * storefront branding.
 *
 * Components should eventually consume the result of this
 * function rather than individually deciding:
 *
 * - fallback colors
 * - contrast colors
 * - valid background styles
 * - default theme
 *
 * This keeps every BloomWebsite visually consistent and
 * makes future settings changes dramatically safer.
 */
export function normalizeBloomWebsiteStorefrontTheme(
  input: NormalizeBloomWebsiteStorefrontThemeInput = {},
): BloomWebsiteStorefrontTheme {
  const primaryColor = normalizeStorefrontHexColor(
    input.primaryColor,
    DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  );

  const accentColor = normalizeStorefrontHexColor(
    input.accentColor,
    DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  );

  const backgroundStyle = isBloomWebsiteBackgroundStyle(input.backgroundStyle)
    ? input.backgroundStyle
    : DEFAULT_BLOOM_WEBSITE_BACKGROUND_STYLE;

  return {
    themeName: normalizeThemeName(input.themeName),

    logo: input.logo?.trim() || "",

    primaryColor,
    accentColor,

    primaryForeground: getStorefrontContrastText(primaryColor),

    accentForeground: getStorefrontContrastText(accentColor),

    tagline: input.tagline?.trim() || "",

    backgroundStyle,
  };
}

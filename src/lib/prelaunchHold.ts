/** Prelaunch controls: public registration stays open by default. */
export function isPrelaunchHoldEnabled(): boolean {
  // Legacy emergency registration shutoff; explicitly opt in only.
  return process.env.BLOOM_PRELAUNCH_HOLD?.trim().toLowerCase() === "true";
}

/** New BloomWebsites activations remain paused in all environments until explicitly reopened. */
export function areNewBloomWebsiteActivationsPaused(): boolean {
  const value = process.env.BLOOM_NEW_WEBSITE_ACTIVATIONS?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  // Default closed in every environment so local verification matches production.
  return true;
}

export const PRELAUNCH_HOLD_MESSAGE =
  "Registration is temporarily unavailable. Existing accounts are unaffected.";
export const WEBSITE_ACTIVATION_PAUSED_MESSAGE =
  "BloomWebsites publishing is coming soon. You can build and preview your website for free in the meantime. Your work will be saved.";

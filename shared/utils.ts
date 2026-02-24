import { SAFETY_SIGNALS, type Outcome, type SafetySignal } from "./types";

/**
 * Detect outcome from conversation without AI calls
 * Uses keyword-based analysis for resolved, in_progress, or referred
 */
export function detectOutcome(messages: Array<{ role: string; content: string }>): {
  outcome: Outcome;
  safetyRisk?: string;
  referralType?: string;
} {
  const allText = messages.map(m => m.content).join(" ").toLowerCase();
  
  // Check for safety signals first (highest priority)
  for (const signal of SAFETY_SIGNALS) {
    if (allText.includes(signal.keyword.toLowerCase())) {
      return {
        outcome: "referred",
        safetyRisk: signal.type,
        referralType: signal.referralType,
      };
    }
  }
  
  // Check for resolution keywords
  const resolutionKeywords = [
    "opgelost", "beter", "verbeterd", "gelukt", "werkt nu", "dankjewel",
    "heel erg bedankt", "super geholpen", "veel geholpen", "fijn",
  ];
  
  if (resolutionKeywords.some(kw => allText.includes(kw))) {
    return { outcome: "resolved" };
  }
  
  // Default: in progress
  return { outcome: "in_progress" };
}

/**
 * Detect safety signals in text
 */
export function detectSafetySignals(text: string): SafetySignal[] {
  const lowerText = text.toLowerCase();
  return SAFETY_SIGNALS.filter(signal => lowerText.includes(signal.keyword.toLowerCase()));
}

/**
 * Format postcode for regional analytics (privacy-friendly)
 * Only use first 4 digits for anonymity
 */
export function anonymizePostcode(postcode: string): string {
  return postcode.substring(0, 4);
}

/**
 * Get referral contact info
 */
export function getReferralInfo(referralType: string): {
  name: string;
  phone: string;
  description: string;
  url?: string;
} {
  const referrals: Record<string, any> = {
    "113": {
      name: "Telefoonnummer 113",
      phone: "113",
      description: "Zelfmoordpreventie - 24/7 beschikbaar",
      url: "https://www.113.nl",
    },
    "veilig_thuis": {
      name: "Veilig Thuis",
      phone: "0800-2000",
      description: "Meldpunt huiselijk geweld en kindermishandeling",
      url: "https://www.veiligthuis.nl",
    },
    "ggz": {
      name: "GGZ Nederland",
      phone: "0900-1450",
      description: "Geestelijke gezondheidszorg",
      url: "https://www.ggznederland.nl",
    },
    "112": {
      name: "Alarmnummer 112",
      phone: "112",
      description: "Noodlijn voor acute gevallen",
      url: "https://www.112.nl",
    },
  };
  
  return referrals[referralType] || referrals["113"];
}

/**
 * Create analytics event payload
 */
export function createAnalyticsEvent(
  eventType: string,
  data: {
    themeId?: string;
    outcome?: string;
    safetyRisk?: string;
    postcode?: string;
    userId?: number;
  }
) {
  return {
    eventType,
    timestamp: Date.now(),
    ...data,
  };
}

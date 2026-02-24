// Shared types between web and mobile apps

export type ThemeId = 
  | "sleep"
  | "behavior"
  | "development"
  | "emotions"
  | "school"
  | "social"
  | "health"
  | "communication"
  | "boundaries";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  sleep: { id: "sleep", name: "Slaap", description: "Slaapproblemen en rustritmes", emoji: "😴" },
  behavior: { id: "behavior", name: "Gedrag", description: "Gedragsproblemen en discipline", emoji: "🎯" },
  development: { id: "development", name: "Ontwikkeling", description: "Motorische en cognitieve ontwikkeling", emoji: "🌱" },
  emotions: { id: "emotions", name: "Emoties", description: "Gevoelens en emotionele gezondheid", emoji: "❤️" },
  school: { id: "school", name: "School", description: "Schoolprestaties en motivatie", emoji: "📚" },
  social: { id: "social", name: "Sociaal", description: "Vriendschappen en sociale vaardigheden", emoji: "👥" },
  health: { id: "health", name: "Gezondheid", description: "Lichamelijke gezondheid en voeding", emoji: "🏥" },
  communication: { id: "communication", name: "Communicatie", description: "Communicatie met je kind", emoji: "💬" },
  boundaries: { id: "boundaries", name: "Grenzen", description: "Grenzen stellen en consequenties", emoji: "🚧" },
};

export type FamilyComposition = "single" | "couple" | "extended";
export type Gender = "male" | "female" | "other";
export type Outcome = "resolved" | "in_progress" | "referred";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: number;
  themeId: ThemeId;
  messages: Message[];
  outcome: Outcome;
  safetyRisk?: string;
  referralMade?: number;
  referralType?: "113" | "veilig_thuis" | "ggz" | "112";
  createdAt: number;
  updatedAt: number;
}

export interface FamilyProfile {
  id: number;
  familyComposition: FamilyComposition;
  focusChildName: string;
  focusChildAge: number;
  focusChildGender: Gender;
  postcode?: string;
  selectedThemes: ThemeId[];
  createdAt: number;
  updatedAt: number;
}

export interface SafetySignal {
  keyword: string;
  type: "abuse" | "neglect" | "suicide_risk" | "self_harm" | "violence";
  referralType: "113" | "veilig_thuis" | "ggz" | "112";
}

export const SAFETY_SIGNALS: SafetySignal[] = [
  // Abuse signals
  { keyword: "slaan", type: "abuse", referralType: "veilig_thuis" },
  { keyword: "mishandeling", type: "abuse", referralType: "veilig_thuis" },
  { keyword: "geweld", type: "abuse", referralType: "veilig_thuis" },
  { keyword: "pijn doen", type: "abuse", referralType: "veilig_thuis" },
  
  // Neglect signals
  { keyword: "niet eten", type: "neglect", referralType: "veilig_thuis" },
  { keyword: "geen eten", type: "neglect", referralType: "veilig_thuis" },
  { keyword: "verwaarlozing", type: "neglect", referralType: "veilig_thuis" },
  
  // Suicide/self-harm signals
  { keyword: "zelfmoord", type: "suicide_risk", referralType: "113" },
  { keyword: "dood", type: "suicide_risk", referralType: "113" },
  { keyword: "snijden", type: "self_harm", referralType: "ggz" },
  { keyword: "zelfverwonding", type: "self_harm", referralType: "ggz" },
  
  // Violence signals
  { keyword: "geweld", type: "violence", referralType: "112" },
  { keyword: "agressie", type: "violence", referralType: "112" },
];

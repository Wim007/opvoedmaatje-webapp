import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

// Core user table
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Family composition and focus child
export const familyProfiles = mysqlTable("familyProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  familyComposition: varchar("familyComposition", { length: 64 }).notNull(), // "single", "couple", "extended"
  focusChildName: varchar("focusChildName", { length: 255 }).notNull(),
  focusChildAge: int("focusChildAge").notNull(),
  focusChildGender: varchar("focusChildGender", { length: 32 }).notNull(), // "male", "female", "other"
  postcode: varchar("postcode", { length: 10 }), // Optional, privacy-first
  selectedThemes: json("selectedThemes").notNull(), // Array of theme IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Conversations per theme
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  themeId: varchar("themeId", { length: 64 }).notNull(), // e.g., "sleep", "behavior", "development"
  messages: json("messages").notNull(), // Array of {role, content, timestamp}
  outcome: mysqlEnum("outcome", ["resolved", "in_progress", "referred"]).default("in_progress"),
  safetyRisk: varchar("safetyRisk", { length: 255 }), // e.g., "abuse", "neglect", "suicide_risk"
  referralMade: timestamp("referralMade"), // When referral was made
  referralType: varchar("referralType", { length: 64 }), // "113", "veilig_thuis", "ggz", "112"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Analytics events (fire-and-forget)
export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Anonymous if null
  eventType: varchar("eventType", { length: 64 }).notNull(), // "conversation", "resolved", "referred", "safety_risk"
  themeId: varchar("themeId", { length: 64 }),
  postcode: varchar("postcode", { length: 10 }), // Regional data (anonymous)
  outcome: varchar("outcome", { length: 64 }),
  metadata: json("metadata"), // Additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type FamilyProfile = typeof familyProfiles.$inferSelect;
export type InsertFamilyProfile = typeof familyProfiles.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

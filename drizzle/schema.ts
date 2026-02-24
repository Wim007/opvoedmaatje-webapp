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
  familyComposition: varchar("familyComposition", { length: 64 }).notNull(),
  focusChildName: varchar("focusChildName", { length: 255 }).notNull(),
  focusChildAge: int("focusChildAge").notNull(),
  focusChildGender: varchar("focusChildGender", { length: 32 }).notNull(),
  postcode: varchar("postcode", { length: 10 }),
  selectedThemes: json("selectedThemes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Conversations per theme
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  themeId: varchar("themeId", { length: 64 }).notNull(),
  messages: json("messages").notNull(),
  summary: text("summary"),
  outcome: mysqlEnum("outcome", ["resolved", "in_progress", "referred"]).default("in_progress"),
  safetyRisk: varchar("safetyRisk", { length: 255 }),
  referralMade: timestamp("referralMade"),
  referralType: varchar("referralType", { length: 64 }),
  isArchived: int("isArchived").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Actions (concrete stappen voor ouders)
export const actions = mysqlTable("actions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  themeId: varchar("themeId", { length: 64 }).notNull(),
  conversationId: int("conversationId"),
  actionText: varchar("actionText", { length: 1000 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  followUpScheduled: timestamp("followUpScheduled"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Analytics events
export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  themeId: varchar("themeId", { length: 64 }),
  postcode: varchar("postcode", { length: 10 }),
  outcome: varchar("outcome", { length: 64 }),
  safetyRisk: varchar("safetyRisk", { length: 255 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type FamilyProfile = typeof familyProfiles.$inferSelect;
export type InsertFamilyProfile = typeof familyProfiles.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

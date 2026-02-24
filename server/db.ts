import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertFamilyProfile, familyProfiles,
  InsertConversation, conversations,
  InsertAnalyticsEvent, analyticsEvents,
  Conversation,
  FamilyProfile,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach(field => {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
        updateSet[field] = user[field] ?? null;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Family profile operations
export async function upsertFamilyProfile(userId: number, profile: Omit<InsertFamilyProfile, 'userId'>): Promise<FamilyProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(familyProfiles).where(eq(familyProfiles.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(familyProfiles).set(profile).where(eq(familyProfiles.userId, userId));
    const updated = await db.select().from(familyProfiles).where(eq(familyProfiles.userId, userId)).limit(1);
    return updated[0]!;
  } else {
    await db.insert(familyProfiles).values({ ...profile, userId });
    const created = await db.select().from(familyProfiles).where(eq(familyProfiles.userId, userId)).limit(1);
    return created[0]!;
  }
}

export async function getFamilyProfile(userId: number): Promise<FamilyProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(familyProfiles).where(eq(familyProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Conversation operations
export async function createConversation(userId: number, themeId: string): Promise<Conversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(conversations).values({
    userId,
    themeId,
    messages: [],
    outcome: "in_progress",
  });

  const result = await db.select().from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.themeId, themeId)))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  return result[0]!;
}

export async function getConversation(userId: number, themeId: string): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.themeId, themeId), eq(conversations.isArchived, 0)))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getConversationById(userId: number, conversationId: number): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(20);
}

export async function updateConversation(conversationId: number, updates: Partial<Omit<Conversation, 'id'>>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversations).set(updates).where(eq(conversations.id, conversationId));
}

export async function updateConversationMessages(conversationId: number, messages: any[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversations).set({ messages }).where(eq(conversations.id, conversationId));
}

export async function getConversationHistory(userId: number, themeId: string): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.themeId, themeId)))
    .orderBy(desc(conversations.createdAt));
}

// Analytics
export async function logAnalyticsEvent(event: InsertAnalyticsEvent): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Analytics] Database not available, event not logged");
    return;
  }

  try {
    await db.insert(analyticsEvents).values(event);
  } catch (error) {
    console.error("[Analytics] Failed to log event:", error);
    // Fire-and-forget: don't throw, just log
  }
}

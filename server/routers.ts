import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { detectOutcome, getReferralInfo } from "../shared/utils";
import { invokeLLM } from "./_core/llm";
import { THEMES } from "../shared/types";
import { getDb } from "./db";
import { actions } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Family profile management
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getFamilyProfile(ctx.user.id);
    }),
    upsert: protectedProcedure
      .input(z.object({
        familyComposition: z.enum(["single", "couple", "extended"]),
        focusChildName: z.string(),
        focusChildAge: z.number(),
        focusChildGender: z.enum(["male", "female", "other"]),
        postcode: z.string().optional(),
        selectedThemes: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertFamilyProfile(ctx.user.id, {
          familyComposition: input.familyComposition,
          focusChildName: input.focusChildName,
          focusChildAge: input.focusChildAge,
          focusChildGender: input.focusChildGender,
          postcode: input.postcode,
          selectedThemes: JSON.stringify(input.selectedThemes),
        });
      }),
  }),

  // Themes
  themes: router({
    list: publicProcedure.query(() => {
      return Object.values(THEMES);
    }),
  }),

  // Chat and conversations
  chat: router({
    getConversation: protectedProcedure
      .input(z.object({ themeId: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getConversation(ctx.user.id, input.themeId);
      }),

    getAllConversations: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAllConversations(ctx.user.id);
      }),

    getConversationById: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getConversationById(ctx.user.id, input.conversationId);
      }),

    saveMessage: protectedProcedure
      .input(z.object({
        themeId: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        let conversation = await db.getConversation(ctx.user.id, input.themeId);
        if (!conversation) {
          conversation = await db.createConversation(ctx.user.id, input.themeId);
        }
        const messages = (conversation.messages as any[]) || [];
        messages.push({
          role: input.role,
          content: input.content,
          timestamp: new Date().toISOString(),
        });
        await db.updateConversationMessages(conversation.id, messages);
        return { success: true, conversationId: conversation.id };
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        themeId: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        let conversation = await db.getConversation(ctx.user.id, input.themeId);
        if (!conversation) {
          conversation = await db.createConversation(ctx.user.id, input.themeId);
        }
        const messages = (conversation.messages as any[]) || [];
        messages.push({ role: "user", content: input.message, timestamp: Date.now() });

        const theme = THEMES[input.themeId as keyof typeof THEMES];
        const themeName = theme?.naam || input.themeId;
        const systemPrompt = `Je bent Opvoedmaatje, een empathische AI-coach voor ouders en verzorgers. Je helpt ouders met het thema: ${themeName}. Je biedt lichte opvoedondersteuning, uitleg en praktische handvatten. Je bent GEEN therapeut, arts of psycholoog. Communiceer empathisch, warm, rustig, direct en to-the-point. Per bericht kies je EXACT een van de volgende modi: 1) alleen vragen stellen (max 2-3 zinnen, 1-2 gerichte vragen) OF 2) alleen advies geven (max 3-4 zinnen, praktisch en concreet). Nooit beide tegelijk.`;

        const aiMessages = messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
        const response = await invokeLLM({ messages: [{ role: "system", content: systemPrompt }, ...aiMessages] });
        const aiContent = response.choices[0]?.message?.content || "Ik kan je op dit moment niet helpen. Probeer het later opnieuw.";

        messages.push({ role: "assistant", content: aiContent, timestamp: Date.now() });

        const { outcome, safetyRisk, referralType } = detectOutcome(messages);
        await db.updateConversation(conversation.id, {
          messages: JSON.stringify(messages),
          outcome,
          safetyRisk,
          referralMade: safetyRisk ? new Date() : undefined,
          referralType,
        });

        return {
          conversationId: conversation.id,
          aiResponse: aiContent,
          outcome,
          safetyRisk,
          referralInfo: safetyRisk ? getReferralInfo(referralType || "113") : undefined,
        };
      }),
  }),

  // Actions (concrete stappen voor ouders)
  action: router({
    saveAction: protectedProcedure
      .input(z.object({
        themeId: z.string(),
        actionText: z.string(),
        conversationId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database niet beschikbaar");
        const inserted = await dbConn
          .insert(actions)
          .values({
            userId: ctx.user.id,
            themeId: input.themeId,
            actionText: input.actionText,
            conversationId: input.conversationId,
            status: "pending",
          })
          .execute();
        return { success: true };
      }),

    getActions: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "completed", "cancelled"]).optional() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database niet beschikbaar");
        const conditions = [eq(actions.userId, ctx.user.id)];
        if (input.status) conditions.push(eq(actions.status, input.status));
        return await dbConn.select().from(actions).where(and(...conditions)).orderBy(desc(actions.createdAt));
      }),

    updateActionStatus: protectedProcedure
      .input(z.object({
        actionId: z.number(),
        status: z.enum(["pending", "completed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database niet beschikbaar");
        const updateData: any = { status: input.status, updatedAt: new Date() };
        if (input.status === "completed") updateData.completedAt = new Date();
        await dbConn.update(actions).set(updateData).where(and(eq(actions.id, input.actionId), eq(actions.userId, ctx.user.id)));
        return { success: true };
      }),

    getActionStats: protectedProcedure
      .query(async ({ ctx }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database niet beschikbaar");
        const allActions = await dbConn.select().from(actions).where(eq(actions.userId, ctx.user.id));
        const pending = allActions.filter(a => a.status === "pending").length;
        const completed = allActions.filter(a => a.status === "completed").length;
        const cancelled = allActions.filter(a => a.status === "cancelled").length;
        const total = allActions.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, pending, completed, cancelled, completionRate };
      }),
  }),

  // Analytics
  analytics: router({
    logEvent: protectedProcedure
      .input(z.object({
        eventType: z.string(),
        themeId: z.string().optional(),
        outcome: z.string().optional(),
        safetyRisk: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getFamilyProfile(ctx.user.id);
        await db.logAnalyticsEvent({
          userId: ctx.user.id,
          eventType: input.eventType,
          themeId: input.themeId,
          outcome: input.outcome,
          safetyRisk: input.safetyRisk,
          postcode: profile?.postcode,
          metadata: JSON.stringify({}),
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

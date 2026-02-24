import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { detectOutcome, getReferralInfo, createAnalyticsEvent } from "../shared/utils";
import { invokeLLM } from "./_core/llm";
import { THEMES } from "../shared/types";

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

    getHistory: protectedProcedure
      .input(z.object({ themeId: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getConversationHistory(ctx.user.id, input.themeId);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        themeId: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get or create conversation
        let conversation = await db.getConversation(ctx.user.id, input.themeId);
        if (!conversation) {
          conversation = await db.createConversation(ctx.user.id, input.themeId);
        }

        // Add user message
        const messages = JSON.parse(conversation.messages as any) || [];
        messages.push({
          role: "user",
          content: input.message,
          timestamp: Date.now(),
        });

        // Get AI response using OpenAI Responses API
        const systemPrompt = `Je bent Opvoedmaatje, een empathische AI-coach voor ouders en verzorgers.
Je biedt lichte opvoedondersteuning, uitleg en praktische handvatten.
Je bent GEEN therapeut, arts of psycholoog.

Conversatieregels (STRIKT):
Per bericht kies je EXACT ÉÉN modus:
1) OF alleen vragen stellen (max 2-3 zinnen, 1-2 gerichte vragen)
2) OF alleen advies geven (max 3-4 zinnen, praktisch en concreet)
Nooit beide tegelijk.

Communicatie: empathisch, warm, rustig, direct en to-the-point.`;

        const aiMessages = messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...aiMessages,
          ],
        });

        const aiContent = response.choices[0]?.message?.content || "Ik kan je op dit moment niet helpen. Probeer het later opnieuw.";

        // Add AI response
        messages.push({
          role: "assistant",
          content: aiContent,
          timestamp: Date.now(),
        });

        // Detect outcome and safety signals
        const { outcome, safetyRisk, referralType } = detectOutcome(messages);

        // Update conversation
        await db.updateConversation(conversation.id, {
          messages: JSON.stringify(messages),
          outcome,
          safetyRisk,
          referralMade: safetyRisk ? new Date() : undefined,
          referralType,
        });

        // Log analytics (fire-and-forget)
        await db.logAnalyticsEvent({
          userId: ctx.user.id,
          eventType: "conversation",
          themeId: input.themeId,
          outcome,
          safetyRisk,
          metadata: JSON.stringify({ messageCount: messages.length }),
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
        // Get postcode for regional analytics
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

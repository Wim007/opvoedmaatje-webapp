import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { THEMES } from "@shared/types";
import { useLocation } from "wouter";
import { MessageSquare, Clock, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

export default function History() {
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: conversations, isLoading } = trpc.chat.getAllConversations.useQuery();

  const handleContinueConversation = (conversationId: number, themeId: string) => {
    setLocation(`/chat/${conversationId}`);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Vandaag";
    if (diffDays === 1) return "Gisteren";
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  const themesList = Object.values(THEMES);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen pb-16">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Laden...</div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col min-h-screen pb-16">
        <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Geschiedenis</h1>
          <p className="text-muted-foreground mb-8">Je laatste gesprekken</p>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="text-lg font-semibold mb-2">Nog geen gesprekken</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Start een gesprek met Opvoedmaatje. Je laatste gesprekken worden hier bewaard.
            </p>
            <button
              onClick={() => setLocation("/chat")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all shadow-lg"
            >
              Begin een gesprek
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Geschiedenis</h1>
          <p className="text-sm text-muted-foreground">Je laatste gesprekken</p>
        </div>

        {/* Conversations list */}
        <div className="space-y-3">
          {conversations.map((convo) => {
            const theme = themesList.find(t => t.id === convo.themeId);
            if (!theme) return null;
            const isExpanded = expandedId === convo.id;
            const msgs = (convo.messages as any[]) || [];
            const userMsgCount = msgs.filter((m: any) => m.role === "user").length;
            const previewText = msgs.length > 0 ? msgs[msgs.length - 1]?.content?.slice(0, 80) : "";

            return (
              <div
                key={convo.id}
                className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-primary/10">
                      {theme.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{theme.naam}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(convo.updatedAt)}</span>
                      </div>
                      {previewText && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          "{previewText}{previewText.length >= 80 ? "..." : ""}"
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{userMsgCount} berichten van jou</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleContinueConversation(convo.id, convo.themeId)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Verder praten
                    </button>
                    {msgs && msgs.length > 0 && (
                      <button
                        onClick={() => toggleExpand(convo.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? "Verberg" : "Teruglezen"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded messages */}
                {isExpanded && msgs && msgs.length > 0 && (
                  <div className="border-t border-border p-4 space-y-2">
                    {msgs.slice(-10).map((msg: any, idx: number) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground border border-border rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}

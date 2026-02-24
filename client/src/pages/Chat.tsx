import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { THEMES } from "@shared/types";
import { useRoute, useLocation } from "wouter";
import { Send } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

interface ChatMessage {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState("gedrag");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Check if opening a specific conversation from history (/chat/:conversationId)
  const [matchById, paramsById] = useRoute("/chat/:conversationId");
  const urlConversationId = matchById && paramsById?.conversationId ? parseInt(paramsById.conversationId, 10) : null;

  // Fetch conversation by ID (from history)
  const { data: conversationById, isLoading: loadingById } = trpc.chat.getConversationById.useQuery(
    { conversationId: urlConversationId! },
    { enabled: !!urlConversationId, refetchOnMount: true, retry: 1, staleTime: 0 }
  );

  // Fetch current theme conversation
  const { data: conversationByTheme, refetch: refetchConversation, isLoading: conversationLoading } = trpc.chat.getConversation.useQuery(
    { themeId: currentThemeId },
    { enabled: !urlConversationId, refetchOnMount: true, retry: 1, staleTime: 0 }
  );

  const conversation = urlConversationId ? conversationById : conversationByTheme;
  const isConversationLoading = urlConversationId ? loadingById : conversationLoading;

  // Track initialized conversation
  const [initializedConversationId, setInitializedConversationId] = useState<number | null>(null);

  // Load messages from conversation
  useEffect(() => {
    if (!conversation || conversation.id === initializedConversationId) return;

    if (conversation.messages && Array.isArray(conversation.messages) && (conversation.messages as any[]).length > 0) {
      const loadedMessages: ChatMessage[] = (conversation.messages as any[]).map((msg: any, index: number) => ({
        id: `${conversation.id}-${index}`,
        content: msg.content,
        isAI: msg.role === "assistant",
        timestamp: msg.timestamp || new Date().toISOString(),
      }));
      setMessages(loadedMessages);
    } else {
      const theme = Object.values(THEMES).find(t => t.id === (urlConversationId ? conversation.themeId : currentThemeId));
      const themeName = theme?.naam || "opvoeding";
      const welcomeMsg: ChatMessage = {
        id: Date.now().toString(),
        content: `Hoi! Ik ben Opvoedmaatje 👋 Ik ben hier om je te helpen met vragen over ${themeName}. Waar kan ik je vandaag mee helpen?`,
        isAI: true,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMsg]);
    }
    setInitializedConversationId(conversation.id);
    if (urlConversationId && conversationById) {
      setCurrentThemeId(conversationById.themeId);
    }
  }, [conversation, initializedConversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = trpc.chat.sendMessage.useMutation();
  const saveActionMutation = trpc.action.saveAction.useMutation();

  const detectAction = (text: string): string | null => {
    const actionPhrases = [
      "zorg ervoor dat", "probeer vandaag", "doe dit", "stap voor stap",
      "ga aan de slag", "begin met", "afspraak:", "actie:", "probeer eens",
      "concrete stap", "oefening:", "tip:"
    ];
    const lowerText = text.toLowerCase();
    for (const phrase of actionPhrases) {
      if (lowerText.includes(phrase)) {
        // Extract a meaningful action from the text
        const sentences = text.split(".").filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          return sentences[0].trim().slice(0, 200);
        }
      }
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!conversation) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      isAI: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const messageText = inputText.trim();
    setInputText("");
    setIsTyping(true);

    try {
      const response = await sendMessage.mutateAsync({
        themeId: currentThemeId,
        message: messageText,
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.aiResponse,
        isAI: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Detect and save action if found
      const detectedAction = detectAction(response.aiResponse);
      if (detectedAction && conversation) {
        await saveActionMutation.mutateAsync({
          themeId: currentThemeId,
          actionText: detectedAction,
          conversationId: conversation.id,
        });
      }

      // Safety signal handling
      if (response.safetyRisk) {
        const safetyMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          content: `⚠️ **Belangrijk**: Er lijkt iets serieus aan de hand. Neem contact op met de juiste instantie voor directe hulp.`,
          isAI: true,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, safetyMsg]);
      }
    } catch (error) {
      console.error("Bericht verzenden mislukt:", error);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };

  const themesList = Object.values(THEMES);

  return (
    <div className="flex flex-col h-screen">
      {/* Theme selector header */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="max-w-xl mx-auto">
          <h1 className="text-lg font-bold text-foreground mb-2">Opvoedmaatje 🌱</h1>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {themesList.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  if (!urlConversationId) {
                    setCurrentThemeId(theme.id);
                    setMessages([]);
                    setInitializedConversationId(null);
                    refetchConversation();
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  currentThemeId === theme.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {theme.emoji} {theme.naam}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-xl mx-auto space-y-3">
          {isConversationLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground text-sm">Gesprek laden...</div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isAI ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.isAI
                      ? "bg-muted text-foreground rounded-bl-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                <span className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="max-w-xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Typ je bericht..."
            className="flex-1 px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}

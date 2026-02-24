import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { THEMES } from "../../../shared/types";
import { AlertCircle, Send, History } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Streamdown } from "streamdown";

export default function Chat() {
  const [selectedTheme, setSelectedTheme] = useState<string>("sleep");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation();
  const getConversation = trpc.chat.getConversation.useQuery({ themeId: selectedTheme });

  // Load conversation when theme changes
  useEffect(() => {
    if (getConversation.data?.messages) {
      setMessages(JSON.parse(getConversation.data.messages as any) || []);
    }
  }, [getConversation.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await sendMessage.mutateAsync({
        themeId: selectedTheme,
        message: userMessage,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response.aiResponse }]);

      if (response.safetyRisk) {
        setSafetyAlert(response.referralInfo);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, er is een fout opgetreden. Probeer het later opnieuw." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTheme = THEMES[selectedTheme as any];

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Sidebar with themes */}
      <div className="w-64 bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">Thema's</h2>
        </div>
        <div className="p-2 space-y-2">
          {Object.values(THEMES).map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                setSelectedTheme(theme.id);
                setSafetyAlert(null);
              }}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedTheme === theme.id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              <span className="text-lg mr-2">{theme.emoji}</span>
              <span className="font-medium">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">
            {currentTheme?.emoji} {currentTheme?.name}
          </h1>
          <p className="text-gray-600 text-sm">{currentTheme?.description}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">Hoe kan ik je helpen?</p>
                <p className="text-gray-400 text-sm">Stel je vraag of deel je zorgen.</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-md p-4 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <Streamdown>{msg.content}</Streamdown>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-gray-100 p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Safety Alert */}
        {safetyAlert && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{safetyAlert.name}</strong><br />
              {safetyAlert.description}<br />
              <strong>Bel: {safetyAlert.phone}</strong>
              {safetyAlert.url && (
                <> | <a href={safetyAlert.url} target="_blank" rel="noopener noreferrer" className="underline">Meer info</a></>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Typ je bericht..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

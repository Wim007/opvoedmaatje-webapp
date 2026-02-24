import { useLocation } from "wouter";

const tabs = [
  { id: "chat", label: "Chat", icon: "💬", path: "/chat" },
  { id: "geschiedenis", label: "Geschiedenis", icon: "📜", path: "/history" },
  { id: "acties", label: "Acties", icon: "💪", path: "/actions" },
  { id: "profiel", label: "Profiel", icon: "👤", path: "/profile" },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="border-t border-border bg-background">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path === "/chat" && location.startsWith("/chat"));
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLocation(tab.path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-foreground opacity-100"
                  : "text-muted-foreground opacity-80 hover:opacity-100"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { THEMES } from "@shared/types";
import { CheckCircle2, Circle, XCircle, TrendingUp } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

type ActionStatus = "all" | "pending" | "completed" | "cancelled";

export default function Actions() {
  const [filter, setFilter] = useState<ActionStatus>("all");

  const { data: actions = [], refetch, isLoading: actionsLoading } = trpc.action.getActions.useQuery(
    { status: filter === "all" ? undefined : filter }
  );

  const { data: stats, isLoading: statsLoading } = trpc.action.getActionStats.useQuery();

  const updateStatus = trpc.action.updateActionStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error("Er ging iets mis:", error.message);
    },
  });

  const handleMarkCompleted = async (actionId: number) => {
    await updateStatus.mutateAsync({ actionId, status: "completed" });
  };

  const handleMarkCancelled = async (actionId: number) => {
    await updateStatus.mutateAsync({ actionId, status: "cancelled" });
  };

  const themesList = Object.values(THEMES);

  const getThemeInfo = (themeId: string) => {
    return themesList.find(t => t.id === themeId) || themesList[0];
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

  const isLoading = actionsLoading || statsLoading;

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

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">💪 Mijn Acties</h1>
          <p className="text-sm text-muted-foreground">Jouw concrete stappen naar vooruitgang</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Actief</div>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Gelukt</div>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <div className="text-2xl font-bold text-primary">{stats.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: "all", label: "Alles" },
            { id: "pending", label: "Actief" },
            { id: "completed", label: "Gelukt" },
            { id: "cancelled", label: "Gestopt" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as ActionStatus)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions list */}
        <div className="space-y-3">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-2">Nog geen acties</h3>
              <p className="text-muted-foreground text-sm">
                Praat met Opvoedmaatje en maak concrete afspraken. Ik help je om ze te volgen!
              </p>
            </div>
          ) : (
            actions.map((action) => {
              const theme = getThemeInfo(action.themeId);
              const isPending = action.status === "pending";
              const isCompleted = action.status === "completed";
              const isCancelled = action.status === "cancelled";

              return (
                <div
                  key={action.id}
                  className="bg-card rounded-2xl shadow-sm p-4 border border-border border-l-4"
                  style={{ borderLeftColor: isPending ? "#6366f1" : isCompleted ? "#22c55e" : "#94a3b8" }}
                >
                  {/* Theme badge */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <span>{theme?.emoji}</span>
                    <span>{theme?.naam}</span>
                    <span>•</span>
                    <span>{formatDate(action.createdAt)}</span>
                  </div>

                  {/* Action text */}
                  <p className="font-medium text-foreground mb-3">{action.actionText}</p>

                  {/* Status & buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs">
                      {isPending && (
                        <>
                          <Circle className="w-4 h-4 text-primary" />
                          <span className="text-primary font-medium">Actief</span>
                        </>
                      )}
                      {isCompleted && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Gelukt!</span>
                        </>
                      )}
                      {isCancelled && (
                        <>
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gestopt</span>
                        </>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                          onClick={() => handleMarkCancelled(action.id)}
                          disabled={updateStatus.isPending}
                        >
                          Stop
                        </button>
                        <button
                          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
                          onClick={() => handleMarkCompleted(action.id)}
                          disabled={updateStatus.isPending}
                        >
                          ✓ Gelukt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
      <BottomNavigation />
    </div>
  );
}

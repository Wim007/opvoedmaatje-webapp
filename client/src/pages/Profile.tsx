import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { THEMES } from "../../../shared/types";
import { LogOut, Edit2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const profileQuery = trpc.profile.get.useQuery();
  const profile = profileQuery.data;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleEdit = () => {
    navigate("/onboarding");
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-gray-600">Profiel laden...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedThemes = JSON.parse(profile.selectedThemes as any) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Mijn Profiel</h1>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Uitloggen
          </Button>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Gebruiker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-gray-600 text-sm">Naam</p>
              <p className="font-semibold">{user?.name || "Onbekend"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Email</p>
              <p className="font-semibold">{user?.email || "Onbekend"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Family Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gezinsgegevens</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleEdit} className="gap-2">
              <Edit2 className="w-4 h-4" />
              Bewerk
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Gezinssamenstelling</p>
                <p className="font-semibold capitalize">
                  {profile.familyComposition === "single" && "Eenouder"}
                  {profile.familyComposition === "couple" && "Twee ouders"}
                  {profile.familyComposition === "extended" && "Uitgebreid gezin"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Regio</p>
                <p className="font-semibold">{profile.postcode || "Niet ingevuld"}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-gray-600 text-sm mb-2">Focus kind</p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{profile.focusChildName}</p>
                <p className="text-gray-600">
                  {profile.focusChildAge} jaar • 
                  {profile.focusChildGender === "male" && " Jongen"}
                  {profile.focusChildGender === "female" && " Meisje"}
                  {profile.focusChildGender === "other" && " Anders"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Themes */}
        <Card>
          <CardHeader>
            <CardTitle>Gekozen Thema's</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedThemes.map((themeId: string) => {
                const theme = THEMES[themeId as any];
                return (
                  <div key={themeId} className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-2xl mb-1">{theme?.emoji}</p>
                    <p className="font-semibold text-sm">{theme?.name}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/chat")} className="flex-1">
            Terug naar Chat
          </Button>
          <Button onClick={handleEdit} className="flex-1 gap-2">
            <Edit2 className="w-4 h-4" />
            Profiel Bewerken
          </Button>
        </div>
      </div>
    </div>
  );
}

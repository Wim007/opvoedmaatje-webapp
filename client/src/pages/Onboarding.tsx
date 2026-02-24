import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { THEMES } from "../../../shared/types";
import { useLocation } from "wouter";

type Step = "family" | "child" | "themes" | "postcode" | "complete";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("family");
  const [familyComposition, setFamilyComposition] = useState<"single" | "couple" | "extended">("couple");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState(0);
  const [childGender, setChildGender] = useState<"male" | "female" | "other">("male");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [postcode, setPostcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const upsertProfile = trpc.profile.upsert.useMutation();

  const handleNext = () => {
    if (step === "family") setStep("child");
    else if (step === "child") setStep("themes");
    else if (step === "themes") setStep("postcode");
    else if (step === "postcode") handleComplete();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await upsertProfile.mutateAsync({
        familyComposition,
        focusChildName: childName,
        focusChildAge: childAge,
        focusChildGender: childGender as any,
        postcode: postcode || undefined,
        selectedThemes,
      });
      navigate("/chat");
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = (themeId: string) => {
    setSelectedThemes(prev =>
      prev.includes(themeId) ? prev.filter(t => t !== themeId) : [...prev, themeId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl">Welkom bij Opvoedmaatje</CardTitle>
          <CardDescription className="text-blue-100">
            {step === "family" && "Stap 1: Gezinssamenstelling"}
            {step === "child" && "Stap 2: Je kind"}
            {step === "themes" && "Stap 3: Waar wil je ondersteuning bij?"}
            {step === "postcode" && "Stap 4: Regio (optioneel)"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Family Composition */}
          {step === "family" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Hoe is je gezin samengesteld?</Label>
              <RadioGroup value={familyComposition} onValueChange={(v: any) => setFamilyComposition(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">Eenouder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="couple" id="couple" />
                  <Label htmlFor="couple" className="font-normal cursor-pointer">Twee ouders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="extended" id="extended" />
                  <Label htmlFor="extended" className="font-normal cursor-pointer">Uitgebreid gezin (bv. opa/oma)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Child Info */}
          {step === "child" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Naam van je kind</Label>
                <Input
                  id="name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="bijv. Emma"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="age">Leeftijd</Label>
                <Input
                  id="age"
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(parseInt(e.target.value))}
                  min="0"
                  max="21"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-base font-semibold">Geslacht</Label>
                <RadioGroup value={childGender} onValueChange={(v: any) => setChildGender(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal cursor-pointer">Jongen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal cursor-pointer">Meisje</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="font-normal cursor-pointer">Anders</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Themes Selection */}
          {step === "themes" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Waar wil je ondersteuning bij? (selecteer minstens 1)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(THEMES).map(theme => (
                  <div key={theme.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={theme.id}
                      checked={selectedThemes.includes(theme.id)}
                      onCheckedChange={() => toggleTheme(theme.id)}
                    />
                    <Label htmlFor={theme.id} className="font-normal cursor-pointer">
                      <span className="mr-2">{theme.emoji}</span>
                      {theme.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Postcode */}
          {step === "postcode" && (
            <div className="space-y-4">
              <Label htmlFor="postcode">Postcode (optioneel, voor regionale inzichten)</Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="bijv. 1234AB"
                className="mt-2"
              />
              <p className="text-sm text-gray-600">
                We gebruiken alleen de eerste 4 cijfers voor anonieme regionale statistieken.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step !== "family" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === "child") setStep("family");
                  else if (step === "themes") setStep("child");
                  else if (step === "postcode") setStep("themes");
                }}
              >
                Terug
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={
                (step === "child" && !childName) ||
                (step === "themes" && selectedThemes.length === 0) ||
                isLoading
              }
              className="flex-1"
            >
              {step === "postcode" ? "Klaar" : "Volgende"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

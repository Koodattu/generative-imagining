"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePassword } from "@/contexts/PasswordContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function CreateImagePage() {
  const { user, loading } = useUser();
  const { t, locale } = useLocale();
  const { password, setShowPasswordDialog } = usePassword();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageDataType | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateImage = async () => {
    if (!user || !prompt.trim()) return;

    // Check if password is available
    if (!password) {
      setShowPasswordDialog(true);
      setError(t("password.required"));
      return;
    }

    setGenerating(true);
    setSuggestions([]); // Reset suggestions when generating
    setError(null); // Reset error state
    try {
      const result = await imagesApi.generateImage(prompt, user.guid, password);
      setGeneratedImage(result);
      // Don't set generating to false yet - wait for image to load
      // The onLoad handler will set generating to false
    } catch (error) {
      console.error("Error generating image:", error);
      // Check if it's a rate limit error (429 status code)
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 429) {
        setError(t("error.rateLimit"));
      } else if (err?.response?.status === 403) {
        // Password invalid or expired
        setError(t("error.invalidPassword"));
        setShowPasswordDialog(true);
      } else {
        setError(t("error.generate"));
      }
      setGenerating(false);
      setGeneratedImage(null);
    }
  };

  const handleGetSuggestions = async () => {
    if (!user) return;

    // Check if password is available
    if (!password) {
      setShowPasswordDialog(true);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const result = await aiApi.suggestPrompts(prompt.trim() || undefined, locale, user.guid, password);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        // Password invalid or expired
        setShowPasswordDialog(true);
      }
      setSuggestions([
        "A majestic dragon soaring through clouds at sunset",
        "A cozy cabin in a magical forest with glowing mushrooms",
        "A futuristic city with floating cars and neon lights",
        "A peaceful garden with cherry blossoms and a small pond",
        "An abstract painting with vibrant colors and flowing shapes",
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    // Trigger height adjustment after setting the prompt
    setTimeout(() => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = "48px";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
      }
    }, 0);
  };

  const handleShareImage = (imageId: string) => {
    const shareUrl = `${window.location.origin}/shared/${imageId}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{t("common.error")}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-200px)] px-4">
      {/* Header */}
      {!generating && !generatedImage && (
        <div className="text-center mb-6 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">{t("create.title")}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t("create.subtitle")}</p>
        </div>
      )}

      {/* Main Content Container */}
      <div className="w-full max-w-2xl space-y-4 md:space-y-6">
        {/* Error Message */}
        {error && !generating && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 md:px-6 py-3 md:py-4 rounded-lg text-center">
            <p className="text-sm md:text-base font-medium whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Show loading state while generating - image loads behind the overlay */}
        {generating && !error && (
          <div className="relative aspect-square max-w-lg md:max-w-2xl mx-auto bg-[#0a0a0a] rounded-lg overflow-hidden shadow-2xl">
            {/* Image loading in background (invisible until loaded) */}
            {generatedImage && (
              <Image
                src={imagesApi.getImageUrl(generatedImage.id)}
                alt={generatedImage.description}
                fill
                className="object-cover"
                unoptimized
                priority
                onLoad={() => {
                  setGenerating(false); // Transition to final view
                }}
              />
            )}

            {/* Loading overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {/* Animated colorful gradient background */}
              <div
                className="absolute inset-0 animate-[gradient-shift_8s_ease-in-out_infinite]"
                style={{
                  background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f7b731, #5f27cd, #ff6348, #1dd1a1, #ee5a6f)",
                  backgroundSize: "400% 400%",
                }}
              />

              {/* Pulsing glow overlay */}
              <div
                className="absolute inset-0 animate-[pulse-glow_3s_ease-in-out_infinite]"
                style={{
                  background: "radial-gradient(circle at center, rgba(255, 107, 107, 0.4), rgba(78, 205, 196, 0.4), rgba(69, 183, 209, 0.4))",
                }}
              />

              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-[-100%] -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent from-40% via-white/30 via-50% to-transparent to-60% rotate-12 origin-center"></div>
              </div>

              {/* Center content */}
              <div className="text-center relative z-10">
                <div className="animate-[colorful-spin_3s_ease-in-out_infinite] mx-auto mb-4" style={{ transformOrigin: "center" }}>
                  <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </div>
                <p className="text-white font-medium text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{t("create.generating")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Show generated image result */}
        {generatedImage && !generating && !error && (
          <div className="space-y-4 md:space-y-6">
            <div className="relative aspect-square max-w-lg md:max-w-2xl mx-auto rounded-lg overflow-hidden shadow-2xl">
              <Image src={imagesApi.getImageUrl(generatedImage.id)} alt={generatedImage.description} fill className="object-cover" unoptimized />
            </div>

            <div className="text-center space-y-3 md:space-y-4">
              <p className="text-gray-100 text-base md:text-2xl italic px-4 line-clamp-3">&ldquo;{generatedImage.prompt}&rdquo;</p>

              <div className="flex gap-2 md:gap-3 justify-center">
                <button
                  onClick={() => {
                    setGeneratedImage(null);
                    setPrompt("");
                    setSuggestions([]);
                    setError(null);
                  }}
                  className="bg-orange-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full font-medium hover:bg-orange-700 transition-colors shadow-lg text-sm md:text-base"
                >
                  {t("create.createAnother")}
                </button>
                <button
                  onClick={() => router.push(`/edit?imageId=${generatedImage.id}`)}
                  className="bg-purple-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg text-sm md:text-base"
                >
                  {t("create.editThisImage")}
                </button>
                <button
                  onClick={() => handleShareImage(generatedImage.id)}
                  className="bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg text-sm md:text-base"
                >
                  {copied ? t("gallery.copied") : t("gallery.share")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show input controls only when not generating and no generated image ready */}
        {!generating && !generatedImage && (
          <>
            {/* Combined Input Section */}
            <div>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Adjust height on change as well
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "48px";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
                placeholder={t("create.describeYourImage")}
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-[#2a2a2a] text-gray-100 border border-gray-600 rounded-full focus:outline-none focus:border-blue-500 focus:bg-[#303030] resize-none overflow-hidden placeholder-gray-500 transition-all shadow-lg text-sm md:text-base"
                style={{
                  minHeight: "48px",
                  maxHeight: "120px",
                  height: "auto",
                }}
                rows={1}
                disabled={loadingSuggestions}
              />

              {/* Button Group */}
              <div className="flex gap-2 md:gap-3 mt-3 md:mt-4">
                <button
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions || !prompt.trim()}
                  className="flex-1 bg-blue-600 text-white py-2.5 md:py-3 px-4 md:px-6 rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                >
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white mr-2"></div>
                      {t("create.loading")}
                    </div>
                  ) : (
                    t("create.getIdeas")
                  )}
                </button>
                <button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || loadingSuggestions}
                  className="flex-1 bg-orange-600 text-white py-2.5 md:py-3 px-4 md:px-6 rounded-full font-medium hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                >
                  {t("create.generate")}
                </button>
              </div>
            </div>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="space-y-2 md:space-y-3">
                <p className="text-center text-xs md:text-sm text-gray-400 font-medium">{t("create.tapIdea")}</p>
                <div className="flex flex-col gap-2 md:gap-3 max-h-[200px] md:max-h-none overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="w-full px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all shadow-md hover:shadow-lg text-xs md:text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

export default function CreateImagePage() {
  const { user, loading } = useUser();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageDataType | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleGenerateImage = async () => {
    if (!user || !prompt.trim()) return;

    setGenerating(true);
    setSuggestions([]); // Reset suggestions when generating
    try {
      const result = await imagesApi.generateImage(prompt, user.guid);
      setGeneratedImage(result);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const result = await aiApi.suggestPrompts(prompt.trim() || undefined, locale);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error getting suggestions:", error);
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
        {/* Show loading state while generating */}
        {generating && (
          <div className="relative aspect-square max-w-md md:max-w-lg mx-auto bg-[#0a0a0a] rounded-lg overflow-hidden flex items-center justify-center shadow-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 md:h-16 w-12 md:w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-base md:text-lg">{t("create.generating")}</p>
            </div>
          </div>
        )}

        {/* Show generated image result */}
        {!generating && generatedImage && (
          <div className="space-y-4 md:space-y-6">
            <div className="relative aspect-square max-w-md md:max-w-lg mx-auto rounded-lg overflow-hidden shadow-2xl">
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
              </div>
            </div>
          </div>
        )}

        {/* Show input controls only when not generating and no generated image */}
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

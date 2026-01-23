"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePassword } from "@/contexts/PasswordContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function EditImagePage() {
  const { user, loading } = useUser();
  const { t, locale } = useLocale();
  const { password, setShowPasswordDialog } = usePassword();
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageId = searchParams.get("imageId");

  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!user || !imageId) return;

      try {
        const result = await imagesApi.getUserGallery(user.guid);
        const image = result.images.find((img) => img.id === imageId);
        if (image) {
          setSelectedImage(image);
          // Don't set imageLoaded to false here - we're just loading metadata
          // The Image component will handle its own loading state
        }
      } catch (error) {
        console.error("Error loading image:", error);
      }
    };

    if (user && imageId) {
      loadImage();
    }
  }, [user, imageId]);

  const handleGetSuggestions = async () => {
    if (!selectedImage || !user) return;

    // Check if password is available
    if (!password) {
      setShowPasswordDialog(true);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const result = await aiApi.suggestEdits(selectedImage.id, editPrompt.trim() || undefined, locale, user.guid, password);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        // Password invalid or expired
        setShowPasswordDialog(true);
      }
      setSuggestions(["Add warm lighting", "Make it cooler", "Add more details", "Change the background", "Enhance the colors"]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setEditPrompt(suggestion);
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

  const handleEditImage = async () => {
    if (!user || !selectedImage || !editPrompt.trim()) return;

    // Check if password is available
    if (!password) {
      setShowPasswordDialog(true);
      setError(t("password.required"));
      return;
    }

    setEditing(true);
    setSuggestions([]); // Reset suggestions when editing
    setError(null); // Reset error state
    try {
      const result = await imagesApi.editImage(selectedImage.id, editPrompt, user.guid, password);
      setSelectedImage(result);
      setEditPrompt("");
      // Don't set editing to false yet - wait for image to load
      // The onLoad handler will set editing to false
    } catch (error) {
      console.error("Error editing image:", error);
      // Check if it's a rate limit error (429 status code)
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 429) {
        setError(t("error.rateLimit"));
      } else if (err?.response?.status === 403) {
        // Password invalid or expired
        setError(t("error.invalidPassword"));
        setShowPasswordDialog(true);
      } else {
        setError(t("error.edit"));
      }
      setEditing(false);
    }
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

  // No image selected - show navigation options
  if (!selectedImage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-200px)] px-4">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">{t("edit.title")}</h1>
          <p className="text-gray-400 text-sm md:text-base mb-6 md:mb-8">{t("edit.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4 w-full max-w-md">
          <button
            onClick={() => router.push("/create")}
            className="bg-purple-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg text-base md:text-lg"
          >
            {t("edit.createNewImage")}
          </button>
          <button
            onClick={() => router.push("/gallery")}
            className="bg-green-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-medium hover:bg-green-700 transition-colors shadow-lg text-base md:text-lg"
          >
            {t("edit.selectFromGallery")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-200px)] px-4">
      {/* Main Content Container */}
      <div className="w-full max-w-2xl space-y-3 md:space-y-6">
        {/* Error Message */}
        {error && !editing && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 md:px-6 py-3 md:py-4 rounded-lg text-center">
            <p className="text-sm md:text-base font-medium whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Current Image */}
        <div
          className={`relative mx-auto rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
            suggestions.length > 0
              ? "aspect-square w-full max-w-[min(35vh,90vw)] md:max-w-[min(40vh,32rem)]"
              : "aspect-square w-full max-w-[min(45vh,90vw)] md:max-w-[min(50vh,36rem)]"
          }`}
        >
          <Image
            key={selectedImage.id}
            src={imagesApi.getImageUrl(selectedImage.id)}
            alt={selectedImage.description}
            fill
            className="object-cover"
            unoptimized
            priority
            onLoad={() => {
              if (editing) {
                setEditing(false); // Transition to final view
              }
            }}
          />

          {/* Loading overlay while editing */}
          {editing && !error && (
            <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center z-10">
              {/* Animated colorful gradient background - more transparent */}
              <div
                className="absolute inset-0 animate-[gradient-shift_8s_ease-in-out_infinite] opacity-30"
                style={{
                  background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f7b731, #5f27cd, #ff6348, #1dd1a1, #ee5a6f)",
                  backgroundSize: "400% 400%",
                }}
              />

              {/* Pulsing glow overlay - more transparent */}
              <div
                className="absolute inset-0 animate-[pulse-glow_3s_ease-in-out_infinite] opacity-20"
                style={{
                  background: "radial-gradient(circle at center, rgba(255, 107, 107, 0.4), rgba(78, 205, 196, 0.4), rgba(69, 183, 209, 0.4))",
                }}
              />

              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-[-100%] -translate-x-full animate-[shimmer_3.5s_infinite] bg-gradient-to-r from-transparent from-40% via-white/20 via-50% to-transparent to-60% rotate-12 origin-center"></div>
              </div>

              {/* Center content */}
              <div className="text-center relative z-10">
                <div className="animate-[colorful-spin_3s_ease-in-out_infinite] mx-auto mb-4" style={{ transformOrigin: "center" }}>
                  <Sparkles className="w-16 h-16 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </div>
                <p className="text-white font-medium text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t("edit.editing")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Image prompt description */}
        {!editing && (
          <div className="text-center">
            <p className="text-gray-100 text-sm md:text-lg italic px-4 line-clamp-2">&ldquo;{selectedImage.prompt}&rdquo;</p>
          </div>
        )}

        {/* Input controls */}
        {!editing && (
          <>
            {/* Combined Input Section */}
            <div>
              <textarea
                value={editPrompt}
                onChange={(e) => {
                  setEditPrompt(e.target.value);
                  // Adjust height on change as well
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "48px";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
                placeholder={t("edit.prompt.placeholder")}
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-[#2a2a2a] text-gray-100 border border-gray-600 rounded-full focus:outline-none focus:border-purple-500 focus:bg-[#303030] resize-none overflow-hidden placeholder-gray-500 transition-all shadow-lg text-sm md:text-base"
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
                  disabled={loadingSuggestions || !editPrompt.trim()}
                  className="flex-1 bg-blue-600 text-white py-2.5 md:py-3 px-3 md:px-5 rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
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
                  onClick={handleEditImage}
                  disabled={!editPrompt.trim() || loadingSuggestions}
                  className="flex-[1.2] bg-purple-600 text-white py-2.5 md:py-3 px-4 md:px-6 rounded-full font-medium hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                >
                  {t("edit.editImage")}
                </button>
                <button
                  onClick={() => handleShareImage(selectedImage.id)}
                  className="flex-[0.5] bg-green-600 text-white py-2.5 md:py-3 px-3 md:px-4 rounded-full font-medium hover:bg-green-700 transition-colors text-sm md:text-base"
                >
                  {copied ? "✅" : "🔗"} {copied ? t("gallery.copied") : t("gallery.share")}
                </button>
              </div>
            </div>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="space-y-2 md:space-y-3">
                <p className="text-center text-xs md:text-sm text-gray-400 font-medium">{t("create.tapIdea")}</p>
                <div className="flex flex-col gap-2 md:gap-3 max-h-[25vh] md:max-h-none overflow-y-auto scrollbar-thin">
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

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

export default function EditImagePage() {
  const { user, loading } = useUser();
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageId = searchParams.get("imageId");

  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!user || !imageId) return;

      try {
        const result = await imagesApi.getUserGallery(user.guid);
        const image = result.images.find((img) => img.id === imageId);
        if (image) {
          setSelectedImage(image);
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
    if (!selectedImage) return;

    setLoadingSuggestions(true);
    try {
      const result = await aiApi.suggestEdits(selectedImage.id, editPrompt.trim() || undefined, locale);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      setSuggestions(["Add warm lighting", "Make it cooler", "Add more details", "Change the background", "Enhance the colors"]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setEditPrompt(suggestion);
  };

  const handleEditImage = async () => {
    if (!user || !selectedImage || !editPrompt.trim()) return;

    setEditing(true);
    setSuggestions([]); // Reset suggestions when editing
    try {
      const result = await imagesApi.editImage(selectedImage.id, editPrompt, user.guid);
      setSelectedImage(result);
      setEditPrompt("");
    } catch (error) {
      console.error("Error editing image:", error);
      alert("Failed to edit image. Please try again.");
    } finally {
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-100 mb-2">{t("edit.title")}</h1>
          <p className="text-gray-400 mb-8">{t("edit.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <button
            onClick={() => router.push("/create")}
            className="bg-purple-600 text-white px-8 py-4 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg text-lg"
          >
            {t("edit.createNewImage")}
          </button>
          <button
            onClick={() => router.push("/gallery")}
            className="bg-green-600 text-white px-8 py-4 rounded-full font-medium hover:bg-green-700 transition-colors shadow-lg text-lg"
          >
            {t("edit.selectFromGallery")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
      {/* Main Content Container */}
      <div className="w-full max-w-2xl space-y-6">
        {/* Current Image */}
        <div className="relative aspect-square max-w-lg mx-auto rounded-lg overflow-hidden shadow-2xl">
          <Image src={imagesApi.getImageUrl(selectedImage.id)} alt={selectedImage.description} fill className="object-cover" unoptimized priority />

          {/* Loading overlay while editing */}
          {editing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white text-lg font-medium">{t("edit.editing")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Image prompt description */}
        {!editing && (
          <div className="text-center">
            <p className="text-gray-100 text-lg italic px-4">&ldquo;{selectedImage.prompt}&rdquo;</p>
          </div>
        )}

        {/* Input controls */}
        {!editing && (
          <>
            {/* Combined Input Section */}
            <div>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder={t("edit.prompt.placeholder")}
                className="w-full px-6 py-4 bg-[#2a2a2a] text-gray-100 border border-gray-600 rounded-full focus:outline-none focus:border-purple-500 focus:bg-[#303030] resize-none overflow-hidden placeholder-gray-500 transition-all shadow-lg"
                style={{
                  minHeight: "56px",
                  maxHeight: "200px",
                  height: "auto",
                }}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "56px";
                  target.style.height = Math.min(target.scrollHeight, 200) + "px";
                }}
                disabled={loadingSuggestions}
              />

              {/* Button Group */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {t("create.loading")}
                    </div>
                  ) : (
                    t("create.getIdeas")
                  )}
                </button>
                <button
                  onClick={handleEditImage}
                  disabled={!editPrompt.trim() || loadingSuggestions}
                  className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-full font-medium hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  {t("edit.editImage")}
                </button>
              </div>
            </div>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="space-y-3 mt-8">
                <p className="text-center text-sm text-gray-400 font-medium">{t("create.tapIdea")}</p>
                <div className="flex flex-col gap-3">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all shadow-md hover:shadow-lg text-sm"
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

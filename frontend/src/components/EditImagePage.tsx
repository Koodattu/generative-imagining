"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

export default function EditImagePage() {
  const { user, loading } = useUser();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageId = searchParams.get("imageId");

  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);
  const [userImages, setUserImages] = useState<ImageDataType[]>([]);
  const [editPrompt, setEditPrompt] = useState("");
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState<{
    loadingImages: boolean;
    loadingSuggestions: boolean;
    generating: boolean;
  }>({
    loadingImages: false,
    loadingSuggestions: false,
    generating: false,
  });
  const [editedImage, setEditedImage] = useState<ImageDataType | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      if (!user) return;

      setLoadingState("loadingImages", true);
      try {
        const result = await imagesApi.getUserGallery(user.guid);
        setUserImages(result.images);
      } catch (error) {
        console.error("Error loading images:", error);
        alert("Failed to load images. Please try again.");
      } finally {
        setLoadingState("loadingImages", false);
      }
    };

    if (user) {
      loadImages();
    }
  }, [user]);

  useEffect(() => {
    const loadSuggestions = async (image: ImageDataType) => {
      setLoadingState("loadingSuggestions", true);
      try {
        const result = await aiApi.suggestEdits(image.id);
        setEditSuggestions(result.suggestions);
      } catch (error) {
        console.error("Error loading edit suggestions:", error);
        setEditSuggestions([
          "Add warm lighting effects",
          "Change the color palette to cooler tones",
          "Add background elements",
          "Enhance details and textures",
          "Create a different mood or atmosphere",
        ]);
      } finally {
        setLoadingState("loadingSuggestions", false);
      }
    };

    if (imageId && userImages.length > 0) {
      const image = userImages.find((img) => img.id === imageId);
      if (image) {
        setSelectedImage(image);
        loadSuggestions(image);
      }
    }
  }, [imageId, userImages]);

  const setLoadingState = (key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectImage = (image: ImageDataType) => {
    setSelectedImage(image);
    setEditedImage(null);
    setEditPrompt("");
    // Edit suggestions will be loaded by useEffect when selectedImage changes
  };

  const handleUseSuggestion = (suggestion: string) => {
    setEditPrompt(suggestion);
  };

  const handleEditImage = async () => {
    if (!user || !selectedImage || !editPrompt.trim()) return;

    setLoadingState("generating", true);
    try {
      const result = await imagesApi.editImage(selectedImage.id, editPrompt, user.guid);
      setEditedImage(result);
      // The new image will be visible when user refreshes or navigates to gallery
    } catch (error) {
      console.error("Error editing image:", error);
      alert("Failed to edit image. Please try again.");
    } finally {
      setLoadingState("generating", false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">{t("edit.title")}</h1>
        <p className="text-gray-400">{t("edit.subtitle")}</p>
      </div>

      {/* Image Selection */}
      <div className="bg-[#2a2a2a] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">{t("edit.selectImage")}</h2>

        {loadingStates.loadingImages ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-gray-400">{t("edit.loadingImages")}</span>
          </div>
        ) : userImages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">{t("edit.noImages")}</p>
            <button onClick={() => router.push("/create")} className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
              {t("edit.createFirst")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {userImages.map((image) => (
              <div
                key={image.id}
                onClick={() => handleSelectImage(image)}
                className={`relative aspect-square bg-[#1a1a1a] rounded overflow-hidden cursor-pointer transition-all ${
                  selectedImage?.id === image.id ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-gray-600"
                }`}
              >
                <Image src={imagesApi.getImageUrl(image.id)} alt={image.description} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Interface */}
      {selectedImage && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="bg-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">{t("edit.original")}</h3>
            <div className="relative aspect-square bg-[#1a1a1a] rounded overflow-hidden mb-4">
              <Image src={imagesApi.getImageUrl(selectedImage.id)} alt={selectedImage.description} fill className="object-cover" unoptimized />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">
                <strong className="text-gray-300">{t("edit.instructions")}:</strong> {selectedImage.prompt}
              </p>
            </div>
          </div>

          {/* Edit Controls */}
          <div className="bg-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">{t("edit.instructions")}</h3>

            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={t("edit.prompt.placeholder")}
              className="w-full p-4 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-purple-500 resize-vertical min-h-[120px] placeholder-gray-500 mb-4"
              disabled={loadingStates.generating}
            />

            <button
              onClick={handleEditImage}
              disabled={loadingStates.generating || !editPrompt.trim()}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded font-medium hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {loadingStates.generating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t("edit.editing")}
                </div>
              ) : (
                t("edit.editImage")
              )}
            </button>

            {/* Suggestions */}
            {loadingStates.loadingSuggestions ? (
              <div className="flex items-center mt-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-gray-400 text-sm">{t("edit.loadingSuggestions")}</span>
              </div>
            ) : (
              editSuggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">{t("edit.suggestions")}</p>
                  <div className="space-y-2">
                    {editSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleUseSuggestion(suggestion)}
                        className="w-full text-left p-2 text-sm bg-[#1a1a1a] text-gray-300 rounded hover:bg-[#3a3a3a] hover:text-gray-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Edited Image Result */}
      {editedImage && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">{t("edit.editedImage")}</h3>

          <div className="space-y-4">
            <div className="relative aspect-square max-w-lg mx-auto bg-[#1a1a1a] rounded overflow-hidden">
              <Image src={imagesApi.getImageUrl(editedImage.id)} alt={editedImage.description} fill className="object-cover" unoptimized />
            </div>

            <div className="text-center space-y-2 text-sm">
              <p className="text-gray-400">
                <strong className="text-gray-300">{t("edit.edit")}:</strong> {editPrompt}
              </p>
              <p className="text-gray-400">
                <strong className="text-gray-300">{t("edit.instructions")}:</strong> {editedImage.description}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setEditedImage(null)} className="bg-[#3a3a3a] text-gray-200 px-5 py-2 rounded hover:bg-[#4a4a4a] transition-colors">
                {t("edit.editAgain")}
              </button>
              <button onClick={() => router.push("/gallery")} className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition-colors">
                {t("edit.viewGallery")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

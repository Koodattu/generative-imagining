"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useLocale } from "@/contexts/LocaleContext";
import { imagesApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

export default function GalleryPage() {
  const { user, loading } = useUser();
  const { t } = useLocale();
  const router = useRouter();
  const [images, setImages] = useState<ImageDataType[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);

  useEffect(() => {
    const loadGallery = async () => {
      if (!user) return;

      setLoadingImages(true);
      try {
        const result = await imagesApi.getUserGallery(user.guid);
        setImages(result.images);
      } catch (error) {
        console.error("Error loading gallery:", error);
        alert("Failed to load gallery. Please try again.");
      } finally {
        setLoadingImages(false);
      }
    };

    if (user) {
      loadGallery();
    }
  }, [user]);

  const handleDeleteImage = async (imageId: string) => {
    if (!user || !confirm(t("gallery.deleteConfirm"))) return;

    try {
      await imagesApi.deleteImage(imageId, user.guid);
      setImages(images.filter((img) => img.id !== imageId));
      setSelectedImage(null);
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    }
  };

  const handleEditImage = (imageId: string) => {
    router.push(`/edit?imageId=${imageId}`);
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">{t("gallery.title")}</h1>
        <p className="text-gray-400">{t("gallery.subtitle")}</p>
      </div>

      {/* Gallery Grid */}
      {loadingImages ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">{t("gallery.loadingImages")}</p>
          </div>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">{t("gallery.noImages")}</h3>
          <p className="text-gray-400 mb-6">{t("gallery.noImages.desc")}</p>
          <button onClick={() => router.push("/create")} className="bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors">
            {t("gallery.createFirst")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="bg-[#2a2a2a] rounded overflow-hidden hover:bg-[#3a3a3a] transition-colors">
              <div className="relative aspect-square bg-[#1a1a1a] cursor-pointer" onClick={() => setSelectedImage(image)}>
                <Image src={imagesApi.getImageUrl(image.id)} alt={image.description} fill className="object-cover" unoptimized />
              </div>

              <div className="p-3">
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{image.prompt}</p>

                <div className="flex space-x-2">
                  <button onClick={() => handleEditImage(image.id)} className="flex-1 bg-purple-600 text-white text-sm py-2 rounded hover:bg-purple-700 transition-colors">
                    {t("gallery.edit")}
                  </button>
                  <button onClick={() => handleDeleteImage(image.id)} className="flex-1 bg-red-600 text-white text-sm py-2 rounded hover:bg-red-700 transition-colors">
                    {t("gallery.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
          <div className="bg-[#2a2a2a] rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-100">{t("gallery.imageDetails")}</h3>
                <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-gray-200 text-2xl">
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative aspect-square max-w-lg mx-auto bg-[#1a1a1a] rounded overflow-hidden">
                  <Image src={imagesApi.getImageUrl(selectedImage.id)} alt={selectedImage.description} fill className="object-cover" unoptimized />
                </div>

                <div className="space-y-2 text-gray-400 text-sm">
                  <p>
                    <strong className="text-gray-300">{t("gallery.prompt")}:</strong> {selectedImage.prompt}
                  </p>
                  <p>
                    <strong className="text-gray-300">{t("gallery.description")}:</strong> {selectedImage.description}
                  </p>
                  <p>
                    <strong className="text-gray-300">{t("gallery.created")}:</strong> {new Date(selectedImage.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex space-x-3 justify-center">
                  <button onClick={() => handleEditImage(selectedImage.id)} className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 transition-colors">
                    {t("gallery.edit")}
                  </button>
                  <button onClick={() => handleDeleteImage(selectedImage.id)} className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition-colors">
                    {t("gallery.delete")}
                  </button>
                  <button onClick={() => setSelectedImage(null)} className="bg-[#3a3a3a] text-gray-200 px-5 py-2 rounded hover:bg-[#4a4a4a] transition-colors">
                    {t("gallery.close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

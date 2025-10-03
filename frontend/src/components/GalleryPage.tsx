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
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const loadGallery = async () => {
      if (!user) return;

      setLoadingImages(true);
      try {
        const result = await imagesApi.getUserGallery(user.guid);
        setImages(result.images);
      } catch (error) {
        console.error("Error loading gallery:", error);
        alert(t("gallery.loadError"));
      } finally {
        setLoadingImages(false);
      }
    };

    if (user) {
      loadGallery();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === null) return;

      if (e.key === "ArrowLeft") {
        navigatePrevious();
      } else if (e.key === "ArrowRight") {
        navigateNext();
      } else if (e.key === "Escape") {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, isAnimating]);

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setSlideDirection(null);
  };

  const closeFullscreen = () => {
    setCurrentIndex(null);
    setSlideDirection(null);
  };

  const navigatePrevious = () => {
    if (currentIndex === null || isAnimating) return;
    setIsAnimating(true);
    setSlideDirection("right");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 300);
  };

  const navigateNext = () => {
    if (currentIndex === null || isAnimating) return;
    setIsAnimating(true);
    setSlideDirection("left");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 300);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!user || !confirm(t("gallery.deleteConfirm"))) return;

    try {
      await imagesApi.deleteImage(imageId, user.guid);
      const newImages = images.filter((img) => img.id !== imageId);
      setImages(newImages);

      if (currentIndex !== null) {
        if (newImages.length === 0) {
          closeFullscreen();
        } else if (currentIndex >= newImages.length) {
          setCurrentIndex(newImages.length - 1);
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert(t("gallery.deleteError"));
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

  const currentImage = currentIndex !== null ? images[currentIndex] : null;

  return (
    <>
      <div>
        {/* Header */}
        <div className="text-center py-4 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-2">{t("gallery.title")}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t("gallery.subtitle")}</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 md:gap-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square bg-[#1a1a1a] rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                onClick={() => openFullscreen(index)}
              >
                <Image src={imagesApi.getImageUrl(image.id)} alt={image.description} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Gallery View */}
      {currentIndex !== null && currentImage && (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] pb-16 md:pb-0">
          {/* Close Button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 z-50 text-white text-4xl hover:text-gray-300 transition-colors w-12 h-12 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>

          {/* Main Image Area */}
          <div className="absolute inset-0 flex items-center justify-center pb-36 md:pb-32">
            {/* Previous Button */}
            <button
              onClick={navigatePrevious}
              disabled={isAnimating}
              className="absolute left-4 z-40 text-white text-5xl hover:text-gray-300 transition-colors w-16 h-16 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous"
            >
              ‹
            </button>

            {/* Image Container with Animation */}
            <div className="relative w-full h-full flex items-center justify-center px-12 md:px-24 overflow-hidden">
              {/* Outgoing Image */}
              {slideDirection && (
                <div
                  className={`absolute inset-0 flex items-center justify-center px-12 md:px-24 transition-all duration-300 ease-in-out ${
                    slideDirection === "left" ? "animate-slide-out-left" : "animate-slide-out-right"
                  }`}
                  style={{
                    transform: slideDirection === "left" ? "translateX(-100%)" : "translateX(100%)",
                    opacity: 0,
                  }}
                >
                  <div className="relative" style={{ maxHeight: "calc(100vh - 240px)" }}>
                    <Image
                      src={imagesApi.getImageUrl(
                        images[slideDirection === "left" ? (currentIndex > 0 ? currentIndex - 1 : images.length - 1) : currentIndex < images.length - 1 ? currentIndex + 1 : 0].id
                      )}
                      alt=""
                      width={1024}
                      height={1024}
                      className="object-contain max-h-full w-auto"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* Incoming Image */}
              <div
                className={`relative max-w-4xl max-h-full transition-all duration-300 ease-in-out ${
                  slideDirection === "left"
                    ? "animate-slide-in-left opacity-100 translate-x-0"
                    : slideDirection === "right"
                    ? "animate-slide-in-right opacity-100 translate-x-0"
                    : "opacity-100 translate-x-0"
                }`}
                style={{
                  transform: slideDirection ? "translateX(0)" : undefined,
                  opacity: 1,
                }}
              >
                <div className="relative" style={{ maxHeight: "calc(100vh - 240px)" }}>
                  <Image
                    src={imagesApi.getImageUrl(currentImage.id)}
                    alt={currentImage.description}
                    width={1024}
                    height={1024}
                    className="object-contain max-h-full w-auto"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={navigateNext}
              disabled={isAnimating}
              className="absolute right-4 z-40 text-white text-5xl hover:text-gray-300 transition-colors w-16 h-16 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next"
            >
              ›
            </button>
          </div>

          {/* Bottom Info Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent pb-16 md:pb-4 pt-4 md:pt-8">
            {/* Prompt and Buttons */}
            <div className="max-w-4xl mx-auto px-4 md:px-8 mb-2 md:mb-4">
              <p className="text-white text-center mb-2 md:mb-4 text-sm md:text-lg line-clamp-2">{currentImage.prompt}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => handleEditImage(currentImage.id)}
                  className="bg-purple-600 text-white px-4 md:px-6 py-1.5 md:py-2 rounded hover:bg-purple-700 transition-colors text-sm md:text-base"
                >
                  {t("gallery.edit")}
                </button>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="px-4 md:px-8 pb-2">
              <div className="flex justify-center items-center space-x-1.5 md:space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    onClick={() => {
                      if (index !== currentIndex && !isAnimating) {
                        const direction = index > currentIndex ? "left" : "right";
                        setIsAnimating(true);
                        setSlideDirection(direction);
                        setTimeout(() => {
                          setCurrentIndex(index);
                          setSlideDirection(null);
                          setIsAnimating(false);
                        }, 300);
                      }
                    }}
                    className={`relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded cursor-pointer transition-all ${
                      index === currentIndex ? "ring-1 md:ring-2 ring-white scale-110 ring-offset-1 md:ring-offset-2 ring-offset-[#1a1a1a]" : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <Image src={imagesApi.getImageUrl(image.id)} alt="" fill className="object-cover rounded" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

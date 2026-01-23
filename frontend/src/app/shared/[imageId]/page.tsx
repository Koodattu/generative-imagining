"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { imagesApi, ImageData } from "@/utils/api";
import Image from "next/image";

export default function SharedImagePage() {
  const params = useParams();
  const imageId = params.imageId as string;
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const imageData = await imagesApi.getImageById(imageId);
        setImage(imageData);
      } catch (err) {
        console.error("Error loading shared image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (imageId) {
      loadImage();
    }
  }, [imageId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-200 mb-2">Image Not Found</h2>
          <p className="text-gray-400">This image does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 md:p-6 lg:p-8 bg-[#1a1a1a]">
      {/* Painting Frame Container - uses fixed dimensions based on viewport */}
      <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center">
        {/* Outer Frame - Ornate Border */}
        <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5344] to-[#4A3728] p-1.5 md:p-2 rounded-sm shadow-2xl max-h-full max-w-full">
          {/* Inner Gold Accent */}
          <div className="bg-gradient-to-br from-[#D4AF37] via-[#C5A028] to-[#B8860B] p-0.5 md:p-1">
            {/* Inner Frame */}
            <div className="bg-gradient-to-br from-[#5C4033] via-[#4A3728] to-[#3D2914] p-1.5 md:p-2">
              {/* Matte/Mount */}
              <div className="bg-gradient-to-br from-[#F5F5DC] via-[#FFFEF0] to-[#FAF8EF] p-2 md:p-4 flex flex-col">
                {/* Image Container */}
                <div className="relative bg-black">
                  <Image
                    src={imagesApi.getImageUrl(image.id)}
                    alt={image.description}
                    width={1024}
                    height={1024}
                    className="block max-h-[50vh] md:max-h-[60vh] lg:max-h-[75vh] w-auto h-auto mx-auto"
                    unoptimized
                  />
                </div>

                {/* Prompt Plaque */}
                <div className="mt-2 md:mt-3">
                  <div className="bg-gradient-to-r from-[#8B7355] via-[#A08060] to-[#8B7355] p-0.5 rounded-sm">
                    <div className="bg-gradient-to-b from-[#2a2520] to-[#1a1510] px-3 py-2 md:px-4 md:py-3 rounded-sm">
                      <p className="text-[#D4C4A8] text-center text-xs md:text-sm lg:text-base leading-relaxed font-serif italic line-clamp-2">"{image.prompt}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

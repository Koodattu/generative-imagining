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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Main Image Area - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="relative w-full h-full flex items-center justify-center">
          <Image src={imagesApi.getImageUrl(image.id)} alt={image.description} width={1024} height={1024} className="object-contain max-w-full max-h-full" unoptimized />
        </div>
      </div>

      {/* Prompt Display - Takes as much space as needed */}
      <div className="flex-shrink-0 px-6 py-6">
        <p className="text-gray-300 text-center text-base md:text-lg leading-relaxed">{image.prompt}</p>
      </div>
    </div>
  );
}

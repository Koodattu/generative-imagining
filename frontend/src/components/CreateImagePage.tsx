"use client";

import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { imagesApi, aiApi, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

export default function CreateImagePage() {
  const { user, loading } = useUser();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<ImageDataType | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [keyword, setKeyword] = useState("");

  const handleGenerateImage = async () => {
    if (!user || !prompt.trim()) return;

    setGenerating(true);
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
      const result = await aiApi.suggestPrompts(keyword || undefined);
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to initialize user session</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Create Image</h1>
        <p className="text-gray-400">Describe what you want to create</p>
      </div>

      {/* Main Input Section */}
      <div className="bg-[#2a2a2a] rounded-lg p-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image... (e.g., 'A sunset over mountains with flying birds')"
          className="w-full p-4 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 resize-vertical min-h-[120px] placeholder-gray-500"
          disabled={generating}
        />

        <button
          onClick={handleGenerateImage}
          disabled={generating || !prompt.trim()}
          className="w-full mt-4 bg-blue-600 text-white py-3 px-6 rounded font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating...
            </div>
          ) : (
            "Generate Image"
          )}
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length === 0 && !generating && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-3">Need inspiration?</p>
          <button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="bg-[#3a3a3a] text-gray-200 px-4 py-2 rounded hover:bg-[#4a4a4a] disabled:bg-gray-700 transition-colors"
          >
            {loadingSuggestions ? "Loading..." : "Get Ideas"}
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-3">Click a suggestion to use it:</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleUseSuggestion(suggestion)}
                className="w-full text-left p-3 bg-[#1a1a1a] text-gray-300 rounded hover:bg-[#3a3a3a] hover:text-gray-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated Image */}
      {generatedImage && (
        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Generated Image</h2>

          <div className="relative aspect-square max-w-lg mx-auto bg-[#1a1a1a] rounded overflow-hidden mb-4">
            <Image src={imagesApi.getImageUrl(generatedImage.id)} alt={generatedImage.description} fill className="object-cover" unoptimized />
          </div>

          <div className="text-center space-y-2 mb-4">
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Prompt:</strong> {generatedImage.prompt}
            </p>
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Description:</strong> {generatedImage.description}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => setGeneratedImage(null)} className="bg-[#3a3a3a] text-gray-200 px-5 py-2 rounded hover:bg-[#4a4a4a] transition-colors">
              Create Another
            </button>
            <button
              onClick={() => window.open(`/edit?imageId=${generatedImage.id}`, "_blank")}
              className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              Edit This Image
            </button>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="text-center text-xs text-gray-600">User ID: {user.guid.slice(0, 8)}...</div>
    </div>
  );
}

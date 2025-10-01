"use client";

import { useState, useEffect } from "react";
import { adminApi, cookieManager, ImageData as ImageDataType } from "@/utils/api";
import Image from "next/image";

interface AdminStats {
  total_users: number;
  total_images: number;
  recent_images: number;
  recent_users: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageDataType[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);
  const [activeTab, setActiveTab] = useState<"images" | "stats">("images");

  useEffect(() => {
    // Check if already authenticated
    const token = cookieManager.getAdminToken();
    if (token) {
      setIsAuthenticated(true);
      loadAdminData(token);
    }
  }, []);

  const loadAdminData = async (token: string) => {
    setLoading(true);
    try {
      const [imagesResult, statsResult] = await Promise.all([adminApi.getAllImages(token), adminApi.getStats(token)]);
      setImages(imagesResult.images);
      setStats(statsResult);
    } catch (error) {
      console.error("Error loading admin data:", error);
      // Token might be invalid, clear it
      cookieManager.clearAdminToken();
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    try {
      const result = await adminApi.login(password);
      cookieManager.setAdminToken(result.token);
      setIsAuthenticated(true);
      loadAdminData(result.token);
    } catch (error) {
      console.error("Login error:", error);
      alert("Invalid admin password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    cookieManager.clearAdminToken();
    setIsAuthenticated(false);
    setImages([]);
    setStats(null);
    setPassword("");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#2a2a2a] rounded-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Admin Login</h1>
            <p className="text-gray-400">Enter admin password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 placeholder-gray-500"
              placeholder="Enter admin password"
              required
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-400">Manage and monitor the platform</p>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition-colors">
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("images")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "images" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            All Images ({images.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "stats" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Statistics
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading admin data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Images Tab */}
          {activeTab === "images" && (
            <div className="space-y-6">
              {images.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🖼️</div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">No images yet</h3>
                  <p className="text-gray-400">Images generated by users will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="bg-[#2a2a2a] rounded overflow-hidden hover:bg-[#3a3a3a] transition-colors">
                      <div className="relative aspect-square bg-[#1a1a1a] cursor-pointer" onClick={() => setSelectedImage(image)}>
                        <Image src={`http://localhost:8000/api/images/${image.id}`} alt={image.description} fill className="object-cover" unoptimized />
                      </div>

                      <div className="p-3">
                        <p className="text-xs text-gray-500 mb-1">User: {image.user_guid.slice(0, 8)}...</p>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">{image.prompt}</p>
                        <p className="text-xs text-gray-600">{new Date(image.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.total_users}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🖼️</div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Images</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.total_images}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📅</div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Recent Images (7d)</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.recent_images}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🆕</div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">New Users (7d)</p>
                    <p className="text-2xl font-semibold text-gray-100">{stats.recent_users}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
          <div className="bg-[#2a2a2a] rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-100">Image Details</h3>
                <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-gray-200 text-2xl">
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative aspect-square max-w-lg mx-auto bg-[#1a1a1a] rounded overflow-hidden">
                  <Image src={`http://localhost:8000/api/images/${selectedImage.id}`} alt={selectedImage.description} fill className="object-cover" unoptimized />
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">User GUID:</strong> {selectedImage.user_guid}
                  </p>
                  <p>
                    <strong className="text-gray-300">Prompt:</strong> {selectedImage.prompt}
                  </p>
                  <p>
                    <strong className="text-gray-300">Description:</strong> {selectedImage.description}
                  </p>
                  <p>
                    <strong className="text-gray-300">Created:</strong> {new Date(selectedImage.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-center">
                  <button onClick={() => setSelectedImage(null)} className="bg-[#3a3a3a] text-gray-200 px-5 py-2 rounded hover:bg-[#4a4a4a] transition-colors">
                    Close
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

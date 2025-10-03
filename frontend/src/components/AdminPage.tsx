"use client";

import { useState, useEffect } from "react";
import { adminApi, cookieManager, ImageData as ImageDataType, imagesApi } from "@/utils/api";
import { useLocale } from "@/contexts/LocaleContext";
import Image from "next/image";

interface AdminStats {
  total_users: number;
  total_images: number;
  recent_images: number;
  recent_users: number;
  password_stats: Array<{
    password: string;
    image_count: number;
    is_expired: boolean;
  }>;
}

interface PasswordData {
  password: string;
  valid_hours: number;
  image_limit: number;
  suggestion_limit: number;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  bypass_watchdog: boolean;
}

interface ModerationFailure {
  _id: string;
  prompt: string;
  rejection_reason: string;
  is_edit: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { t } = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageDataType[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageDataType | null>(null);
  const [activeTab, setActiveTab] = useState<"images" | "stats" | "passwords" | "guidelines" | "moderation">("images");
  const [passwords, setPasswords] = useState<PasswordData[]>([]);
  const [newPassword, setNewPassword] = useState({
    password: "",
    validHours: 1,
    imageLimit: 5,
    suggestionLimit: 50,
    bypassWatchdog: false,
  });
  const [guidelines, setGuidelines] = useState("");
  const [isDefaultGuidelines, setIsDefaultGuidelines] = useState(true);
  const [guidelinesChanged, setGuidelinesChanged] = useState(false);
  const [moderationFailures, setModerationFailures] = useState<ModerationFailure[]>([]);

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
      const [imagesResult, statsResult, passwordsResult, guidelinesResult, failuresResult] = await Promise.all([
        adminApi.getAllImages(token),
        adminApi.getStats(token),
        adminApi.getPasswords(token),
        adminApi.getModerationGuidelines(token),
        adminApi.getModerationFailures(token),
      ]);
      setImages(imagesResult.images);
      setStats(statsResult);
      setPasswords(passwordsResult.passwords);
      setGuidelines(guidelinesResult.guidelines);
      setIsDefaultGuidelines(guidelinesResult.is_default);
      setGuidelinesChanged(false);
      setModerationFailures(failuresResult.failures);
      setStats(statsResult);
      setPasswords(passwordsResult.passwords);
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
      alert(t("admin.invalidPassword"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    cookieManager.clearAdminToken();
    setIsAuthenticated(false);
    setImages([]);
    setStats(null);
    setPasswords([]);
    setPassword("");
    setGuidelines("");
    setIsDefaultGuidelines(true);
    setGuidelinesChanged(false);
    setModerationFailures([]);
  };

  const handleCreatePassword = async () => {
    if (!newPassword.password.trim()) return;

    setLoading(true);
    try {
      const token = cookieManager.getAdminToken();
      if (!token) return;

      await adminApi.createPassword(token, newPassword.password, newPassword.validHours, newPassword.imageLimit, newPassword.suggestionLimit, newPassword.bypassWatchdog);

      // Reload passwords
      const passwordsResult = await adminApi.getPasswords(token);
      setPasswords(passwordsResult.passwords);

      // Reset form
      setNewPassword({
        password: "",
        validHours: 1,
        imageLimit: 5,
        suggestionLimit: 50,
        bypassWatchdog: false,
      });

      alert("Password created successfully!");
    } catch (error) {
      console.error("Error creating password:", error);
      alert("Failed to create password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm(t("admin.confirmDelete"))) return;

    setLoading(true);
    try {
      const token = cookieManager.getAdminToken();
      if (!token) return;

      await adminApi.deleteImage(token, imageId);

      // Remove from local state
      setImages(images.filter((img) => img.id !== imageId));

      // Reload stats to update counts
      const statsResult = await adminApi.getStats(token);
      setStats(statsResult);

      alert(t("admin.imageDeleted"));
    } catch (error) {
      console.error("Error deleting image:", error);
      alert(t("admin.deleteError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePassword = async (password: string) => {
    if (!confirm("Are you sure you want to delete this password? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const token = cookieManager.getAdminToken();
      if (!token) return;

      await adminApi.deletePassword(token, password);

      // Reload passwords
      const passwordsResult = await adminApi.getPasswords(token);
      setPasswords(passwordsResult.passwords);

      alert("Password deleted successfully!");
    } catch (error) {
      console.error("Error deleting password:", error);
      alert("Failed to delete password");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGuidelines = async () => {
    if (!guidelines.trim()) {
      alert("Guidelines cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const token = cookieManager.getAdminToken();
      if (!token) return;

      await adminApi.updateModerationGuidelines(token, guidelines);
      setGuidelinesChanged(false);
      setIsDefaultGuidelines(false);
      alert("Guidelines saved successfully!");
    } catch (error) {
      console.error("Error saving guidelines:", error);
      alert("Failed to save guidelines");
    } finally {
      setLoading(false);
    }
  };

  const handleResetGuidelines = async () => {
    if (!confirm("Are you sure you want to reset the guidelines to default?")) return;

    setLoading(true);
    try {
      const token = cookieManager.getAdminToken();
      if (!token) return;

      const result = await adminApi.resetModerationGuidelines(token);
      setGuidelines(result.guidelines);
      setIsDefaultGuidelines(true);
      setGuidelinesChanged(false);
      alert("Guidelines reset to default successfully!");
    } catch (error) {
      console.error("Error resetting guidelines:", error);
      alert("Failed to reset guidelines");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#2a2a2a] rounded-lg p-6 md:p-8">
          <div className="text-center mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">{t("admin.login")}</h1>
            <p className="text-gray-400 text-sm md:text-base">{t("admin.login.desc")}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 md:p-4 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 placeholder-gray-500 text-sm md:text-base"
              placeholder={t("admin.password.placeholder")}
              required
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-blue-600 text-white py-2.5 md:py-3 px-6 rounded font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t("admin.loggingIn")}
                </div>
              ) : (
                t("admin.loginButton")
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">{t("admin.title")}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t("admin.subtitle")}</p>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded hover:bg-red-700 transition-colors text-sm md:text-base">
          {t("admin.logout")}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-4 md:space-x-8">
          <button
            onClick={() => setActiveTab("images")}
            className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm ${
              activeTab === "images" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("admin.allImages")} ({images.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm ${
              activeTab === "stats" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("admin.statistics")}
          </button>
          <button
            onClick={() => setActiveTab("passwords")}
            className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm ${
              activeTab === "passwords" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("admin.passwords")} ({passwords.length})
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm ${
              activeTab === "guidelines" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Moderation
          </button>
          <button
            onClick={() => setActiveTab("moderation")}
            className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm ${
              activeTab === "moderation" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Failed ({moderationFailures.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">{t("admin.loadingData")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Images Tab */}
          {activeTab === "images" && (
            <div className="space-y-4 md:space-y-6">
              {images.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🖼️</div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">{t("admin.noImages")}</h3>
                  <p className="text-gray-400">{t("admin.noImages.desc")}</p>
                </div>
              ) : (
                <div className="bg-[#2a2a2a] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.image")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.prompt")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.description")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.dateTime")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.password")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.user")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {images.map((image) => (
                          <tr key={image.id} className="hover:bg-[#3a3a3a] transition-colors">
                            <td className="px-3 md:px-6 py-4">
                              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-[#1a1a1a] rounded overflow-hidden cursor-pointer" onClick={() => setSelectedImage(image)}>
                                <Image src={imagesApi.getImageUrl(image.id)} alt={image.description} fill className="object-cover" unoptimized />
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4 max-w-xs">
                              <p className="text-xs md:text-sm text-gray-300 line-clamp-3">{image.prompt}</p>
                            </td>
                            <td className="px-3 md:px-6 py-4 max-w-xs">
                              <p className="text-xs md:text-sm text-gray-400 line-clamp-3">{image.description}</p>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <p className="text-xs md:text-sm text-gray-300">{new Date(image.created_at).toLocaleString()}</p>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-mono rounded bg-blue-900/50 text-blue-200">{image.created_with_password || "N/A"}</span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <p className="text-xs md:text-sm text-gray-400 font-mono">{image.user_guid.substring(0, 8)}...</p>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700 transition-colors"
                                disabled={loading}
                              >
                                {t("admin.delete")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && stats && (
            <div className="space-y-4 md:space-y-6">
              {/* General Stats */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                  <div className="flex items-center">
                    <div className="text-xl md:text-2xl mr-2 md:mr-3">👥</div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-400">{t("admin.stats.totalUsers")}</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-100">{stats.total_users}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                  <div className="flex items-center">
                    <div className="text-xl md:text-2xl mr-2 md:mr-3">🖼️</div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-400">{t("admin.stats.totalImages")}</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-100">{stats.total_images}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                  <div className="flex items-center">
                    <div className="text-xl md:text-2xl mr-2 md:mr-3">📅</div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-400">{t("admin.stats.recentImages")}</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-100">{stats.recent_images}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                  <div className="flex items-center">
                    <div className="text-xl md:text-2xl mr-2 md:mr-3">🆕</div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-400">{t("admin.stats.newUsers")}</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-100">{stats.recent_users}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Statistics */}
              <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-gray-100 mb-4">{t("admin.stats.imagesByPassword")}</h3>
                {stats.password_stats && stats.password_stats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.password")}</th>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.stats.imageCount")}</th>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {stats.password_stats.map((stat, index) => (
                          <tr key={index} className={stat.is_expired ? "opacity-50" : ""}>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs md:text-sm font-mono rounded bg-blue-900/50 text-blue-200">{stat.password}</span>
                            </td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm md:text-base text-gray-300 font-semibold">{stat.image_count}</td>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  stat.is_expired ? "bg-red-900/50 text-red-200" : "bg-green-900/50 text-green-200"
                                }`}
                              >
                                {stat.is_expired ? t("admin.passwords.expired") : t("admin.passwords.active")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">{t("admin.stats.noPasswordData")}</p>
                )}
              </div>
            </div>
          )}

          {/* Passwords Tab */}
          {activeTab === "passwords" && (
            <div className="space-y-4 md:space-y-6">
              {/* Create Password Form */}
              <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-gray-100 mb-4">{t("admin.passwords.create")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm text-gray-400 mb-1">{t("admin.passwords.password")}</label>
                    <input
                      type="text"
                      value={newPassword.password}
                      onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-gray-400 mb-1">{t("admin.passwords.validHours")}</label>
                    <input
                      type="number"
                      value={newPassword.validHours}
                      onChange={(e) => setNewPassword({ ...newPassword, validHours: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-gray-400 mb-1">{t("admin.passwords.imageLimit")}</label>
                    <input
                      type="number"
                      value={newPassword.imageLimit}
                      onChange={(e) => setNewPassword({ ...newPassword, imageLimit: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-gray-400 mb-1">{t("admin.passwords.suggestionLimit")}</label>
                    <input
                      type="number"
                      value={newPassword.suggestionLimit}
                      onChange={(e) => setNewPassword({ ...newPassword, suggestionLimit: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-gray-400 mb-1">Bypass Watchdog</label>
                    <div className="flex items-center h-[42px]">
                      <input
                        type="checkbox"
                        id="bypassWatchdog"
                        checked={newPassword.bypassWatchdog}
                        onChange={(e) => setNewPassword({ ...newPassword, bypassWatchdog: e.target.checked })}
                        className="w-5 h-5 bg-[#1a1a1a] border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="bypassWatchdog" className="ml-2 text-xs md:text-sm text-gray-300 cursor-pointer">
                        Skip content moderation
                      </label>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCreatePassword}
                  disabled={!newPassword.password.trim() || loading}
                  className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                >
                  {loading ? t("admin.passwords.creating") : t("admin.passwords.createButton")}
                </button>
              </div>

              {/* Passwords List */}
              {passwords.length === 0 ? (
                <div className="text-center py-12 bg-[#2a2a2a] rounded-lg">
                  <div className="text-6xl mb-4">🔑</div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">{t("admin.passwords.noPasswords")}</h3>
                  <p className="text-gray-400">{t("admin.passwords.noPasswords.desc")}</p>
                </div>
              ) : (
                <div className="bg-[#2a2a2a] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.password")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.validHours")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.imageLimit")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.suggestionLimit")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bypass Watchdog</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.expiresAt")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.passwords.status")}</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {passwords.map((pwd, index) => (
                          <tr key={index} className={pwd.is_expired ? "opacity-50" : ""}>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300 font-mono">{pwd.password}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300">{pwd.valid_hours}h</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300">{pwd.image_limit}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300">{pwd.suggestion_limit}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  pwd.bypass_watchdog ? "bg-orange-900/50 text-orange-200" : "bg-blue-900/50 text-blue-200"
                                }`}
                              >
                                {pwd.bypass_watchdog ? "Enabled" : "Disabled"}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300">{new Date(pwd.expires_at).toLocaleString()}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  pwd.is_expired ? "bg-red-900/50 text-red-200" : "bg-green-900/50 text-green-200"
                                }`}
                              >
                                {pwd.is_expired ? t("admin.passwords.expired") : t("admin.passwords.active")}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleDeletePassword(pwd.password)}
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guidelines Tab */}
          {activeTab === "guidelines" && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-100">Content Moderation Guidelines</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {isDefaultGuidelines ? "Using default guidelines" : "Using custom guidelines"}
                      {guidelinesChanged && <span className="text-yellow-400 ml-2">• Unsaved changes</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetGuidelines}
                      disabled={loading || isDefaultGuidelines}
                      className="bg-gray-600 text-white px-3 md:px-4 py-2 rounded font-medium hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                    >
                      Reset to Default
                    </button>
                    <button
                      onClick={handleSaveGuidelines}
                      disabled={loading || !guidelinesChanged}
                      className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Edit the guidelines below. Each line should start with a dash (-) for bullet points.</label>
                  <textarea
                    value={guidelines}
                    onChange={(e) => {
                      setGuidelines(e.target.value);
                      setGuidelinesChanged(true);
                    }}
                    className="w-full h-96 px-4 py-3 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter moderation guidelines..."
                    disabled={loading}
                  />
                </div>

                <div className="bg-[#1a1a1a] rounded p-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Preview:</h4>
                  <div className="text-xs text-gray-400 whitespace-pre-wrap font-mono">{guidelines}</div>
                </div>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">How it works</h3>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>• These guidelines are used by the AI to moderate image generation and editing prompts.</p>
                  <p>• The AI evaluates each user prompt against these guidelines before processing.</p>
                  <p>• Changes take effect immediately for all new image requests.</p>
                  <p>• Guidelines should be clear, specific, and formatted as bullet points.</p>
                </div>
              </div>
            </div>
          )}

          {/* Moderation Failures Tab */}
          {activeTab === "moderation" && (
            <div className="space-y-4 md:space-y-6">
              {moderationFailures.length === 0 ? (
                <div className="text-center py-12 bg-[#2a2a2a] rounded-lg">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">No Failed Moderations</h3>
                  <p className="text-gray-400">All prompts have passed content moderation checks.</p>
                </div>
              ) : (
                <div className="bg-[#2a2a2a] rounded-lg overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-gray-700">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-100">Failed Content Moderation Attempts</h3>
                    <p className="text-sm text-gray-400 mt-1">Review prompts that were rejected by the AI moderation system (showing last 500)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Prompt</th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {moderationFailures.map((failure) => (
                          <tr key={failure._id} className="hover:bg-[#3a3a3a]">
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-300">{new Date(failure.created_at).toLocaleString()}</td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  failure.is_edit ? "bg-blue-900/50 text-blue-200" : "bg-purple-900/50 text-purple-200"
                                }`}
                              >
                                {failure.is_edit ? "Edit" : "Generate"}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-300 max-w-md">
                              <div className="line-clamp-3">{failure.prompt}</div>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-red-300 max-w-md">
                              <div className="line-clamp-2">{failure.rejection_reason}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-2 md:p-4">
          <div className="bg-[#2a2a2a] rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-100">{t("admin.imageDetails")}</h3>
                <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-gray-200 text-2xl">
                  ×
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="relative aspect-square max-w-md md:max-w-lg mx-auto bg-[#1a1a1a] rounded overflow-hidden">
                  <Image src={imagesApi.getImageUrl(selectedImage.id)} alt={selectedImage.description} fill className="object-cover" unoptimized />
                </div>

                <div className="space-y-2 text-xs md:text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">{t("admin.prompt")}:</strong> {selectedImage.prompt}
                  </p>
                  <p>
                    <strong className="text-gray-300">{t("admin.description")}:</strong> {selectedImage.description}
                  </p>
                  <p>
                    <strong className="text-gray-300">{t("admin.created")}:</strong> {new Date(selectedImage.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="bg-[#3a3a3a] text-gray-200 px-4 md:px-5 py-2 rounded hover:bg-[#4a4a4a] transition-colors text-sm md:text-base"
                  >
                    {t("admin.close")}
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

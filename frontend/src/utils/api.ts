import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types
export interface User {
  guid: string;
}

export interface ImageData {
  id: string;
  user_guid: string;
  file_path: string;
  prompt: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_with_password?: string;
}

export interface ApiResponse<T> {
  data: T;
}

// User API
export const userApi = {
  async identifyUser(guid?: string): Promise<User> {
    const response = await api.post("/api/user/identify", {
      guid: guid || null,
    });
    return response.data;
  },

  async verifyUser(guid: string): Promise<User> {
    const response = await api.post("/api/user/verify", { guid });
    return response.data;
  },
};

// Images API
export const imagesApi = {
  async generateImage(prompt: string, userGuid: string, password: string): Promise<ImageData> {
    const response = await api.post("/api/images/generate", {
      prompt,
      user_guid: userGuid,
      password,
    });
    return response.data;
  },

  async editImage(imageId: string, editPrompt: string, userGuid: string, password: string): Promise<ImageData> {
    const response = await api.post("/api/images/edit", {
      image_id: imageId,
      edit_prompt: editPrompt,
      user_guid: userGuid,
      password,
    });
    return response.data;
  },

  async getUserGallery(userGuid: string): Promise<{ images: ImageData[] }> {
    const response = await api.get(`/api/images/gallery?user_guid=${userGuid}`);
    return response.data;
  },

  async deleteImage(imageId: string, userGuid: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/images/${imageId}?user_guid=${userGuid}`);
    return response.data;
  },

  getImageUrl(imageId: string): string {
    return `${API_BASE_URL}/api/images/${imageId}`;
  },
};

// AI API
export const aiApi = {
  async suggestPrompts(keyword: string | undefined, language: string | undefined, userGuid: string, password: string): Promise<{ suggestions: string[] }> {
    const response = await api.post("/api/ai/suggest-prompts", {
      keyword,
      language,
      user_guid: userGuid,
      password,
    });
    return response.data;
  },

  async describeImage(imageId: string): Promise<{ description: string }> {
    const response = await api.post(`/api/ai/describe-image?image_id=${imageId}`);
    return response.data;
  },

  async suggestEdits(imageId: string, keyword: string | undefined, language: string | undefined, userGuid: string, password: string): Promise<{ suggestions: string[] }> {
    const response = await api.post(`/api/ai/suggest-edits?image_id=${imageId}`, {
      keyword,
      language,
      user_guid: userGuid,
      password,
    });
    return response.data;
  },
};

// Admin API
export const adminApi = {
  async login(password: string): Promise<{ token: string; message: string }> {
    const response = await api.post("/api/admin/login", { password });
    return response.data;
  },

  async getAllImages(token: string): Promise<{ images: ImageData[] }> {
    const response = await api.get("/api/admin/images", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getStats(token: string): Promise<{
    total_users: number;
    total_images: number;
    recent_images: number;
    recent_users: number;
    password_stats: Array<{
      password: string;
      image_count: number;
      is_expired: boolean;
    }>;
  }> {
    const response = await api.get("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createPassword(
    token: string,
    password: string,
    validHours: number,
    imageLimit: number,
    suggestionLimit: number
  ): Promise<{
    message: string;
    password: string;
    expires_at: string;
    image_limit: number;
    suggestion_limit: number;
  }> {
    const response = await api.post(
      "/api/admin/passwords/create",
      {
        password,
        valid_hours: validHours,
        image_limit: imageLimit,
        suggestion_limit: suggestionLimit,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  async getPasswords(token: string): Promise<{
    passwords: Array<{
      password: string;
      valid_hours: number;
      image_limit: number;
      suggestion_limit: number;
      created_at: string;
      expires_at: string;
      is_expired: boolean;
    }>;
  }> {
    const response = await api.get("/api/admin/passwords", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async deleteImage(token: string, imageId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/admin/images/${imageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Cookie management
export const cookieManager = {
  setUserGuid(guid: string) {
    Cookies.set("user_guid", guid, { expires: 365 }); // 1 year
  },

  getUserGuid(): string | undefined {
    return Cookies.get("user_guid");
  },

  clearUserGuid() {
    Cookies.remove("user_guid");
  },

  setAdminToken(token: string) {
    Cookies.set("admin_token", token, { expires: 1 }); // 1 day
  },

  getAdminToken(): string | undefined {
    return Cookies.get("admin_token");
  },

  clearAdminToken() {
    Cookies.remove("admin_token");
  },
};

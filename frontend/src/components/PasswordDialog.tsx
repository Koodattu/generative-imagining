"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { usePassword } from "@/contexts/PasswordContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/";

export default function PasswordDialog() {
  const { t } = useLocale();
  const { password, setPassword, showPasswordDialog, setShowPasswordDialog } = usePassword();
  const [inputPassword, setInputPassword] = useState("");
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  if (!showPasswordDialog) return null;

  const handleValidate = async () => {
    if (!inputPassword.trim()) return;

    setValidating(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/password/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: inputPassword }),
      });

      const data = await response.json();

      if (data.valid) {
        setPassword(inputPassword);
        setMessage({ type: "success", text: t("password.valid") });
        setIsValidated(true);
      } else {
        setMessage({ type: "error", text: t("password.invalid") });
      }
    } catch (error) {
      console.error("Error validating password:", error);
      setMessage({ type: "error", text: t("password.invalid") });
    } finally {
      setValidating(false);
    }
  };

  const handleClose = () => {
    setShowPasswordDialog(false);
    setInputPassword("");
    setMessage(null);
    setIsValidated(false);
  };

  const handleGetStarted = () => {
    setShowPasswordDialog(false);
    setInputPassword("");
    setMessage(null);
    setIsValidated(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#2a2a2a] rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">{t("password.title")}</h2>
          <p className="text-gray-400 text-sm">{t("password.description")}</p>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-center ${
              message.type === "success" ? "bg-green-900/50 border border-green-500 text-green-200" : "bg-red-900/50 border border-red-500 text-red-200"
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="space-y-3">
          {!isValidated ? (
            <>
              <input
                type="text"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleValidate()}
                placeholder={t("password.placeholder")}
                className="w-full px-4 py-3 bg-[#1a1a1a] text-gray-100 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
                disabled={validating}
                autoFocus
              />

              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors" disabled={validating}>
                  {t("password.close")}
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!inputPassword.trim() || validating}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  {validating ? t("password.validating") : t("password.validate")}
                </button>
              </div>
            </>
          ) : (
            <button onClick={handleGetStarted} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-lg">
              {t("password.getStarted")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

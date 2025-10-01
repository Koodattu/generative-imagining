"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Locale = "fi" | "en";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Locale, Record<string, string>> = {
  fi: {
    // Navigation
    "nav.appName": "Generatiivinen Kuvittelu",
    "nav.create": "Luo",
    "nav.edit": "Muokkaa",
    "nav.gallery": "Galleria",
    "nav.admin": "Hallinta",

    // Home page
    "home.title": "Generatiivinen Kuvittelu",
    "home.subtitle": "AI-pohjainen kuvien luonti ja muokkaus",
    "home.create": "Luo",
    "home.create.desc": "Luo uusia kuvia AI:lla",
    "home.edit": "Muokkaa",
    "home.edit.desc": "Muokkaa olemassa olevia kuvia",
    "home.gallery": "Galleria",
    "home.gallery.desc": "Katso luomuksiasi",

    // Create page
    "create.title": "Luo Kuva",
    "create.subtitle": "Kuvaile mitä haluat luoda",
    "create.prompt.placeholder": "Kuvaile kuvasi... (esim. 'Auringonlasku vuorten yli lentävien lintujen kanssa')",
    "create.generate": "Luo Kuva",
    "create.generating": "Luodaan...",
    "create.needInspiration": "Tarvitsetko inspiraatiota?",
    "create.getIdeas": "Hanki Ideoita",
    "create.loading": "Ladataan...",
    "create.clickSuggestion": "Klikkaa ehdotusta käyttääksesi sitä:",
    "create.generatedImage": "Luotu Kuva",
    "create.prompt": "Kehote",
    "create.description": "Kuvaus",
    "create.createAnother": "Luo Toinen",
    "create.editThisImage": "Muokkaa Tätä Kuvaa",

    // Edit page
    "edit.title": "Muokkaa Kuvaa",
    "edit.subtitle": "Valitse kuva ja kuvaile kuinka sitä muokataan",
    "edit.selectImage": "Valitse Kuva",
    "edit.loadingImages": "Ladataan kuvia...",
    "edit.noImages": "Sinulla ei ole vielä kuvia.",
    "edit.createFirst": "Luo Ensimmäinen Kuvasi",
    "edit.original": "Alkuperäinen",
    "edit.instructions": "Muokkausohjeet",
    "edit.prompt.placeholder": "Kuvaile kuinka muokata... (esim. 'tee värikkäämmäksi', 'lisää pilviä')",
    "edit.editImage": "Muokkaa Kuvaa",
    "edit.editing": "Muokataan...",
    "edit.suggestions": "Ehdotukset:",
    "edit.loadingSuggestions": "Ladataan ehdotuksia...",
    "edit.editedImage": "Muokattu Kuva",
    "edit.edit": "Muokkaus",
    "edit.editAgain": "Muokkaa Uudelleen",
    "edit.viewGallery": "Katso Galleria",

    // Gallery page
    "gallery.title": "Galleriasi",
    "gallery.subtitle": "Katso ja hallinnoi kuviasi",
    "gallery.loadingImages": "Ladataan kuvia...",
    "gallery.noImages": "Ei vielä kuvia",
    "gallery.noImages.desc": "Luo ensimmäinen kuvasi nähdäksesi sen täällä",
    "gallery.createFirst": "Luo Ensimmäinen Kuvasi",
    "gallery.edit": "Muokkaa",
    "gallery.delete": "Poista",
    "gallery.imageDetails": "Kuvan Tiedot",
    "gallery.prompt": "Kehote",
    "gallery.description": "Kuvaus",
    "gallery.created": "Luotu",
    "gallery.close": "Sulje",
    "gallery.deleteConfirm": "Haluatko varmasti poistaa tämän kuvan?",

    // Admin page
    "admin.title": "Hallintapaneeli",
    "admin.subtitle": "Hallinnoi ja valvo alustaa",
    "admin.logout": "Kirjaudu Ulos",
    "admin.login": "Hallinnon Kirjautuminen",
    "admin.login.desc": "Syötä hallinnan salasana",
    "admin.password.placeholder": "Syötä hallinnan salasana",
    "admin.loggingIn": "Kirjaudutaan sisään...",
    "admin.loginButton": "Kirjaudu",
    "admin.invalidPassword": "Virheellinen hallinnan salasana",
    "admin.allImages": "Kaikki Kuvat",
    "admin.statistics": "Tilastot",
    "admin.loadingData": "Ladataan hallintadataa...",
    "admin.noImages": "Ei vielä kuvia",
    "admin.noImages.desc": "Käyttäjien luomat kuvat näkyvät täällä",
    "admin.imageDetails": "Kuvan Tiedot",
    "admin.prompt": "Kehote",
    "admin.description": "Kuvaus",
    "admin.created": "Luotu",
    "admin.close": "Sulje",
    "admin.stats.totalUsers": "Käyttäjiä Yhteensä",
    "admin.stats.totalImages": "Kuvia Yhteensä",
    "admin.stats.recentImages": "Viimeaikaiset Kuvat (7pv)",
    "admin.stats.newUsers": "Uudet Käyttäjät (7pv)",

    // Common
    "common.loading": "Ladataan...",
    "common.retry": "Yritä Uudelleen",
    "common.error": "Käyttäjäistunnon alustus epäonnistui",
  },
  en: {
    // Navigation
    "nav.appName": "Generative Imagining",
    "nav.create": "Create",
    "nav.edit": "Edit",
    "nav.gallery": "Gallery",
    "nav.admin": "Admin",

    // Home page
    "home.title": "Generative Imagining",
    "home.subtitle": "AI-powered image generation and editing",
    "home.create": "Create",
    "home.create.desc": "Generate new images with AI",
    "home.edit": "Edit",
    "home.edit.desc": "Modify existing images",
    "home.gallery": "Gallery",
    "home.gallery.desc": "View your creations",

    // Create page
    "create.title": "Create Image",
    "create.subtitle": "Describe what you want to create",
    "create.prompt.placeholder": "Describe your image... (e.g., 'A sunset over mountains with flying birds')",
    "create.generate": "Generate Image",
    "create.generating": "Generating...",
    "create.needInspiration": "Need inspiration?",
    "create.getIdeas": "Get Ideas",
    "create.loading": "Loading...",
    "create.clickSuggestion": "Click a suggestion to use it:",
    "create.generatedImage": "Generated Image",
    "create.prompt": "Prompt",
    "create.description": "Description",
    "create.createAnother": "Create Another",
    "create.editThisImage": "Edit This Image",

    // Edit page
    "edit.title": "Edit Image",
    "edit.subtitle": "Select an image and describe how to edit it",
    "edit.selectImage": "Select Image",
    "edit.loadingImages": "Loading images...",
    "edit.noImages": "You don't have any images yet.",
    "edit.createFirst": "Create Your First Image",
    "edit.original": "Original",
    "edit.instructions": "Edit Instructions",
    "edit.prompt.placeholder": "Describe how to edit... (e.g., 'make it more colorful', 'add clouds')",
    "edit.editImage": "Edit Image",
    "edit.editing": "Editing...",
    "edit.suggestions": "Suggestions:",
    "edit.loadingSuggestions": "Loading suggestions...",
    "edit.editedImage": "Edited Image",
    "edit.edit": "Edit",
    "edit.editAgain": "Edit Again",
    "edit.viewGallery": "View Gallery",

    // Gallery page
    "gallery.title": "Your Gallery",
    "gallery.subtitle": "View and manage your images",
    "gallery.loadingImages": "Loading images...",
    "gallery.noImages": "No images yet",
    "gallery.noImages.desc": "Create your first image to see it here",
    "gallery.createFirst": "Create Your First Image",
    "gallery.edit": "Edit",
    "gallery.delete": "Delete",
    "gallery.imageDetails": "Image Details",
    "gallery.prompt": "Prompt",
    "gallery.description": "Description",
    "gallery.created": "Created",
    "gallery.close": "Close",
    "gallery.deleteConfirm": "Are you sure you want to delete this image?",

    // Admin page
    "admin.title": "Admin Dashboard",
    "admin.subtitle": "Manage and monitor the platform",
    "admin.logout": "Logout",
    "admin.login": "Admin Login",
    "admin.login.desc": "Enter admin password",
    "admin.password.placeholder": "Enter admin password",
    "admin.loggingIn": "Logging in...",
    "admin.loginButton": "Login",
    "admin.invalidPassword": "Invalid admin password",
    "admin.allImages": "All Images",
    "admin.statistics": "Statistics",
    "admin.loadingData": "Loading admin data...",
    "admin.noImages": "No images yet",
    "admin.noImages.desc": "Images generated by users will appear here",
    "admin.imageDetails": "Image Details",
    "admin.prompt": "Prompt",
    "admin.description": "Description",
    "admin.created": "Created",
    "admin.close": "Close",
    "admin.stats.totalUsers": "Total Users",
    "admin.stats.totalImages": "Total Images",
    "admin.stats.recentImages": "Recent Images (7d)",
    "admin.stats.newUsers": "New Users (7d)",

    // Common
    "common.loading": "Loading...",
    "common.retry": "Retry",
    "common.error": "Failed to initialize user session",
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("fi"); // Finnish is default

  const t = (key: string): string => {
    return translations[locale][key] || key;
  };

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

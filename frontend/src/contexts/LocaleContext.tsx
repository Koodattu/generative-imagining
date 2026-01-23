"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    "create.title": "Luo kuva",
    "create.subtitle": "Kuvaile mitä haluat luoda",
    "create.resultTitle": "Kuva Luotu",
    "create.resultSubtitle": "Onnistuiko hyvin?",
    "create.prompt.placeholder": "Kuvaile kuvasi... (esim. 'Auringonlasku vuorten yli lentävien lintujen kanssa')",
    "create.generate": "✨ Luo kuva",
    "create.generating": "Luodaan...",
    "create.needInspiration": "Tarvitsetko inspiraatiota?",
    "create.getIdeas": "💡 Hanki ideoita",
    "create.loading": "Ladataan...",
    "create.clickSuggestion": "Klikkaa ehdotusta käyttääksesi sitä:",
    "create.tapIdea": "💡 Napauta ideaa käyttääksesi sitä",
    "create.generatedImage": "Luotu kuva",
    "create.prompt": "Kehote",
    "create.description": "Kuvaus",
    "create.createAnother": "Luo toinen",
    "create.editThisImage": "Muokkaa tätä kuvaa",
    "create.describeYourImage": "✏️ Kirjoita kuvaideasi tähän",

    // Edit page
    "edit.title": "Muokkaa kuvaa",
    "edit.subtitle": "Valitse kuva ja kuvaile kuinka sitä muokataan",
    "edit.selectImage": "Valitse kuva",
    "edit.loadingImages": "Ladataan kuvia...",
    "edit.noImages": "Sinulla ei ole vielä kuvia.",
    "edit.createFirst": "Luo ensimmäinen kuvasi",
    "edit.createNewImage": "✨ Luo uusi kuva",
    "edit.original": "Alkuperäinen",
    "edit.instructions": "Muokkausohjeet",
    "edit.prompt.placeholder": "✏️ Kuvaile kuinka muokata...",
    "edit.editImage": "🎨 Muokkaa kuvaa",
    "edit.editing": "Muokataan...",
    "edit.suggestions": "Ehdotukset:",
    "edit.loadingSuggestions": "Ladataan ehdotuksia...",
    "edit.editedImage": "Muokattu kuva",
    "edit.edit": "Muokkaus",
    "edit.editAgain": "🎨 Muokkaa uudelleen",
    "edit.viewGallery": "🖼️ Katso galleria",
    "edit.selectFromGallery": "🖼️ Valitse galleriasta",

    // Gallery page
    "gallery.title": "Galleriasi",
    "gallery.subtitle": "Katso ja hallinnoi kuviasi",
    "gallery.loadingImages": "Ladataan kuvia...",
    "gallery.noImages": "Ei vielä kuvia",
    "gallery.noImages.desc": "Luo ensimmäinen kuvasi nähdäksesi sen täällä",
    "gallery.createFirst": "Luo ensimmäinen kuvasi",
    "gallery.edit": "Muokkaa",
    "gallery.share": "Jaa",
    "gallery.delete": "Poista",
    "gallery.imageDetails": "Kuvan tiedot",
    "gallery.prompt": "Kehote",
    "gallery.description": "Kuvaus",
    "gallery.created": "Luotu",
    "gallery.close": "Sulje",
    "gallery.deleteConfirm": "Haluatko varmasti poistaa tämän kuvan?",
    "gallery.linkCopied": "Jakolinkki kopioitu leikepöydälle!",
    "gallery.copied": "Kopioitu!",

    // Gallery errors
    "gallery.loadError": "Gallerian lataaminen epäonnistui. Yritä uudelleen.",
    "gallery.deleteError": "Kuvan poistaminen epäonnistui. Yritä uudelleen.",

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
    "admin.stats.imagesByPassword": "Kuvat Salasanoittain",
    "admin.stats.imageCount": "Kuvamäärä",
    "admin.stats.noPasswordData": "Ei saatavilla salasanatietoja",
    "admin.passwords": "Salasanat",
    "admin.passwords.create": "Luo Uusi Salasana",
    "admin.passwords.password": "Salasana",
    "admin.passwords.validHours": "Voimassa (tuntia)",
    "admin.passwords.imageLimit": "Kuvaraja",
    "admin.passwords.suggestionLimit": "Ehdotusraja",
    "admin.passwords.expiresAt": "Vanhenee",
    "admin.passwords.status": "Tila",
    "admin.passwords.active": "Aktiivinen",
    "admin.passwords.expired": "Vanhentunut",
    "admin.passwords.noPasswords": "Ei salasanoja",
    "admin.passwords.noPasswords.desc": "Luo salasanoja antaaksesi käyttäjien käyttää alustaa",
    "admin.passwords.createButton": "Luo Salasana",
    "admin.passwords.creating": "Luodaan...",
    "admin.image": "Kuva",
    "admin.dateTime": "Päivämäärä & Aika",
    "admin.password": "Salasana",
    "admin.user": "Käyttäjä",
    "admin.actions": "Toiminnot",
    "admin.delete": "Poista",
    "admin.confirmDelete": "Haluatko varmasti poistaa tämän kuvan?",
    "admin.imageDeleted": "Kuva poistettu onnistuneesti",
    "admin.deleteError": "Kuvan poistaminen epäonnistui",

    // Admin - Moderation Tab
    "admin.moderation.tab": "Moderointi",
    "admin.moderation.failed": "Epäonnistuneet",
    "admin.moderation.guidelines.title": "Sisällön Moderointiohjeet",
    "admin.moderation.guidelines.usingDefault": "Käytetään oletusohjeet",
    "admin.moderation.guidelines.usingCustom": "Käytetään mukautettuja ohjeita",
    "admin.moderation.guidelines.unsavedChanges": "• Tallentamattomat muutokset",
    "admin.moderation.guidelines.resetToDefault": "Palauta Oletuksiin",
    "admin.moderation.guidelines.saveChanges": "Tallenna Muutokset",
    "admin.moderation.guidelines.saving": "Tallennetaan...",
    "admin.moderation.guidelines.editLabel": "Muokkaa alla olevia ohjeita. Jokaisen rivin tulisi alkaa viivalla (-) luettelomerkeille.",
    "admin.moderation.guidelines.placeholder": "Syötä moderointiohjeet...",
    "admin.moderation.guidelines.preview": "Esikatselu:",
    "admin.moderation.guidelines.howItWorks": "Kuinka se toimii",
    "admin.moderation.guidelines.description1": "• Tekoäly käyttää näitä ohjeita kuvien luonti- ja muokkauskehotteiden moderointiin.",
    "admin.moderation.guidelines.description2": "• Tekoäly arvioi jokaisen käyttäjän kehotteen näitä ohjeita vasten ennen käsittelyä.",
    "admin.moderation.guidelines.description3": "• Muutokset tulevat voimaan välittömästi kaikille uusille kuvapyynnöille.",
    "admin.moderation.guidelines.description4": "• Ohjeiden tulisi olla selkeitä, tarkkoja ja muotoiltuja luettelomerkeiksi.",
    "admin.moderation.failures.noFailures": "Ei Epäonnistuneita Moderointeja",
    "admin.moderation.failures.noFailuresDesc": "Kaikki kehotteet ovat läpäisseet sisällön moderointitarkistukset.",
    "admin.moderation.failures.title": "Epäonnistuneet Sisällön Moderointiyritykset",
    "admin.moderation.failures.subtitle": "Tarkastele tekoälyn moderointijärjestelmän hylkäämiä kehotteita (näytetään viimeiset 500)",
    "admin.moderation.failures.date": "Päivämäärä",
    "admin.moderation.failures.type": "Tyyppi",
    "admin.moderation.failures.prompt": "Kehote",
    "admin.moderation.failures.rejectionReason": "Hylkäyksen Syy",
    "admin.moderation.failures.typeEdit": "Muokkaus",
    "admin.moderation.failures.typeGenerate": "Luonti",

    // Admin - Password Management
    "admin.passwords.bypassWatchdog": "Ohita Valvonta",
    "admin.passwords.bypassWatchdog.label": "Ohita sisällön moderointi",
    "admin.passwords.bypassWatchdog.enabled": "Käytössä",
    "admin.passwords.bypassWatchdog.disabled": "Ei käytössä",
    "admin.passwords.actions": "Toiminnot",
    "admin.passwords.delete": "Poista",
    "admin.passwords.deleteConfirm": "Haluatko varmasti poistaa tämän salasanan? Tätä toimintoa ei voi peruuttaa.",
    "admin.passwords.deleteSuccess": "Salasana poistettu onnistuneesti!",
    "admin.passwords.deleteError": "Salasanan poistaminen epäonnistui",
    "admin.passwords.createSuccess": "Salasana luotu onnistuneesti!",
    "admin.passwords.createError": "Salasanan luominen epäonnistui",
    "admin.passwords.placeholder": "Syötä salasana",

    // Admin - Guidelines alerts
    "admin.guidelines.emptyError": "Ohjeet eivät voi olla tyhjät",
    "admin.guidelines.saveSuccess": "Ohjeet tallennettu onnistuneesti!",
    "admin.guidelines.saveError": "Ohjeiden tallennus epäonnistui",
    "admin.guidelines.resetConfirm": "Haluatko varmasti palauttaa ohjeet oletusarvoihin?",
    "admin.guidelines.resetSuccess": "Ohjeet palautettu oletuksiin onnistuneesti!",
    "admin.guidelines.resetError": "Ohjeiden palautus epäonnistui",

    // Common
    "common.loading": "Ladataan...",
    "common.retry": "Yritä uudelleen",
    "common.error": "Käyttäjäistunnon alustus epäonnistui",

    // Errors
    "error.generate": "Kuvan luominen epäonnistui.\nYritä uudelleen eri kehotteella!",
    "error.edit": "Kuvan muokkaus epäonnistui.\nYritä uudelleen eri kehotteella!",
    "error.rateLimit": "Liikaa pyyntöjä. Yritä hetken kuluttua uudelleen.",
    "error.invalidPassword": "Virheellinen tai vanhentunut salasana",

    // Password dialog
    "password.title": "Syötä Salasana",
    "password.description": "Tarvitset salasanan luodaksesi kuvia ja ehdotuksia",
    "password.placeholder": "Syötä salasana",
    "password.validate": "Tarkista",
    "password.validating": "Tarkistetaan...",
    "password.close": "Sulje",
    "password.valid": "Salasana kelvollinen, aika aloittaa luominen!",
    "password.invalid": "Virheellinen tai vanhentunut salasana",
    "password.required": "Salasana vaaditaan tähän toimintoon",
    "password.getStarted": "🚀 Aloitetaan!",
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
    "create.resultTitle": "Image Created",
    "create.resultSubtitle": "Did it turn out great?",
    "create.prompt.placeholder": "Describe your image... (e.g., 'A sunset over mountains with flying birds')",
    "create.generate": "Generate Image",
    "create.generating": "Generating...",
    "create.needInspiration": "Need inspiration?",
    "create.getIdeas": "Get Ideas",
    "create.loading": "Loading...",
    "create.clickSuggestion": "Click a suggestion to use it:",
    "create.tapIdea": "💡 Tap an idea to use it",
    "create.generatedImage": "Generated Image",
    "create.prompt": "Prompt",
    "create.description": "Description",
    "create.createAnother": "Create Another",
    "create.editThisImage": "Edit This Image",
    "create.describeYourImage": "Describe your image",

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
    "gallery.share": "Share",
    "gallery.delete": "Delete",
    "gallery.imageDetails": "Image Details",
    "gallery.prompt": "Prompt",
    "gallery.description": "Description",
    "gallery.created": "Created",
    "gallery.close": "Close",
    "gallery.deleteConfirm": "Are you sure you want to delete this image?",
    "gallery.linkCopied": "Share link copied to clipboard!",
    "gallery.copied": "Copied!",

    // Gallery errors
    "gallery.loadError": "Failed to load gallery. Please try again.",
    "gallery.deleteError": "Failed to delete image. Please try again.",

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
    "admin.stats.imagesByPassword": "Images by Password",
    "admin.stats.imageCount": "Image Count",
    "admin.stats.noPasswordData": "No password data available",
    "admin.passwords": "Passwords",
    "admin.passwords.create": "Create New Password",
    "admin.passwords.password": "Password",
    "admin.passwords.validHours": "Valid Hours",
    "admin.passwords.imageLimit": "Image Limit",
    "admin.passwords.suggestionLimit": "Suggestion Limit",
    "admin.passwords.expiresAt": "Expires At",
    "admin.passwords.status": "Status",
    "admin.passwords.active": "Active",
    "admin.passwords.expired": "Expired",
    "admin.passwords.noPasswords": "No passwords",
    "admin.passwords.noPasswords.desc": "Create passwords to allow users to access the platform",
    "admin.passwords.createButton": "Create Password",
    "admin.passwords.creating": "Creating...",
    "admin.image": "Image",
    "admin.dateTime": "Date & Time",
    "admin.password": "Password",
    "admin.user": "User",
    "admin.actions": "Actions",
    "admin.delete": "Delete",
    "admin.confirmDelete": "Are you sure you want to delete this image?",
    "admin.imageDeleted": "Image deleted successfully",
    "admin.deleteError": "Failed to delete image",

    // Admin - Moderation Tab
    "admin.moderation.tab": "Moderation",
    "admin.moderation.failed": "Failed",
    "admin.moderation.guidelines.title": "Content Moderation Guidelines",
    "admin.moderation.guidelines.usingDefault": "Using default guidelines",
    "admin.moderation.guidelines.usingCustom": "Using custom guidelines",
    "admin.moderation.guidelines.unsavedChanges": "• Unsaved changes",
    "admin.moderation.guidelines.resetToDefault": "Reset to Default",
    "admin.moderation.guidelines.saveChanges": "Save Changes",
    "admin.moderation.guidelines.saving": "Saving...",
    "admin.moderation.guidelines.editLabel": "Edit the guidelines below. Each line should start with a dash (-) for bullet points.",
    "admin.moderation.guidelines.placeholder": "Enter moderation guidelines...",
    "admin.moderation.guidelines.preview": "Preview:",
    "admin.moderation.guidelines.howItWorks": "How it works",
    "admin.moderation.guidelines.description1": "• These guidelines are used by the AI to moderate image generation and editing prompts.",
    "admin.moderation.guidelines.description2": "• The AI evaluates each user prompt against these guidelines before processing.",
    "admin.moderation.guidelines.description3": "• Changes take effect immediately for all new image requests.",
    "admin.moderation.guidelines.description4": "• Guidelines should be clear, specific, and formatted as bullet points.",
    "admin.moderation.failures.noFailures": "No Failed Moderations",
    "admin.moderation.failures.noFailuresDesc": "All prompts have passed content moderation checks.",
    "admin.moderation.failures.title": "Failed Content Moderation Attempts",
    "admin.moderation.failures.subtitle": "Review prompts that were rejected by the AI moderation system (showing last 500)",
    "admin.moderation.failures.date": "Date",
    "admin.moderation.failures.type": "Type",
    "admin.moderation.failures.prompt": "Prompt",
    "admin.moderation.failures.rejectionReason": "Rejection Reason",
    "admin.moderation.failures.typeEdit": "Edit",
    "admin.moderation.failures.typeGenerate": "Generate",

    // Admin - Password Management
    "admin.passwords.bypassWatchdog": "Bypass Watchdog",
    "admin.passwords.bypassWatchdog.label": "Skip content moderation",
    "admin.passwords.bypassWatchdog.enabled": "Enabled",
    "admin.passwords.bypassWatchdog.disabled": "Disabled",
    "admin.passwords.actions": "Actions",
    "admin.passwords.delete": "Delete",
    "admin.passwords.deleteConfirm": "Are you sure you want to delete this password? This action cannot be undone.",
    "admin.passwords.deleteSuccess": "Password deleted successfully!",
    "admin.passwords.deleteError": "Failed to delete password",
    "admin.passwords.createSuccess": "Password created successfully!",
    "admin.passwords.createError": "Failed to create password",
    "admin.passwords.placeholder": "Enter password",

    // Admin - Guidelines alerts
    "admin.guidelines.emptyError": "Guidelines cannot be empty",
    "admin.guidelines.saveSuccess": "Guidelines saved successfully!",
    "admin.guidelines.saveError": "Failed to save guidelines",
    "admin.guidelines.resetConfirm": "Are you sure you want to reset the guidelines to default?",
    "admin.guidelines.resetSuccess": "Guidelines reset to default successfully!",
    "admin.guidelines.resetError": "Failed to reset guidelines",

    // Common
    "common.loading": "Loading...",
    "common.retry": "Retry",
    "common.error": "Failed to initialize user session",

    // Errors
    "error.generate": "Failed to generate image. Please try again with a different prompt!",
    "error.edit": "Failed to edit image. Please try again with a different prompt!",
    "error.rateLimit": "Too many requests. Please try again in a moment.",
    "error.invalidPassword": "Invalid or expired password",

    // Password dialog
    "password.title": "Enter Password",
    "password.description": "You need a password to create images and suggestions",
    "password.placeholder": "Enter password",
    "password.validate": "Validate",
    "password.validating": "Validating...",
    "password.close": "Close",
    "password.valid": "Password valid, time to start creating!",
    "password.invalid": "Invalid or expired password",
    "password.required": "Password required for this action",
    "password.getStarted": "🚀 Let's Get Started!",
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("fi"); // Finnish is default

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale;
    if (savedLocale && (savedLocale === "fi" || savedLocale === "en")) {
      setLocale(savedLocale);
    }
  }, []);

  // Save locale to localStorage when it changes
  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: string): string => {
    return translations[locale][key] || key;
  };

  return <LocaleContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

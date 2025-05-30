import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationNB from './locales/nb/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  nb: {
    translation: translationNB,
  },
  // Add more languages here
};

i18n
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Use 'en' if detected language is not available
    debug: process.env.NODE_ENV === 'development', // Logs i18next activity to console in dev mode
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    // Optional: configure language detection order and caching
    // detection: {
    //   order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
    //   caches: ['localStorage'],
    // },
  });

export default i18n;

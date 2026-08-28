import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
};

// English only: the app deliberately ships a single language, so no browser
// language detection — a Norwegian browser must not switch parts of the UI.
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

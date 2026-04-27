import i18next from 'i18next';
import en from './locales/en-US/theiascientific-jupyter-datasource.json';

i18next
  .init({
    returnEmptyString: false, // allows empty string as valid translation
    // lng: 'en-US', // or add a language detector to detect the preferred language of your user
    fallbackLng: 'en-US',
    defaultNS: 'theiascientific-jupyter-datasource',
    resources: {
      'en-US': { 'theiascientific-jupyter-datasource': en },
    },
  })

export default i18next;

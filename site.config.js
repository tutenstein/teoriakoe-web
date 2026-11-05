// Site-wide settings. Values marked TODO are filled in once the owner has them.
export default {
  name: 'Teoriakoe FI',
  slogan: 'Harjoittele ajokortin teoriakokeeseen',
  domain: 'teoriakoefi.fi',
  origin: 'https://teoriakoefi.fi',
  lang: 'fi',
  locale: 'fi_FI',
  email: 'metinozetle@gmail.com',
  // Publisher as named in the app's published privacy policy; also the data
  // controller on /tietosuoja/.
  publisher: 'Salih Enes Metin',
  appStore: {
    id: '6821930495',
    // TODO: replace with the App Store Connect campaign link (ct=web_teoriakoefi).
    url: 'https://apps.apple.com/fi/app/id6821930495'
  },
  play: {
    package: 'fi.roadsigns.finnish_road_signs'
  },
  // TODO: unlisted YouTube video id for the home page; null hides the video block.
  youtubeId: null,
  // Read-only source for `npm run sync`. Never written to.
  appRepo: '../traffic-quiz-app/finnish_road_signs'
};

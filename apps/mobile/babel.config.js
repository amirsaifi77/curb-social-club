module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Unistyles 3 needs its Babel plugin so components under app/ and src/
      // subscribe to theme updates without re-render wiring.
      ['react-native-unistyles/plugin', { root: 'src', autoProcessPaths: ['app'] }],
    ],
  };
};

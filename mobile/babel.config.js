module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@modules': './src/modules',
          '@services': './src/services',
          '@models': './src/models',
          '@screens': './src/screens',
          '@components': './src/components',
          '@navigation': './src/navigation',
          '@types': './src/types',
          '@utils': './src/utils',
        },
      },
    ],
  ],
};

module.exports = {
  // Ignoring files that are not needed in the final extension
  ignoreFiles: [
    'package.json',
    'package-lock.json',
    'node_modules',
    '.git',
    '.github',
    '.gitignore',
    'web-ext.config.js',
    'README.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'LICENSE'
  ],
  // Setting the build output directory
  artifactsDir: 'web-ext-artifacts',
  // Setting the source directory (current directory)
  sourceDir: '.',
  // Setting the build options
  build: {
    overwriteDest: true
  },
  // Setting the sign options
  sign: {
    channel: 'listed'
  }
};
// The app reuses the pure modules in ../src/lib (dates, categories, filters…), so Metro watches the repo root.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, 'src/lib')];
// The shared modules import no packages, so everything resolves from mobile/node_modules.
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];

module.exports = config;

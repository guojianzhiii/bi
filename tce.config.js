module.exports = {
  build: {
    type: 'node',
    nodeVersion: '20',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    outputDir: 'dist',
  },
  deploy: {
    static: true,
    historyApiFallback: true,
  },
};

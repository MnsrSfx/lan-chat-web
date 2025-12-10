const { execSync } = require('child_process');

console.log('Building server with CommonJS format...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outfile=server_dist/index.js', {
  stdio: 'inherit'
});
console.log('Server build complete!');

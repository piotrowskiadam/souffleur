const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// Helper to copy files and directories recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function runBuild() {
  console.log("Starting extension build...");

  // 1. Ensure dist output folders exist
  fs.mkdirSync("dist/chrome/sidebar", { recursive: true });
  fs.mkdirSync("dist/firefox/sidebar", { recursive: true });
  fs.mkdirSync("dist/chrome/icons", { recursive: true });
  fs.mkdirSync("dist/firefox/icons", { recursive: true });

  // 2. Copy static files
  fs.copyFileSync("manifest.chrome.json", "dist/chrome/manifest.json");
  fs.copyFileSync("manifest.firefox.json", "dist/firefox/manifest.json");
  
  fs.copyFileSync("src/sidebar/sidebar.html", "dist/chrome/sidebar/sidebar.html");
  fs.copyFileSync("src/sidebar/sidebar.html", "dist/firefox/sidebar/sidebar.html");
  fs.copyFileSync("src/sidebar/sidebar.css", "dist/chrome/sidebar/sidebar.css");
  fs.copyFileSync("src/sidebar/sidebar.css", "dist/firefox/sidebar/sidebar.css");

  copyDir("src/icons", "dist/chrome/icons");
  copyDir("src/icons", "dist/firefox/icons");

  console.log("Static files copied successfully.");

  // 3. Compile JS files using esbuild
  const targets = ['chrome', 'firefox'];
  
  for (const target of targets) {
    console.log(`Bundling JS for ${target}...`);
    
    // Build background.js
    await esbuild.build({
      entryPoints: ['src/background.js'],
      outfile: `dist/${target}/background.js`,
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['chrome100', 'firefox100'],
    });

    // Build content.js
    await esbuild.build({
      entryPoints: ['src/content.js'],
      outfile: `dist/${target}/content.js`,
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['chrome100', 'firefox100'],
    });

    // Build sidebar.js
    await esbuild.build({
      entryPoints: ['src/sidebar/sidebar.js'],
      outfile: `dist/${target}/sidebar/sidebar.js`,
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['chrome100', 'firefox100'],
    });
  }

  console.log("Build complete! Outputs generated in dist/chrome/ and dist/firefox/");
}

runBuild().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

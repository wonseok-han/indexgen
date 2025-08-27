#!/usr/bin/env node

/**
 * indexgen-cli CLI 실행 파일
 * src의 TypeScript 모듈을 dynamic import로 로드합니다.
 * --watch 옵션으로 감시 모드 실행 가능
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if dist folder exists
 */
function checkDistExists() {
  const distPath = path.resolve(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ Package is not properly installed.');
    console.error('');
    console.error('💡 Solutions:');
    console.error(
      '   1. Try reinstalling the package: npm install <package-name>'
    );
    console.error('   2. Delete node_modules and reinstall');
    console.error('   3. Package might be corrupted, try clearing cache');
    console.error('');
    console.error('📝 Command examples:');
    console.error('   npm install <package-name>');
    console.error('   # or');
    console.error('   npm cache clean --force && npm install <package-name>');
    return false;
  }

  return true;
}

async function main() {
  try {
    // Check if dist folder exists
    if (!checkDistExists()) {
      process.exit(1);
    }

    // Load compiled indexgen-cli module from dist using dynamic import
    const { runCli } = await import('../dist/index.js');

    // Execute CLI
    runCli();
  } catch (error) {
    console.error('❌ Error running indexgencli:', error.message);
    console.error('');
    console.error('💡 Additional solutions:');
    console.error(
      '   1. Try reinstalling the package: npm install <package-name>'
    );
    console.error('   2. Check if Node.js version is compatible');
    console.error('   3. Package might be corrupted, try clearing cache');
    console.error('');
    console.error('📝 Command examples:');
    console.error('   npm cache clean --force && npm install <package-name>');
    console.error('   # or');
    console.error('   rm -rf node_modules && npm install');
    process.exit(1);
  }
}

// 메인 함수 실행
if (require.main === module) {
  main();
}

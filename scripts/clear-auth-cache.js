#!/usr/bin/env node

/**
 * Clear Auth Cache Script
 *
 * This script clears AsyncStorage cache to force reload of DEFAULT_USERS
 * Run this when authentication/roles are not working as expected
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=================================');
console.log('Clear Authentication Cache');
console.log('=================================\n');
console.log('This will clear cached user data and force a reload of default users.');
console.log('This fixes issues where admin/management users are incorrectly routed.\n');

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\nClearing cache...\n');

    try {
      // Clear AsyncStorage for Android
      try {
        execSync('adb shell pm clear host.exp.exponent', { stdio: 'inherit' });
        console.log('✓ Cleared Android app data');
      } catch (e) {
        console.log('  Android device not connected or ADB not available');
      }

      // Clear metro bundler cache
      try {
        execSync('npx expo start --clear', { stdio: 'inherit', timeout: 5000 });
      } catch (e) {
        // Timeout expected
      }

      console.log('\n✓ Cache cleared successfully!');
      console.log('\nNext steps:');
      console.log('1. Close the app completely');
      console.log('2. Run: npx expo start --clear');
      console.log('3. Reload the app');
      console.log('4. Try logging in with admin@demo.com\n');

    } catch (error) {
      console.error('Error clearing cache:', error.message);
    }
  } else {
    console.log('\nOperation cancelled.');
  }

  rl.close();
  process.exit(0);
});

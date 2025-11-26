#!/usr/bin/env node
/**
 * Wrapper script to fix Windows chcp output issue with Expo autolinking.
 * This strips any non-JSON content before the actual JSON output.
 */

const { execSync } = require('child_process');

// Get the original command arguments (skip node and this script)
const args = process.argv.slice(2);

try {
  // Run the original expo-modules-autolinking command
  const result = execSync(`npx expo-modules-autolinking ${args.join(' ')}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });

  // Find the start of JSON (first '{' or '[')
  const jsonStartBrace = result.indexOf('{');
  const jsonStartBracket = result.indexOf('[');

  let jsonStart = -1;
  if (jsonStartBrace !== -1 && jsonStartBracket !== -1) {
    jsonStart = Math.min(jsonStartBrace, jsonStartBracket);
  } else if (jsonStartBrace !== -1) {
    jsonStart = jsonStartBrace;
  } else if (jsonStartBracket !== -1) {
    jsonStart = jsonStartBracket;
  }

  if (jsonStart !== -1) {
    // Output only the JSON part
    console.log(result.substring(jsonStart));
  } else {
    // No JSON found, output as-is
    console.log(result);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Welcome to AI Code Editor
// This module provides a simple greeting function.
// It can be imported and used in other parts of the application.

/**
 * Logs a greeting message to the console.
 *
 * @param {string} [msg="Hello, World!"] - The message to display.
 */
export const hello = (msg = "Hello, World!") => {
  console.log(msg);
};

// Example usage when running this file directly
if (import.meta.url === process.argv[1]) {
  // Node.js execution: prints the default greeting
  hello();
}
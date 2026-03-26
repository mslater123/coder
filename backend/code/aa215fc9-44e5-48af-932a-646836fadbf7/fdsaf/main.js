"use strict";

/**
 * Prints a greeting message to the console.
 *
 * @param {string} [msg="Hello, World!"] - The message to display.
 * @returns {void}
 * @throws {TypeError} If `msg` is not a string.
 */
export const hello = (msg = "Hello, World!") => {
  if (typeof msg !== "string") {
    throw new TypeError("Message must be a string")
  }
  console.log(msg)
}

// Export as default for convenience when importing the module elsewhere
export default hello

/**
 * When this file is executed directly via Node.js, run `hello`.
 * Supports both absolute and relative invocation styles.
 */
if (import.meta?.url && process.argv[1]) {
  // Convert the script path to a file URL for reliable comparison
  const scriptUrl = new URL(process.argv[1], "file://")
  if (scriptUrl.href === import.meta.url) {
    // Use the first CLI argument as a custom message, if provided
    const userMsg = process.argv[2]
    try {
      hello(userMsg)
    } catch (e) {
      console.error(e.message)
      process.exit(1)
    }
  }
}
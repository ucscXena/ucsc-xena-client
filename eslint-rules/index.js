
// Helper function to check if a string is an 8-digit hex color
function isEightDigitHexColor(value) {
  // Matches # followed by exactly 8 hex digits (case-insensitive)
  return /^#[0-9A-Fa-f]{8}$/.test(value);
}

// Helper function to convert 8-digit hex color to rgba format
function hexToRgba(hex) {
  // Ensure hex is 9 chars (# + 8 digits)
  if (hex.length !== 9 || hex[0] !== '#') {return hex;}

  // Extract components
  const r = parseInt(hex.slice(1, 3), 16); // Red
  const g = parseInt(hex.slice(3, 5), 16); // Green
  const b = parseInt(hex.slice(5, 7), 16); // Blue
  const a = parseInt(hex.slice(7, 9), 16); // Alpha (0-255)

  // Convert alpha from 0-255 to 0-1 range (rounded to 2 decimal places)
  const alpha = (a / 255).toFixed(2);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

exports.rules = {
  'no-hex-color-alpha': function (context) {
    return {
      // Check string literals
      Literal: (node) => {
        // Only process string literals
        if (typeof node.value !== 'string') {return;}

        const value = node.value;

        // Check if it's an 8-digit hex color
        if (isEightDigitHexColor(value)) {
          context.report({
            node,
            message: 'Avoid 8-digit hex colors with alpha (e.g., "#ff000020"). Use rgba() instead for pdfkit compatibility.',
            fix: (fixer) => {
              // Replace the hex string with its rgba equivalent
              const rgbaValue = hexToRgba(value);
              return fixer.replaceText(node, `'${rgbaValue}'`);
            }
          });
        }
      }
    };
  }
};

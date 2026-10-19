import js from "@eslint/js";
import css from "@eslint/css";
import html from "@html-eslint/eslint-plugin";
import htmlParser from "@html-eslint/parser";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", ".claude/", ".agents/"] },

  // Build config and scripts run in Node.
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },

  // Pages: broken markup and accessibility basics. The {{site.x}} and <!-- ... --> placeholders are plain text to the parser.
  {
    files: ["**/*.html"],
    plugins: { "@html-eslint": html },
    languageOptions: { parser: htmlParser },
    rules: {
      "@html-eslint/require-doctype": "error",
      "@html-eslint/require-lang": "error",
      "@html-eslint/require-title": "error",
      "@html-eslint/require-meta-viewport": "error",
      "@html-eslint/require-img-alt": "error",
      "@html-eslint/require-open-graph-protocol": "off",
      "@html-eslint/no-duplicate-id": "error",
      "@html-eslint/no-duplicate-attrs": "error",
      "@html-eslint/no-duplicate-class": "error",
      "@html-eslint/no-target-blank": "error",
      "@html-eslint/no-skip-heading-levels": "error",
      "@html-eslint/require-button-type": "error",
      "@html-eslint/require-closing-tags": "error",
    },
  },

  // Styles: invalid properties and unknown at-rules.
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    rules: {
      "css/no-duplicate-imports": "error",
      "css/no-invalid-at-rules": "error",
      // --tint, --share and --delay are set inline in the pages.
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],
      "css/no-empty-blocks": "error",
    },
  },
];

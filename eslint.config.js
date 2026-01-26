import globals from "globals";
import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginHtml from "eslint-plugin-html";

/**
 * ESLint Configuration for ARTexplorer (Geometry Explorer)
 * Standalone app - no longer part of OBJECTIVE meta-app
 *
 * File structure:
 *   modules/     - Core RT modules (rt-*.js)
 *   demos/       - Educational demo files (rt-*-demo.js)
 *   index.html   - Main app entry
 */

export default [
  // Global ignores configuration
  {
    ignores: [
      "node_modules/**",
      "ARCHIVE/**",
      "docs/**",
      "test/**",
    ],
  },

  // Base ESLint recommended configuration
  js.configs.recommended,

  // Configuration for HTML files
  {
    files: ["**/*.html"],
    plugins: {
      html: eslintPluginHtml,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      "html/indent": "auto",
      "html/report-bad-indent": "warn",
      "html/javascript-mime-types": ["text/javascript", "application/javascript"],
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          caughtErrors: "all",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Configuration for JavaScript files
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,

        // ARTexplorer globals (THREE.js + RT library)
        THREE: "readonly",
        RT: "readonly",
        Quadray: "readonly",
        OrbitControls: "readonly",

        // Performance monitoring
        PerformanceClock: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          caughtErrors: "all",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // ESLint plugin for Prettier integration (must be last)
  eslintPluginPrettierRecommended,
];

import { resolve } from "node:path";

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "next/core-web-vitals",
    "next/typescript",
    "prettier",
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};

export default config;

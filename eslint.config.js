const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: {},
});

module.exports = [
    ...compat.extends("./.eslintrc"), // Update filename if your old config was .eslintrc.json or similar
];

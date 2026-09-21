/**
 * Stylelint configuration.
 *
 * @file Manages the configuration settings for Stylelint. Based on the `@wordpress/stylelint-config` package.
 * @author CassidyDC <info@cassidydc.com>
 * @see https://stylelint.io/user-guide/configure/
 * @type {import('stylelint').Config}
 * @version 1.0.0
 */

export default {
  extends: [
    '@cassidydc/stylelint-config-w3c-order',
    '@stylistic/stylelint-config',
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-plugin-logical-css/configs/recommended',
  ],
  plugins: [
    'stylelint-declaration-block-no-ignored-properties',
    'stylelint-high-performance-animation',
    'stylelint-plugin-logical-css',
  ],
  ignoreFiles: ['**/*.min.css', '**/build/**', '**/vendor/**'],
  rules: {
    '@stylistic/at-rule-name-space-after': 'always',
    '@stylistic/block-closing-brace-newline-before': 'always',
    '@stylistic/block-opening-brace-newline-after': 'always',
    '@stylistic/block-opening-brace-space-before': 'always',
    '@stylistic/declaration-block-semicolon-newline-after': 'always',
    '@stylistic/indentation': [
      'tab',
      {
        ignore: [
          'inside-parens',
        ],
      },
    ],
    'alpha-value-notation': 'number',
    'color-named': 'never',
    'custom-property-pattern': [
      '^([a-z][a-z0-9]*)(--?[a-z0-9]+)*$',
      {
        message: 'Expected custom property name to be kebab-case (double dashes are allowed)',
      },
    ],
    'declaration-empty-line-before': ['never', { except: ['after-block'] }],
    'declaration-property-value-keyword-no-deprecated': true,
    'font-family-no-missing-generic-family-keyword': [
      true,
      {
        ignoreFontFamilies: [
          'dashicons',
          'FontAwesome',
        ],
      },
    ],
    'font-weight-notation': 'numeric',
    'function-linear-gradient-no-nonstandard-direction': true,
    'number-max-precision': 5,
    'plugin/declaration-block-no-ignored-properties': true,
    'plugin/no-low-performance-animation-properties': [
      true,
      {
        ignoreProperties: [
          'all',
          'background-color',
          'border-color',
          'color',
        ],
      },
    ],
    'rule-empty-line-before': ['always', { ignore: ['first-nested'] }],
    'scss/selector-no-redundant-nesting-selector': true,

    // TURN OFF RULES
    '@stylistic/declaration-colon-newline-after': null,
    '@stylistic/max-line-length': null,
    'comment-empty-line-before': null,
    'no-descending-specificity': null,
    'scss/operator-no-newline-after': null,
    'selector-class-pattern': null,
    'selector-id-pattern': null,
  },
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
};

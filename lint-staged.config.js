const CODE_PATTERN = '**/*.{js,mjs,cjs,ts,tsx,vue}';

export default {
  [CODE_PATTERN]: ['eslint --fix --no-warn-ignored']
};

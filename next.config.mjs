const pagesExport = process.env.SKILLFORGE_PAGES_BUILD === '1';
const basePath = pagesExport ? (process.env.SKILLFORGE_BASE_PATH ?? '') : '';

const config = {
  devIndicators: false,
  agentRules: false,
  ...(pagesExport ? { output: 'export', basePath } : {}),
};

export default config;

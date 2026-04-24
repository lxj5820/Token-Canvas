export const EnvConfig = {
    // API Key 不再从环境变量编译进前端，由用户在设置面板运行时输入
    DEFAULT_API_KEY: '',
    DEFAULT_BASE_URL: process.env.GEMINI_API_KEY ? 'https://newapi.asia' : 'https://newapi.asia',
};
const config = [
  {
    url: 'http://47.104.180.36:8001/swagger/doc.json',
    authorizationToken: 'Basic bWM6bWM4OA==',
    templates: './api-templates',
    output: './src/request',
    filterPathname: (pathname: string) => {
      return pathname.startsWith('/api/v1');
    },
  },
  {
    url: 'http://47.104.180.36:8001/api/pro/swagger/doc.json',
    authorizationToken: 'Basic bWM6bWM4OA==',
    templates: './api-templates',
    output: './src/request/pro',
  },
];

export default config;

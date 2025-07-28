const config = {
  url: 'http://10.10.7.43:8000/swagger/doc.json',
  authorizationToken: 'Basic bWM6bWM4OA==',
  templates: './api-templates',
  output: './src/request',
  filterPathname: (pathname: string) => {
    return pathname.startsWith('/api/v1');
  },
};

export default config;

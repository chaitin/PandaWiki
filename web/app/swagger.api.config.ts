import dotenv from 'dotenv';

dotenv.config({
  path: '.env.local',
});

const config = [
  {
    url: `${process.env.SWAGGER_BASE_URL}/swagger/doc.json`,
    authorizationToken: process.env.SWAGGER_AUTH_TOKEN,
    templates: './api-templates',
    output: './src/request',
    filterPathname: (pathname: string) => {
      return pathname.startsWith('/share/v1');
    },
  },
  {
    url: `${process.env.SWAGGER_BASE_URL}/api/pro/swagger/doc.json`,
    authorizationToken: process.env.SWAGGER_AUTH_TOKEN,
    templates: './api-templates',
    output: './src/request/pro',
  },
];

export default config;

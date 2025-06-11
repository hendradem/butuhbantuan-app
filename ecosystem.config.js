module.exports = {
  apps: [
    {
      name: 'next-app',
      cwd: 'apps/next-app',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'admin',
      cwd: 'apps/admin',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
    {
      name: 'backend',
      cwd: 'apps/backend',
      script: './backend',
      env: {
        ENV: 'production',
        PORT: 8080,
      },
      env_development: {
        ENV: 'development',
        PORT: 8080,
      },
    },
  ],
};

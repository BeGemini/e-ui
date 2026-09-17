const path = require('path');

module.exports = {
  apps: [
    {
      name: 'e-ui',
      cwd: path.resolve(__dirname),
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志路径，可按需修改
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 优雅重启
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};

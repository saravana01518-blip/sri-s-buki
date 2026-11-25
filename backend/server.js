const config = require('./config/env');
const { connectDatabase } = require('./config/db');
const { createApp } = require('./app');

async function startServer() {
  config.validateConfig();
  await connectDatabase(config.mongoUri);

  const app = createApp();
  app.listen(config.port, () => {
    console.log(
      `[server] Buki Sage backend listening on http://localhost:${config.port} (mockMode=${config.sageMockMode}, bukiUrl=${config.bukiUrl})`
    );
  });
}

startServer().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

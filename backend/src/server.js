import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';
import './models/index.js';

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
// Try different paths for the compiled app
let createApp;
try {
  createApp = require('./dist/src/app').createApp;
} catch (e) {
  try {
    createApp = require('./dist/app').createApp;
  } catch (e2) {
    console.error('Cannot find compiled app:', e.message, e2.message);
    process.exit(1);
  }
}

const app = createApp();
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
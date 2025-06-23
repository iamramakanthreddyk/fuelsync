const { createApp } = require('./dist/src/app');

const app = createApp();
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
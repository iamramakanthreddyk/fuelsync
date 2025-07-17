const app = require('./dist/src/app.js').default;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));

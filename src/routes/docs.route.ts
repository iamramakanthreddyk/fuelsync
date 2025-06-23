import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../docs/swagger.js';

const router = Router();

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
router.get('/swagger.json', (_req, res) => {
  res.json(swaggerSpec);
});

export default router;

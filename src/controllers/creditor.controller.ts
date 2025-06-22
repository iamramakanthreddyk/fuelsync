import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  createCreditor,
  listCreditors,
  updateCreditor,
  markCreditorInactive,
  createCreditPayment,
  listCreditPayments,
} from '../services/creditor.service';
import {
  validateCreateCreditor,
  validateUpdateCreditor,
  validateCreatePayment,
  parsePaymentQuery,
} from '../validators/creditor.validator';

export function createCreditorHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreateCreditor(req.body);
        const id = await createCreditor(db, tenantId, data);
        res.status(201).json({ id });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
      }
      const creditors = await listCreditors(db, tenantId);
      res.json({ creditors });
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateUpdateCreditor(req.body);
        await updateCreditor(db, tenantId, req.params.id, data);
        res.json({ status: 'ok' });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        await markCreditorInactive(db, tenantId, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    createPayment: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreatePayment(req.body);
        const id = await createCreditPayment(db, user.tenantId, data, user.userId);
        res.status(201).json({ id });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    listPayments: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const query = parsePaymentQuery(req.query);
        const payments = await listCreditPayments(db, tenantId, query);
        res.json({ payments });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
  };
}

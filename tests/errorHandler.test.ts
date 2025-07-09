import { errorHandler } from '../src/middlewares/errorHandler';
import { Request, Response } from 'express';

describe('errorHandler middleware', () => {
  test('formats error response correctly', () => {
    const sendMock = jest.fn();
    const statusMock = jest.fn(() => ({ json: sendMock }));
    const res = { status: statusMock } as unknown as Response;
    const err = { status: 400, code: 'TEST', message: 'msg' };

    errorHandler(err, {} as Request, res, () => {});

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(sendMock).toHaveBeenCalledWith({ status: 'error', code: 'TEST', message: 'msg' });
  });
});

export function successResponse(res: import('express').Response, data: any, status = 200) {
  return res.status(status).json({ data });
}

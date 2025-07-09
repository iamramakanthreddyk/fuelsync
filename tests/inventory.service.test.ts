import * as inventoryService from '../src/services/inventory.service';

jest.mock('../src/utils/parseDb', () => ({
  parseRows: jest.fn((rows: any) => rows),
  parseRow: jest.fn((row: any) => row)
}));

describe('inventory.service.updateInventory', () => {
  test('creates alert when stock below minimum', async () => {
    const db = { query: jest.fn() } as any;
    db.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ current_stock: 4, minimum_level: 5 }] })
      .mockResolvedValueOnce(undefined);

    await inventoryService.updateInventory(db, 't1', 's1', 'diesel', 4);

    expect(db.query).toHaveBeenCalledTimes(3);
    expect((db.query as jest.Mock).mock.calls[2][0]).toContain('INSERT INTO public.alerts');
  });
});

describe('inventory.service.getInventory', () => {
  test('filters by station id', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [{ id: '1' }] }) } as any;
    await inventoryService.getInventory(db, 't1', 's1');
    expect(db.query.mock.calls[0][0]).toContain('station_id');
    expect(db.query.mock.calls[0][1]).toEqual(['t1', 's1']);
  });
});

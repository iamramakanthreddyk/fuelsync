export interface TenantInput {
  name: string;
  schemaName: string;
  plan: string;
  ownerEmail?: string;
  ownerPassword?: string;
}

export function validateTenantInput(data: any): TenantInput {
  const { name, schemaName, plan, ownerEmail, ownerPassword } = data || {};
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tenant name');
  }
  if (!schemaName || typeof schemaName !== 'string') {
    throw new Error('Invalid schema name');
  }
  if (!plan || typeof plan !== 'string') {
    throw new Error('Invalid plan');
  }
  if ((ownerEmail && typeof ownerEmail !== 'string') || (ownerPassword && typeof ownerPassword !== 'string')) {
    throw new Error('Invalid owner credentials');
  }
  return { name, schemaName, plan, ownerEmail, ownerPassword };
}

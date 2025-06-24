export interface TenantInput {
  name: string;
  planId: string;
}

export function validateTenantInput(data: any): TenantInput {
  const { name, planId } = data || {};
  
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tenant name');
  }
  
  if (!planId || typeof planId !== 'string') {
    throw new Error('Invalid plan ID');
  }
  
  return { name, planId };
}

export interface TenantInput {
  name: string;
  schemaName: string;
  plan: string;
  ownerEmail?: string;
  ownerPassword?: string;
}

export function validateTenantInput(data: any): TenantInput {
  const { name, schema, schemaName, plan, email, ownerEmail, password, ownerPassword } = data || {};
  
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tenant name');
  }
  
  // Accept both 'schema' and 'schemaName' from frontend
  const finalSchemaName = schema || schemaName;
  if (!finalSchemaName || typeof finalSchemaName !== 'string') {
    throw new Error('Invalid schema name');
  }
  
  // Validate schema name format (lowercase, alphanumeric, underscores)
  if (!/^[a-z0-9_]+$/.test(finalSchemaName)) {
    throw new Error('Schema name must be lowercase letters, numbers, and underscores only');
  }
  
  if (!plan || typeof plan !== 'string') {
    throw new Error('Invalid plan');
  }
  
  // Accept both 'email' and 'ownerEmail', 'password' and 'ownerPassword'
  const finalEmail = email || ownerEmail;
  const finalPassword = password || ownerPassword;
  
  if ((finalEmail && typeof finalEmail !== 'string') || (finalPassword && typeof finalPassword !== 'string')) {
    throw new Error('Invalid owner credentials');
  }
  
  return { 
    name, 
    schemaName: finalSchemaName, 
    plan, 
    ownerEmail: finalEmail, 
    ownerPassword: finalPassword 
  };
}

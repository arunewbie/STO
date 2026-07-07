import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(process.env.DATABASE_URL);

export function rowToUser(r:any){
  return {
    id: r.id,
    username: r.username,
    password: r.password,
    fullName: r.full_name,
    role: r.role,
    defaultArea: r.default_area || 'RM',
    signatureName: r.signature_name || r.full_name,
    active: r.active !== false
  };
}

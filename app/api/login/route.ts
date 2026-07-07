import { NextRequest, NextResponse } from 'next/server';
import { sql, rowToUser } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    const rows = await sql`
      SELECT *
      FROM sto_users
      WHERE lower(username) = ${username}
        AND password = ${password}
        AND active = true
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json(
        { ok:false, message:'Username / password salah atau user tidak aktif' },
        { status:401 }
      );
    }

    return NextResponse.json({
      ok:true,
      user: rowToUser(rows[0])
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Login error' },
      { status:500 }
    );
  }
}

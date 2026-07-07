import { NextRequest, NextResponse } from 'next/server';
import { sql, rowToUser } from '../../../lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM sto_users
      ORDER BY
        CASE role
          WHEN 'ADMIN' THEN 1
          WHEN 'LEADER' THEN 2
          ELSE 3
        END,
        username
    `;

    return NextResponse.json({
      ok:true,
      users: rows.map(rowToUser)
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Load users error' },
      { status:500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const id = String(body.id || `U${Date.now()}`);
    const username = String(body.username || '').trim();
    const password = String(body.password || '1234').trim();
    const fullName = String(body.fullName || '').trim();
    const role = String(body.role || 'OPERATOR').trim().toUpperCase();
    const defaultArea = String(body.defaultArea || 'RM').trim();
    const signatureName = String(body.signatureName || fullName).trim();
    const active = body.active !== false;

    if (!username || !fullName) {
      return NextResponse.json(
        { ok:false, message:'Username dan Full Name wajib diisi' },
        { status:400 }
      );
    }

    if (!['ADMIN','OPERATOR','LEADER'].includes(role)) {
      return NextResponse.json(
        { ok:false, message:'Role tidak valid' },
        { status:400 }
      );
    }

    // Jika id lama diedit, update by id.
    // Jika username baru, insert.
    await sql`
      INSERT INTO sto_users (
        id,
        username,
        password,
        full_name,
        role,
        default_area,
        signature_name,
        active,
        updated_at
      )
      VALUES (
        ${id},
        ${username},
        ${password},
        ${fullName},
        ${role},
        ${defaultArea},
        ${signatureName},
        ${active},
        NOW()
      )
      ON CONFLICT (username)
      DO UPDATE SET
        password = EXCLUDED.password,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        default_area = EXCLUDED.default_area,
        signature_name = EXCLUDED.signature_name,
        active = EXCLUDED.active,
        updated_at = NOW()
    `;

    const rows = await sql`
      SELECT *
      FROM sto_users
      ORDER BY username
    `;

    return NextResponse.json({
      ok:true,
      users: rows.map(rowToUser)
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Save user error' },
      { status:500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const id = String(body.id || '');
    const action = String(body.action || '');

    if (!id) {
      return NextResponse.json(
        { ok:false, message:'ID user kosong' },
        { status:400 }
      );
    }

    if (action === 'resetPassword') {
      await sql`
        UPDATE sto_users
        SET password = '1234',
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    if (action === 'toggleActive') {
      await sql`
        UPDATE sto_users
        SET active = NOT active,
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    const rows = await sql`
      SELECT *
      FROM sto_users
      ORDER BY username
    `;

    return NextResponse.json({
      ok:true,
      users: rows.map(rowToUser)
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Update user error' },
      { status:500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json(
        { ok:false, message:'ID user kosong' },
        { status:400 }
      );
    }

    await sql`
      DELETE FROM sto_users
      WHERE id = ${id}
    `;

    const rows = await sql`
      SELECT *
      FROM sto_users
      ORDER BY username
    `;

    return NextResponse.json({
      ok:true,
      users: rows.map(rowToUser)
    });
  } catch (err:any) {
    return NextResponse.json(
      { ok:false, message: err.message || 'Delete user error' },
      { status:500 }
    );
  }
}

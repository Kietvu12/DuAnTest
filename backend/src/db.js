import pg from 'pg';

// bigint (count/sum) and numeric (rating) come back as strings by default.
pg.types.setTypeParser(20, (value) => Number.parseInt(value, 10));
pg.types.setTypeParser(1700, (value) => Number.parseFloat(value));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

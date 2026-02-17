/**
 * Transaction Wrapper
 * 
 * Purpose: All-or-nothing database operations with automatic rollback on error.
 * Ensures data consistency for complex multi-step mutations (e.g., approval workflows).
 * 
 * Design: 
 * - SERIALIZABLE isolation level for strict consistency
 * - Automatic rollback on any error
 * - Decorator pattern for easy adoption
 */

import pool from "@/lib/db";

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  transactionId: string;
}

/**
 * Execute code block within a database transaction.
 * If any query fails, entire transaction is rolled back.
 * 
 * Usage:
 * const result = await withTransaction(async (tx) => {
 *   await tx.query("UPDATE users SET status = $1 WHERE id = $2", ["active", userId]);
 *   await tx.query("INSERT INTO audit_logs ...");
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  label: string = "unnamed"
): Promise<TransactionResult<T>> {
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

    const txClient = new TransactionClient(client, transactionId);
    const result = await callback(txClient);

    await client.query("COMMIT");

    return {
      success: true,
      data: result,
      transactionId,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }

    const err = error instanceof Error ? error : new Error(String(error));

    console.error(JSON.stringify({
      level: "TRANSACTION_ERROR",
      transactionId,
      label,
      message: err.message,
      timestamp: new Date().toISOString(),
    }));

    return {
      success: false,
      error: err,
      transactionId,
    };
  } finally {
    client.release();
  }
}

/**
 * Transaction-aware query client.
 * All queries in a transaction share the same connection and isolation level.
 */
export class TransactionClient {
  constructor(
    private client: any,
    public transactionId: string
  ) {}

  async query<T = any>(
    text: string,
    values?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.client.query(text, values);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  }

  /**
   * Single row query (first match or null)
   */
  async queryOne<T = any>(text: string, values?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] || null;
  }
}

/**
 * Decorator for async functions to auto-wrap in transaction.
 * Usage:
 * @Transactional("approveOpportunity")
 * async function approveOpp(tx: TransactionClient, oppId: string) {
 *   // All tx.query() calls auto-wrapped
 * }
 */
export function Transactional(label: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withTransaction(
        (tx) => originalMethod.apply(this, [tx, ...args]),
        label
      );
    };

    return descriptor;
  };
}

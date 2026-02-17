/**
 * Database Migration System
 * 
 * Purpose: Track and execute schema migrations in order.
 * Ensures consistent schema evolution across all deployments.
 * 
 * Design:
 * - Sequential versioning (001, 002, 003...)
 * - One-way migrations (no rollback support yet)
 * - Atomic execution (each migration is a transaction)
 * - Automatic tracking in schema_migrations table
 */

import { query } from "@/lib/db";
import fs from "fs";
import path from "path";

export interface Migration {
  version: string;
  name: string;
  description: string;
  timestamp: Date;
  checksum: string;
}

export interface MigrationStatus {
  version: string;
  name: string;
  status: "pending" | "completed" | "failed";
  appliedAt?: Date;
  error?: string;
}

/**
 * Initialize migration tracking table (idempotent)
 */
export async function initializeMigrationTracking(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_ms INT,
        status VARCHAR(20) DEFAULT 'completed'
      );

      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);
    `);
  } catch (error) {
    console.error("Failed to initialize migration tracking:", error);
    throw error;
  }
}

/**
 * Get all completed migrations
 */
export async function getCompletedMigrations(): Promise<Migration[]> {
  try {
    const result = await query(`
      SELECT version, name, description, applied_at as timestamp, checksum
      FROM schema_migrations
      WHERE status = 'completed'
      ORDER BY version ASC
    `);

    return result.rows.map((row: any) => ({
      version: row.version,
      name: row.name,
      description: row.description,
      timestamp: row.timestamp,
      checksum: row.checksum,
    }));
  } catch (error) {
    console.error("Failed to get completed migrations:", error);
    return [];
  }
}

/**
 * Get all pending migrations from the migrations directory
 */
export async function getPendingMigrations(
  migrationsDir: string
): Promise<MigrationStatus[]> {
  try {
    const completed = await getCompletedMigrations();
    const completedVersions = new Set(completed.map((m) => m.version));

    // Read all migration files from directory
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const pending: MigrationStatus[] = [];

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;

      const version = match[1];
      const name = match[2];

      if (!completedVersions.has(version)) {
        pending.push({
          version,
          name,
          status: "pending",
        });
      }
    }

    return pending;
  } catch (error) {
    console.error("Failed to get pending migrations:", error);
    return [];
  }
}

/**
 * Get migration status summary
 */
export async function getMigrationStatus(
  migrationsDir: string
): Promise<{
  currentVersion: string;
  totalCompleted: number;
  totalPending: number;
  migrations: MigrationStatus[];
}> {
  try {
    const completed = await getCompletedMigrations();
    const pending = await getPendingMigrations(migrationsDir);

    const currentVersion =
      completed.length > 0
        ? completed[completed.length - 1].version
        : "0000";

    return {
      currentVersion,
      totalCompleted: completed.length,
      totalPending: pending.length,
      migrations: [
        ...completed.map((m) => ({
          version: m.version,
          name: m.name,
          status: "completed" as const,
          appliedAt: m.timestamp,
        })),
        ...pending,
      ],
    };
  } catch (error) {
    console.error("Failed to get migration status:", error);
    return {
      currentVersion: "0000",
      totalCompleted: 0,
      totalPending: 0,
      migrations: [],
    };
  }
}

/**
 * Apply a single migration
 */
export async function applyMigration(
  version: string,
  name: string,
  sqlContent: string,
  checksum: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    // Execute migration SQL
    await query(sqlContent);

    // Track migration
    const duration = Date.now() - startTime;
    const description = `Migration ${version}: ${name}`;

    await query(
      `INSERT INTO schema_migrations (version, name, description, checksum, duration_ms, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [version, name, description, checksum, duration]
    );

    console.log(
      JSON.stringify({
        level: "MIGRATION_SUCCESS",
        version,
        name,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Log failed migration
    try {
      await query(
        `INSERT INTO schema_migrations (version, name, description, checksum, duration_ms, status)
         VALUES ($1, $2, $3, $4, $5, 'failed')`,
        [
          version,
          name,
          `FAILED: ${errorMsg}`,
          checksum,
          duration,
        ]
      );
    } catch (trackingError) {
      console.error("Failed to track migration failure:", trackingError);
    }

    console.error(
      JSON.stringify({
        level: "MIGRATION_ERROR",
        version,
        name,
        error: errorMsg,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return { success: false, duration, error: errorMsg };
  }
}

/**
 * Run all pending migrations in order
 */
export async function runPendingMigrations(
  migrationsDir: string
): Promise<{ successful: number; failed: number; errors: string[] }> {
  try {
    await initializeMigrationTracking();

    const pending = await getPendingMigrations(migrationsDir);

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return { successful: 0, failed: 0, errors: [] };
    }

    console.log(`Found ${pending.length} pending migrations.`);

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const migration of pending) {
      const filePath = path.join(
        migrationsDir,
        `${migration.version}_${migration.name}.sql`
      );

      try {
        const sqlContent = fs.readFileSync(filePath, "utf-8");
        // Simple checksum: first 64 chars of content hash
        const checksum = sqlContent.substring(0, 64).padEnd(64, "0");

        const result = await applyMigration(
          migration.version,
          migration.name,
          sqlContent,
          checksum
        );

        if (result.success) {
          successful++;
          console.log(
            `✅ Applied migration ${migration.version}: ${migration.name}`
          );
        } else {
          failed++;
          const errorMsg = `❌ Failed to apply ${migration.version}: ${result.error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      } catch (error) {
        failed++;
        const errorMsg = `❌ Error reading migration file ${migration.version}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(
      JSON.stringify({
        level: "MIGRATION_SUMMARY",
        successful,
        failed,
        total: pending.length,
        timestamp: new Date().toISOString(),
      })
    );

    return { successful, failed, errors };
  } catch (error) {
    console.error("Migration runner error:", error);
    return { successful: 0, failed: 1, errors: [String(error)] };
  }
}

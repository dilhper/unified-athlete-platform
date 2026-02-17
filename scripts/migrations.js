#!/usr/bin/env node

/**
 * Migration CLI Tool
 * 
 * Usage:
 *   node scripts/migrations.js status          - Show migration status
 *   node scripts/migrations.js run             - Run pending migrations
 *   node scripts/migrations.js init            - Initialize migration tracking
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */

import path from "path";
import { fileURLToPath } from "url";
import {
  getMigrationStatus,
  runPendingMigrations,
  initializeMigrationTracking,
  getCompletedMigrations,
  getPendingMigrations,
} from "../lib/migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, "../db/migrations");
const command = process.argv[2] || "status";

async function main() {
  try {
    console.log(`📦 Unified Athlete Platform - Migration CLI\n`);

    switch (command) {
      case "status": {
        console.log("📊 Migration Status:");
        const status = await getMigrationStatus(migrationsDir);
        console.log(
          `   Current Version: ${status.currentVersion}`
        );
        console.log(
          `   Completed: ${status.totalCompleted}`
        );
        console.log(
          `   Pending: ${status.totalPending}\n`
        );

        if (status.migrations.length > 0) {
          console.log("   Migrations:");
          for (const m of status.migrations) {
            const icon =
              m.status === "completed" ? "✅" : "⏳";
            const date = m.appliedAt
              ? new Date(m.appliedAt).toLocaleString()
              : "Not applied";
            console.log(
              `   ${icon} ${m.version} - ${m.name} (${date})`
            );
          }
        }
        break;
      }

      case "run": {
        console.log("▶️  Running pending migrations...\n");
        const result = await runPendingMigrations(
          migrationsDir
        );
        console.log(`\n✅ Results:`);
        console.log(
          `   Successful: ${result.successful}`
        );
        console.log(`   Failed: ${result.failed}`);
        if (result.errors.length > 0) {
          console.log(`   Errors:`);
          for (const err of result.errors) {
            console.log(`   ❌ ${err}`);
          }
        }
        break;
      }

      case "init": {
        console.log("🔧 Initializing migration tracking...");
        await initializeMigrationTracking();
        console.log("✅ Migration tracking initialized");
        break;
      }

      case "completed": {
        console.log("✅ Completed Migrations:");
        const completed = await getCompletedMigrations();
        for (const m of completed) {
          const date = new Date(m.timestamp).toLocaleString();
          console.log(`   ${m.version} - ${m.name} (${date})`);
        }
        break;
      }

      case "pending": {
        console.log("⏳ Pending Migrations:");
        const pending = await getPendingMigrations(
          migrationsDir
        );
        if (pending.length === 0) {
          console.log("   No pending migrations");
        } else {
          for (const m of pending) {
            console.log(`   ${m.version} - ${m.name}`);
          }
        }
        break;
      }

      default:
        console.log(`Unknown command: ${command}\n`);
        console.log("Available commands:");
        console.log("  status    - Show migration status (default)");
        console.log("  run       - Run pending migrations");
        console.log("  init      - Initialize migration tracking");
        console.log("  completed - List completed migrations");
        console.log("  pending   - List pending migrations");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

import { pool } from "./database";
import * as fs from "fs";
import * as path from "path";

const runMigrations = async () => {
  try {
    console.log("Running database migrations...");

    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "schema.sql"),
      "utf8"
    );

    await pool.query(schemaSQL);

    console.log("Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigrations();


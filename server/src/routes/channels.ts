import { Router, Request, Response } from "express";
import { query } from "../db/database";

const router = Router();

// Create channel
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, creator, tx_hash } = req.body;

    if (!name || !creator) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if channel exists
    const existing = await query("SELECT * FROM channels WHERE name = $1", [name]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Channel already exists" });
    }

    const result = await query(
      "INSERT INTO channels (name, creator, tx_hash) VALUES ($1, $2, $3) RETURNING *",
      [name, creator, tx_hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all channels
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM channels ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting channels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get channel by name
router.get("/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const result = await query("SELECT * FROM channels WHERE name = $1", [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error getting channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


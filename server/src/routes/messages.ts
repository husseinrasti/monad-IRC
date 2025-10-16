import { Router, Request, Response } from "express";
import { query } from "../db/database";

const router = Router();

// Create message
router.post("/", async (req: Request, res: Response) => {
  try {
    const { channel_id, user_id, msg_hash, content, tx_hash } = req.body;

    if (!channel_id || !user_id || !msg_hash || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await query(
      `INSERT INTO messages (channel_id, user_id, msg_hash, content, tx_hash, status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [channel_id, user_id, msg_hash, content, tx_hash, "pending"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get messages for a channel
router.get("/channel/:channel_id", async (req: Request, res: Response) => {
  try {
    const { channel_id } = req.params;
    const { limit = "100", offset = "0" } = req.query;

    const result = await query(
      `SELECT m.*, u.username, u.wallet_address 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $1 
       ORDER BY m.timestamp DESC 
       LIMIT $2 OFFSET $3`,
      [channel_id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update message status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, tx_hash } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const result = await query(
      "UPDATE messages SET status = $1, tx_hash = $2 WHERE id = $3 RETURNING *",
      [status, tx_hash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


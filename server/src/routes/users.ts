import { Router, Request, Response } from "express";
import { query } from "../db/database";
import { User } from "../types";

const router = Router();

// Create or get user
router.post("/", async (req: Request, res: Response) => {
  try {
    const { wallet_address, username } = req.body;

    if (!wallet_address || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists
    const existingUser = await query(
      "SELECT * FROM users WHERE wallet_address = $1",
      [wallet_address]
    );

    if (existingUser.rows.length > 0) {
      return res.json(existingUser.rows[0]);
    }

    // Create new user
    const result = await query(
      "INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING *",
      [wallet_address, username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by wallet address
router.get("/:wallet_address", async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const result = await query(
      "SELECT * FROM users WHERE wallet_address = $1",
      [wallet_address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


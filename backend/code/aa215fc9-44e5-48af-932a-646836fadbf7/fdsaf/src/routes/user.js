// User route demonstrating validation middleware usage

const express = require("express");
const router = express.Router();
const { validateUser } = require("../validationMiddleware");

// Simple in‑memory store for demonstration purposes
const users = [];

router.post("/", validateUser(), (req, res) => {
    const { name, email } = req.body;
    const newUser = { id: users.length + 1, name, email };
    users.push(newUser);
    res.status(201).json(newUser);
});

router.get("/", (req, res) => {
    res.json(users);
});

module.exports = router;

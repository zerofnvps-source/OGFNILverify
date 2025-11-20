import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Temporary in-memory session storage
// (You should replace this with Redis later)
const sessions = {};

app.get("/", (req, res) => {
    res.send("OAuth server is running.");
});

app.get("/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) return res.send("Missing ?code= from Discord");

    try {
        const data = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.REDIRECT_URI
        });

        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            body: data,
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.send("Discord OAuth error: " + tokenData.error_description);
        }

        // Create a secure random session ID
        const sessionId = crypto.randomBytes(32).toString("hex");

        // Store tokens server-side (DO NOT send to browser)
        sessions[sessionId] = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type
        };

        // Redirect user to success page with session id (safe)
        res.redirect(`/success?session=${sessionId}`);

    } catch (err) {
        res.send("Internal OAuth error: " + err.message);
    }
});

app.get("/success", (req, res) => {
    const session = req.query.session;

    if (!session || !sessions[session]) {
        return res.send("Invalid session.");
    }

    res.send(`
        <h1 style="color: cyan; font-family: Arial;">
            Logged in Successfully!
        </h1>
        <p style="color: white;">
            Your login was processed securely.<br>
            (Tokens are stored server-side.)
        </p>
    `);
});

app.listen(port, () => {
    console.log(`OAuth server running on port ${port}`);
});

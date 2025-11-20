import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Temporary in-memory session storage (replace with Redis or DB for production)
const sessions = {};

// Serve static HTML pages
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/callback", async (req, res) => {
    const { code, error, error_description } = req.query;

    console.log("Discord callback query:", req.query);

    if (error) return res.send(`Discord OAuth error: ${error} - ${error_description}`);
    if (!code) return res.send("Missing ?code= from Discord. Did the user authorize the app?");

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

        const sessionId = crypto.randomBytes(32).toString("hex");

        sessions[sessionId] = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type
        };

        res.redirect(`/success.html?session=${sessionId}`);
    } catch (err) {
        console.error("OAuth callback error:", err);
        res.send("Internal OAuth error: " + err.message);
    }
});

// Route to fetch user info from Discord using session
app.get("/userinfo", async (req, res) => {
    const session = req.query.session;

    if (!session || !sessions[session]) {
        return res.json({ error: "Invalid session or not logged in." });
    }

    const { access_token } = sessions[session];

    try {
        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const userData = await userResponse.json();

        if (userData.message) {
            return res.json({ error: userData.message });
        }

        res.json(userData);
    } catch (err) {
        console.error(err);
        res.json({ error: "Failed to fetch user info." });
    }
});

app.listen(port, () => {
    console.log(`OAuth server running on port ${port}`);
});

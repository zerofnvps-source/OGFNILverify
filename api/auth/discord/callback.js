import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __dirname = path.resolve();

// In-memory sessions (no MongoDB)
const sessions = {};

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("Missing ?code");

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
            return res.send("OAuth Error: " + tokenData.error_description);
        }

        // Fetch user info
        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `${tokenData.token_type} ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Create session ID
        const sessionId = crypto.randomBytes(32).toString("hex");

        // Save everything server-side
        sessions[sessionId] = {
            user: userData,
            token: tokenData
        };

        // Redirect to success page
        res.redirect(`/success?session=${sessionId}`);

    } catch (err) {
        res.send("Internal error: " + err.message);
    }
});

app.get("/success", (req, res) => {
    res.sendFile(__dirname + "/public/success.html");
});

app.get("/userinfo", (req, res) => {
    const s = req.query.session;
    if (!s || !sessions[s]) return res.json({ error: "Invalid session" });

    res.json(sessions[s].user);
});

app.listen(port, () => {
    console.log(`OAuth server running on port ${port}`);
});

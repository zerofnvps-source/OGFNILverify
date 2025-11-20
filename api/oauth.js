import fetch from "node-fetch";
import crypto from "crypto";

let sessions = {}; // Temporary in-memory session store (serverless functions are stateless, consider a DB)

export default async function handler(req, res) {
    const { pathname, query } = new URL(req.url, `https://${req.headers.host}`);
    
    if (pathname === "/api/callback") {
        const { code, error, error_description } = query;
        console.log("Discord callback query:", query);

        if (error) return res.status(400).send(`Discord OAuth error: ${error} - ${error_description}`);
        if (!code) return res.status(400).send("Missing ?code= from Discord");

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
            if (tokenData.error) return res.status(400).send(tokenData.error_description);

            const sessionId = crypto.randomBytes(32).toString("hex");
            sessions[sessionId] = { access_token: tokenData.access_token };

            res.redirect(`/success.html?session=${sessionId}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal OAuth error: " + err.message);
        }
    }

    else if (pathname === "/api/userinfo") {
        const session = query.session;
        if (!session || !sessions[session]) return res.status(400).json({ error: "Invalid session" });

        try {
            const userResponse = await fetch("https://discord.com/api/users/@me", {
                headers: { Authorization: `Bearer ${sessions[session].access_token}` }
            });
            const userData = await userResponse.json();
            res.json(userData);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch user info." });
        }
    }

    else {
        res.status(404).send("Not found");
    }
}


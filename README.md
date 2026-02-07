# ⚡ Sovereign Media Node

A lightweight, content-addressable storage (CAS) server for the Nostr ecosystem. This node is designed to host decentralized media packs and satisfy Blossom protocol queries.

## 🛠️ Protocol Support
* **NIP-30030 (Media Packs):** Supports broadcasting and aggregating distributed media sets (emoji/gif/sticker packs).
* **Blossom (NIP-126):** Implements Content-Addressable Storage using SHA-256 hashing.
* **Sovereign Hosting:** Fully self-contained Node.js backend with no external tracking or third-party API dependencies.

## 🚀 Key Endpoints
* `GET /:hash` - Retrieves a media blob by its SHA-256 identifier.
* `GET /list/:pubkey` - Returns a Blossom-compliant JSON list of all media hosted on this node.
* `PUT /upload` - Secure upload endpoint with automated SHA-256 renaming and metadata generation.

## 📦 Deployment
1. Clone the branch: `git clone -b blossom [repo-url]`
2. Install dependencies: `npm install`
3. Configure your `.env` (Port, Domain, Lightning Address).
4. Start the node: `pm2 start server.js --name "sovereign-node"`

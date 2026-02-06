const express = require('express');
const { verifyEvent } = require('nostr-tools');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.raw({ type: 'image/*', limit: '10mb' }));
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'database.json');

// Ensure storage exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

const getDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Serve Frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// NIP-96 Discovery Handshake for clients like Nostria
app.get('/.well-known/nostr/nip96.json', (req, res) => {
    res.json({
        api_url: "http://localhost:3000/upload",
        download_url: "http://localhost:3000/m",
        content_types: ["image/jpeg", "image/png", "image/gif"],
        plans: { "free": { "is_active": true, "max_size": 10485760 } }
    });
});

// Upload Logic
app.put('/upload', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const tags = req.headers['x-tags'] ? req.headers['x-tags'].split(',') : [];
        const event = JSON.parse(Buffer.from(authHeader, 'base64').toString());

        if (!verifyEvent(event)) return res.status(401).send("Invalid Auth");

        const hash = crypto.createHash('sha256').update(req.body).digest('hex');
        const fileName = `${hash}.jpg`;
        fs.writeFileSync(path.join(UPLOADS_DIR, fileName), req.body);

        const db = getDb();
        db.push({ 
            hash, 
            url: `http://localhost:3000/m/${fileName}`, 
            tags: tags.map(t => t.trim()), 
            owner: event.pubkey,
            created_at: Math.floor(Date.now() / 1000)
        });
        saveDb(db);
        
        res.send({ url: `http://localhost:3000/m/${fileName}` });
    } catch (e) { 
        res.status(500).send(e.message); 
    }
});

// Search Logic
app.get('/search', (req, res) => {
    const q = req.query.q?.toLowerCase() || '';
    const results = getDb().filter(m => m.tags.some(t => t.includes(q)));
    res.send(results);
});

app.use('/m', express.static(UPLOADS_DIR));
app.listen(3000, () => console.log('✅ Server: http://localhost:3000'));
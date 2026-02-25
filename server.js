const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Serve static files for the frontend
app.use(express.static(__dirname));
app.use('/barbrain', express.static(__dirname)); // Ensure /barbrain path works too

// Ensure data.json exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

// GET data
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data:', err);
            return res.status(500).json({ error: 'Failed to read data' });
        }
        try {
            res.json(JSON.parse(data || '{}'));
        } catch (e) {
            res.json({});
        }
    });
});

const LOG_FILE = path.join(__dirname, 'premixlog.log');

function updateLogGroup(entry) {
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const now = entry.ts || Date.now();
    let content = '';
    if (fs.existsSync(LOG_FILE)) content = fs.readFileSync(LOG_FILE, 'utf8');

    let lines = content.split('\n').filter(l => l.trim());
    let lastLine = lines[lines.length - 1];
    let grouped = false;

    if (lastLine) {
        // More robust regex to capture the action and delta, allowing for more flexible messages
        const parts = lastLine.match(/\[(.*?)\] (.*?): (.*?)\s*([-+]?\d+)\s*bottles \(Total: (\d+)\)/);
        if (parts) {
            const [_, lastTsStr, lastName, lastAction, lastDeltaStr] = parts;
            const lastTs = new Date(lastTsStr).getTime();
            // Check if the action is the same (e.g., 'added', 'removed') and cocktail name matches
            // The regex now captures the action more broadly, so we compare the captured action part
            if (lastName === entry.cocktailName && lastAction.trim() === entry.action.trim() && (now - lastTs < THREE_HOURS)) {
                const newDelta = parseInt(lastDeltaStr) + entry.delta;
                lines[lines.length - 1] = `[${new Date(now).toLocaleString()}] ${entry.cocktailName}: ${entry.action} ${newDelta > 0 ? '+' : ''}${newDelta} bottles (Total: ${entry.count})`;
                grouped = true;
            }
        }
    }
    if (!grouped) {
        lines.push(`[${new Date(now).toLocaleString()}] ${entry.cocktailName}: ${entry.action} ${entry.delta > 0 ? '+' : ''}${entry.delta} bottles (Total: ${entry.count})`);
    }
    fs.writeFileSync(LOG_FILE, lines.join('\n') + '\n');
}

// POST data (save)
app.post('/api/data', (req, res) => {
    const newData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            console.error('Error writing data:', err);
            return res.status(500).json({ error: 'Failed to save data' });
        }
        if (newData.lastLogEntry) {
            console.log('Processing log entry for:', newData.lastLogEntry.cocktailName);
            updateLogGroup(newData.lastLogEntry);
        }
        console.log('Data saved successfully at', new Date().toISOString());
        res.json({ success: true });
    });
});

// New endpoint for explicit logging if needed
app.post('/api/logs', (req, res) => {
    const { message } = req.body;
    fs.appendFileSync(LOG_FILE, `[${new Date().toLocaleString()}] ${message}\n`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Batchbrain Data Server running on http://localhost:${PORT}`);
    console.log(`Storage file: ${DATA_FILE}`);
});
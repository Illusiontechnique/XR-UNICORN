const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const logDir = __dirname;
const logFile = path.join(logDir, 'xr-debug.log');

app.post('/xr-debug', (req, res) => {
  const entry = {
    ts: new Date().toISOString(),
    origin: req.get('origin') || req.ip,
    body: req.body,
  };
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(logFile, line, (err) => {
    if (err) {
      console.error('Failed to write log:', err);
      res.status(500).send('failed');
      return;
    }
    res.send('ok');
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`XR debug log server listening on http://localhost:${port}`);
  console.log(`Logs are written to ${logFile}`);
});

try {
  const express = require('express');
  const path = require('path');

  const app = express();
  const PORT = process.env.PORT || 3000;

  const distFolder = path.resolve(__dirname, '../client/dist/client/browser'); 

  app.use(express.static(distFolder));

  app.get('\\', (req, res) => {
    res.sendFile(path.join(distFolder, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Startup error:', err);
}
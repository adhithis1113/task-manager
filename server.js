const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const TASKS_DIR = path.join(__dirname, 'tasks');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// File format: line 1 = title, everything after = description
function parseTask(id, content) {
  const lines = content.split('\n');
  const title = lines[0];
  const description = lines.slice(1).join('\n').trim();
  return { id, title, description };
}

// Home page: list all tasks
app.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(TASKS_DIR);

    const txtFiles = files
      .filter((f) => f.endsWith('.txt'))
      .sort()
      .reverse();

    const tasks = await Promise.all(
      txtFiles.map(async (file) => {
        const content = await fs.readFile(path.join(TASKS_DIR, file), 'utf8');
        return parseTask(file.replace('.txt', ''), content);
      })
    );

    res.render('index', { tasks });
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not load tasks.');
  }
});

// Create a task
app.post('/add', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).send('Title is required. <a href="/">Go back</a>');
    }

    const id = Date.now();
    const cleanTitle = title.trim().replace(/\r?\n/g, ' ');
    const content = `${cleanTitle}\n${(description || '').trim()}`;

    await fs.writeFile(path.join(TASKS_DIR, `${id}.txt`), content);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not save task.');
  }
});

// View one full task (Read More)
app.get('/task/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(404).send('Task not found. <a href="/">Go back</a>');
  }

  try {
    const content = await fs.readFile(path.join(TASKS_DIR, `${id}.txt`), 'utf8');
    res.render('task', { task: parseTask(id, content) });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).send('Task not found. <a href="/">Go back</a>');
    }
    console.error(err);
    res.status(500).send('Could not read task.');
  }
});

fs.mkdir(TASKS_DIR, { recursive: true }).then(() => {
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
});
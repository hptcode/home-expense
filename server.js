import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test database connection
app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ok', message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ========== CATEGORIES ==========

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await db.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.json({ id: result.insertId, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EXPENSES ==========

// Get all expenses with category info
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.id, e.amount, e.description, e.expense_date, e.created_at,
             c.id as category_id, c.name as category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      ORDER BY e.expense_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses by date range
app.get('/api/expenses/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    const [rows] = await db.execute(`
      SELECT e.id, e.amount, e.description, e.expense_date,
             c.id as category_id, c.name as category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.expense_date BETWEEN ? AND ?
      ORDER BY e.expense_date DESC
    `, [start, end]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { category_id, amount, description, expense_date } = req.body;
    const [result] = await db.execute(
      'INSERT INTO expenses (category_id, amount, description, expense_date) VALUES (?, ?, ?, ?)',
      [category_id, amount, description, expense_date]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, amount, description, expense_date } = req.body;
    await db.execute(
      `UPDATE expenses SET category_id = ?, amount = ?, description = ?, expense_date = ?
       WHERE id = ?`,
      [category_id, amount, description, expense_date, id]
    );
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SUMMARIES ==========

// Monthly summary
app.get('/api/summary/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const [rows] = await db.execute(`
      SELECT c.name as category,
             COALESCE(SUM(e.amount), 0) as total,
             COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id
        AND YEAR(e.expense_date) = ? AND MONTH(e.expense_date) = ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `, [year, month]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yearly summary by month
app.get('/api/summary/yearly', async (req, res) => {
  try {
    const { year } = req.query;
    const [rows] = await db.execute(`
      SELECT MONTH(e.expense_date) as month,
             COALESCE(SUM(e.amount), 0) as total
      FROM expenses e
      WHERE YEAR(e.expense_date) = ?
      GROUP BY MONTH(e.expense_date)
      ORDER BY month
    `, [year]);

    // Ensure all 12 months are represented
    const allMonths = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 1; i <= 12; i++) {
      const found = rows.find(r => r.month === i);
      allMonths.push({
        month: monthNames[i - 1],
        month_num: i,
        total: found ? parseFloat(found.total) : 0
      });
    }
    res.json(allMonths);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yearly summary by category
app.get('/api/summary/yearly/category', async (req, res) => {
  try {
    const { year } = req.query;
    const [rows] = await db.execute(`
      SELECT c.name as category,
             COALESCE(SUM(e.amount), 0) as total
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id
        AND YEAR(e.expense_date) = ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `, [year]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total for period
app.get('/api/summary/total', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query, params;

    if (month) {
      query = `SELECT SUM(amount) as total FROM expenses
               WHERE YEAR(expense_date) = ? AND MONTH(expense_date) = ?`;
      params = [year, month];
    } else {
      query = `SELECT SUM(amount) as total FROM expenses WHERE YEAR(expense_date) = ?`;
      params = [year];
    }

    const [rows] = await db.execute(query, params);
    res.json({ total: rows[0].total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Weekly summary
app.get('/api/summary/weekly', async (req, res) => {
  try {
    const { year, week } = req.query;
    const [rows] = await db.execute(`
      SELECT c.name as category,
             COALESCE(SUM(e.amount), 0) as total,
             COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id
        AND YEAR(e.expense_date) = ? AND WEEK(e.expense_date, 1) = ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `, [year, week]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get week dates helper
app.get('/api/summary/week-dates', async (req, res) => {
  try {
    const { year, week } = req.query;
    const [rows] = await db.execute(`
      SELECT
        DATE_ADD(MAKEDATE(?, 1), INTERVAL ? WEEK) as start_date,
        DATE_ADD(DATE_ADD(MAKEDATE(?, 1), INTERVAL ? WEEK), INTERVAL 6 DAY) as end_date
    `, [year, week - 1, year, week - 1]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
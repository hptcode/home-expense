import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

const API_URL = 'http://localhost:3001/api';

// Category colors - each category has a fixed color
const CATEGORY_COLORS = {
  'Housing': '#ef4444',
  'Utilities': '#f97316',
  'Groceries': '#84cc16',
  'Dining': '#22c55e',
  'Transportation': '#06b6d4',
  'Healthcare': '#3b82f6',
  'Entertainment': '#8b5cf6',
  'Shopping': '#d946ef',
  'Education': '#f472b6',
  'Personal Care': '#fb923c',
  'Insurance': '#14b8a6',
  'Savings': '#4ade80',
  'Other': '#9ca3af'
};

function getCategoryColor(categoryName) {
  return CATEGORY_COLORS[categoryName] || '#9ca3af';
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [lastAction, setLastAction] = useState(null); // { type: 'added'|'updated', expense: {...} }

  // Filter state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()));

  // Summary data
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [yearlyCategorySummary, setYearlyCategorySummary] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [weekDates, setWeekDates] = useState({ start_date: '', end_date: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, expensesRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/expenses`)
      ]);
      setCategories(categoriesRes.data);
      setExpenses(expensesRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length > 0) {
      fetchSummaries();
    }
  }, [currentYear, currentMonth, currentWeek, categories]);

  const fetchSummaries = async () => {
    try {
      const [monthlyRes, yearlyRes, yearlyCatRes, totalRes, weeklyRes, weekDatesRes] = await Promise.all([
        axios.get(`${API_URL}/summary/monthly`, { params: { year: currentYear, month: currentMonth } }),
        axios.get(`${API_URL}/summary/yearly`, { params: { year: currentYear } }),
        axios.get(`${API_URL}/summary/yearly/category`, { params: { year: currentYear } }),
        axios.get(`${API_URL}/summary/total`, { params: { year: currentYear, month: currentMonth } }),
        axios.get(`${API_URL}/summary/weekly`, { params: { year: currentYear, week: currentWeek } }),
        axios.get(`${API_URL}/summary/week-dates`, { params: { year: currentYear, week: currentWeek } })
      ]);
      setMonthlySummary(monthlyRes.data.filter(c => c.total > 0));
      setYearlySummary(yearlyRes.data);
      setYearlyCategorySummary(yearlyCatRes.data.filter(c => c.total > 0));
      setWeeklySummary(weeklyRes.data.filter(c => c.total > 0));
      setTotalAmount(parseFloat(totalRes.data.total));
      setWeekDates(weekDatesRes.data);
      setWeeklyTotal(parseFloat(weeklyRes.data.reduce((sum, c) => sum + parseFloat(c.total), 0)));
    } catch (err) {
      console.error('Failed to fetch summaries:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount)
      };

      let result;
      if (editingId) {
        result = await axios.put(`${API_URL}/expenses/${editingId}`, data);
        setEditingId(null);
        setLastAction({ type: 'updated', expense: { id: editingId, ...data } });
      } else {
        result = await axios.post(`${API_URL}/expenses`, data);
        setLastAction({ type: 'added', expense: { id: result.data.id, ...data } });
      }

      setFormData({
        category_id: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
      fetchSummaries();

      // Clear the last action message after 5 seconds
      setTimeout(() => setLastAction(null), 5000);
    } catch (err) {
      console.error('Failed to save expense:', err);
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      category_id: expense.category_id,
      amount: expense.amount.toString(),
      description: expense.description || '',
      expense_date: expense.expense_date
    });
    setEditingId(expense.id);
    setActiveTab('add');
    setLastAction(null);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`${API_URL}/expenses/${id}`);
        fetchData();
        fetchSummaries();
        setLastAction(null);
      } catch (err) {
        console.error('Failed to delete expense:', err);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      category_id: '',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
    setLastAction(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Get week number
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Generate week options
  const weekOptions = [];
  for (let i = 1; i <= 52; i++) {
    weekOptions.push(i);
  }

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === parseInt(categoryId));
    return cat ? cat.name : 'Unknown';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 Home Expense Tracker</h1>
        <nav className="nav">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button className={activeTab === 'weekly' ? 'active' : ''} onClick={() => setActiveTab('weekly')}>
            📅 Weekly Report
          </button>
          <button className={activeTab === 'add' ? 'active' : ''} onClick={() => setActiveTab('add')}>
            ➕ Add Expense
          </button>
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
            📋 All Expenses
          </button>
        </nav>
      </header>

      <main className="main">
        {error && <div className="error">{error}</div>}

        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="summary-controls">
              <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))}>
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div className="summary-cards">
              <div className="card total">
                <h3>Monthly Total</h3>
                <p className="amount">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="card">
                <h3>Transactions</h3>
                <p className="amount">{expenses.filter(e => new Date(e.expense_date).getFullYear() === currentYear && new Date(e.expense_date).getMonth() + 1 === currentMonth).length}</p>
              </div>
              <div className="card">
                <h3>Categories Used</h3>
                <p className="amount">{monthlySummary.length}</p>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <h3>Monthly Breakdown by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlySummary}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="category"
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {monthlySummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Yearly Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yearlySummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#4ade80" name="Monthly Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container full-width">
                <h3>Yearly Spending by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yearlyCategorySummary} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total" name="Total">
                      {yearlyCategorySummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Bar>
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="dashboard">
            <div className="summary-controls">
              <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={currentWeek} onChange={(e) => setCurrentWeek(parseInt(e.target.value))}>
                {weekOptions.map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
              {weekDates.start_date && (
                <span className="week-dates">
                  {weekDates.start_date} - {weekDates.end_date}
                </span>
              )}
            </div>

            <div className="summary-cards">
              <div className="card total">
                <h3>Weekly Total</h3>
                <p className="amount">{formatCurrency(weeklyTotal)}</p>
              </div>
              <div className="card">
                <h3>Transactions</h3>
                <p className="amount">{expenses.filter(e => {
                  const expenseDate = new Date(e.expense_date);
                  const expenseWeek = getWeekNumber(expenseDate);
                  return expenseDate.getFullYear() === currentYear && expenseWeek === currentWeek;
                }).length}</p>
              </div>
              <div className="card">
                <h3>Categories Used</h3>
                <p className="amount">{weeklySummary.length}</p>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <h3>Weekly Breakdown by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={weeklySummary}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="category"
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {weeklySummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container full-width">
                <h3>Weekly Spending by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklySummary} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total" name="Total">
                      {weeklySummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Bar>
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="form-container">
            <h2>{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Add'} Expense
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancel} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Show last added/updated expense */}
            {lastAction && (
              <div className={`success-message ${lastAction.type}`}>
                <div className="success-icon">
                  {lastAction.type === 'added' ? '✓' : '✎'}
                </div>
                <div className="success-content">
                  <span className="success-title">
                    {lastAction.type === 'added' ? 'Expense Added' : 'Expense Updated'}
                  </span>
                  <div className="expense-preview">
                    <span
                      className="expense-category"
                      style={{ borderColor: getCategoryColor(getCategoryName(lastAction.expense.category_id)) }}
                    >
                      {getCategoryName(lastAction.expense.category_id)}
                    </span>
                    <span className="expense-amount">
                      {formatCurrency(lastAction.expense.amount)}
                    </span>
                    <span className="expense-date">{lastAction.expense.expense_date}</span>
                    {lastAction.expense.description && (
                      <span className="expense-description">{lastAction.expense.description}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="list-container">
            <div className="list-header">
              <h2>All Expenses</h2>
              {currentMonth ? (
                <div className="month-total">
                  <span>Total for {monthNames[currentMonth - 1]} {currentYear}:</span>
                  <span className="total-amount">
                    {formatCurrency(
                      expenses
                        .filter(e => {
                          const date = new Date(e.expense_date);
                          return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
                        })
                        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
                    )}
                  </span>
                </div>
              ) : (
                <div className="month-total">
                  <span>Total for {currentYear}:</span>
                  <span className="total-amount">
                    {formatCurrency(
                      expenses
                        .filter(e => {
                          const date = new Date(e.expense_date);
                          return date.getFullYear() === currentYear;
                        })
                        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="filter-row">
              <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))}>
                <option value="">All Months</option>
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <table className="expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses
                  .filter(e => {
                    const date = new Date(e.expense_date);
                    if (currentMonth && date.getMonth() + 1 !== currentMonth) return false;
                    return date.getFullYear() === currentYear;
                  })
                  .map(expense => (
                    <tr key={expense.id}>
                      <td>{expense.expense_date}</td>
                      <td>
                        <span className="category-badge" style={{ borderColor: getCategoryColor(expense.category_name) }}>
                          {expense.category_name}
                        </span>
                      </td>
                      <td>{expense.description || '-'}</td>
                      <td className="amount">{formatCurrency(expense.amount)}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(expense)} className="btn-edit">Edit</button>
                        <button onClick={() => handleDelete(expense.id)} className="btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
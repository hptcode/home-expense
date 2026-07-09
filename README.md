# 🏠 Home Expense Tracker

A full-stack web application for tracking household expenses with a MySQL database and interactive charts.

## Features

- **Add, Edit, Delete** expense entries
- **Categorize** expenses (Housing, Utilities, Groceries, Transportation, etc.)
- **Monthly Summary** with pie chart breakdown
- **Yearly Summary** with bar charts showing trends
- **Category Analysis** - see spending by category
- **Responsive Design** - works on desktop and mobile
- **Dark Theme UI** - easy on the eyes

## Tech Stack

- **Frontend**: React 19 + Vite + Recharts
- **Backend**: Node.js + Express
- **Database**: MySQL (Hostinger)

## Setup Instructions

### 1. Database Setup (Hostinger)

1. Log in to your Hostinger hPanel
2. Go to **Databases → MySQL Databases**
3. Create a new database (or use existing one)
4. Note the credentials:
   - Database name
   - Username
   - Password
   - Host (e.g., `mysql.hostinger.com`)

5. Open **phpMyAdmin** and run the SQL in `schema.sql` to create tables:
   ```sql
   -- Copy contents from schema.sql
   ```

### 2. Configure Database Connection

Edit the `.env` file in the project root:

```env
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_USER=your_database_username
DB_PASS=your_database_password
DB_PORT=3306

PORT=3001
```

### 3. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 4. Run the Application

**Option A: Run both backend and frontend separately (recommended for development)**

```bash
# Terminal 1 - Backend API
npm run dev

# Terminal 2 - Frontend (in a new terminal)
cd client
npm run dev
```

**Option B: Build and serve frontend statically**

```bash
# Build frontend
npm run client:build

# Start backend (serves both API and frontend)
npm start
```

## Access the Application

- **Frontend**: http://localhost:5173 (dev) or http://localhost:3001 (production)
- **Backend API**: http://localhost:3001/api

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check database connection |
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Add new category |
| GET | `/api/expenses` | Get all expenses |
| GET | `/api/expenses/range` | Get expenses by date range |
| POST | `/api/expenses` | Add new expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/summary/monthly` | Get monthly summary |
| GET | `/api/summary/yearly` | Get yearly summary by month |
| GET | `/api/summary/yearly/category` | Get yearly summary by category |
| GET | `/api/summary/total` | Get total for period |

## Project Structure

```
home-expense/
├── .env                 # Database credentials
├── schema.sql           # Database schema
├── db.js                # Database connection
├── server.js            # Express API server
├── package.json         # Backend dependencies
├── client/              # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── App.css      # Styles
│   │   └── main.jsx     # Entry point
│   └── package.json
└── README.md
```

## Default Categories

The app comes with these pre-defined categories:
- Housing
- Utilities
- Groceries
- Transportation
- Healthcare
- Entertainment
- Shopping
- Education
- Personal Care
- Insurance
- Savings
- Other

## Troubleshooting

### Database Connection Error
- Verify your `.env` file has correct credentials
- Ensure your Hostinger database allows remote connections
- Check if you've run the `schema.sql` to create tables

### API Not Responding
- Make sure the backend server is running (`npm run dev`)
- Check that port 3001 is not in use by another application

### Frontend Not Loading Data
- Verify the backend is running
- Check browser console for CORS or network errors
- Ensure API_URL in `App.jsx` matches your backend address

## License

MIT

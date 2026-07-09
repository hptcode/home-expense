-- Home Expense Tracker Database Schema
-- Run this SQL in your Hostinger phpMyAdmin to create the tables

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(500),
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_expense_date (expense_date),
    INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Housing', 'Rent, mortgage, property taxes, home insurance'),
('Utilities', 'Electricity, water, gas, internet, phone'),
('Groceries', 'Food and household items'),
('Dining', 'Restaurants, takeout, coffee shops'),
('Transportation', 'Fuel, public transport, car maintenance'),
('Healthcare', 'Medical bills, insurance, medications'),
('Entertainment', 'Movies, subscriptions, hobbies'),
('Shopping', 'Clothing, electronics, personal items'),
('Education', 'Courses, books, school fees'),
('Personal Care', 'Haircuts, gym, toiletries'),
('Insurance', 'Life, health, vehicle insurance'),
('Savings', 'Emergency fund, investments'),
('Other', 'Miscellaneous expenses');
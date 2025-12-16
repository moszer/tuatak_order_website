import mysql from 'mysql2/promise';

// Parse connection string from JDBC format
// jdbc:mysql://user:password@host:port/database?sslMode=VERIFY_IDENTITY
const DB_HOST = process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const DB_PORT = parseInt(process.env.DB_PORT || '4000');
const DB_USER = process.env.DB_USER || '2JCfDnnDB1krSZf.root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'JLGb5sgu2XrrjIQg';
const DB_NAME = process.env.DB_NAME || 'mydb';

let cachedConnection: mysql.Pool | null = null;

export async function connectToDatabase(): Promise<mysql.Pool> {
  if (cachedConnection) {
    return cachedConnection;
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: {
      rejectUnauthorized: true, // VERIFY_IDENTITY
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Test connection and create table if it doesn't exist
  try {
    const connection = await pool.getConnection();
    
    // Create orders table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        totalPrice DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'preparing', 'ready', 'served', 'paid') NOT NULL DEFAULT 'pending',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tableNumber (tableNumber),
        INDEX idx_status (status),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create menu_items table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nameTh VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        image VARCHAR(500),
        category VARCHAR(50) NOT NULL,
        isPopular BOOLEAN DEFAULT FALSE,
        isSpicy BOOLEAN DEFAULT FALSE,
        isNew BOOLEAN DEFAULT FALSE,
        displayOrder INT DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_displayOrder (displayOrder)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create table_sessions table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS table_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) NOT NULL,
        status ENUM('active', 'closed') NOT NULL DEFAULT 'active',
        startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closedAt DATETIME NULL,
        INDEX idx_tableNumber (tableNumber),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create table_status table to track if tables are ready for ordering
    await connection.query(`
      CREATE TABLE IF NOT EXISTS table_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) UNIQUE NOT NULL,
        isReady BOOLEAN NOT NULL DEFAULT FALSE,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tableNumber (tableNumber),
        INDEX idx_isReady (isReady)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create table_bills table to store buffet pricing for each table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS table_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) UNIQUE NOT NULL,
        adultCount INT NOT NULL DEFAULT 0,
        child120Count INT NOT NULL DEFAULT 0,
        child100Count INT NOT NULL DEFAULT 0,
        drinkRefillCount INT NOT NULL DEFAULT 0,
        adultPrice DECIMAL(10, 2) NOT NULL DEFAULT 199.00,
        child120Price DECIMAL(10, 2) NOT NULL DEFAULT 130.00,
        drinkRefillPrice DECIMAL(10, 2) NOT NULL DEFAULT 39.00,
        totalPrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tableNumber (tableNumber)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create payments table to store cash flow records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) NOT NULL,
        foodRevenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
        buffetRevenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
        totalRevenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
        ordersCount INT NOT NULL DEFAULT 0,
        paymentMethod VARCHAR(50) DEFAULT 'cash',
        notes TEXT,
        paidAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tableNumber (tableNumber),
        INDEX idx_paidAt (paidAt),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create users table for admin authentication
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default admin user if users table is empty (password: admin123)
    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users') as any;
    if (existingUsers[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        ['admin', hashedPassword]
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    }

    // Insert default menu items if table is empty
    const [existingItems] = await connection.query('SELECT COUNT(*) as count FROM menu_items') as any;
    if (existingItems[0].count === 0) {
      // Import and insert default menu items
      const { menuItems } = await import('@/app/data/menuItems');
      for (const item of menuItems) {
        await connection.query(
          `INSERT INTO menu_items (id, name, nameTh, description, price, image, category, isPopular, isSpicy, isNew) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.name,
            item.nameTh,
            item.description,
            item.price,
            item.image,
            item.category,
            item.isPopular || false,
            item.isSpicy || false,
            item.isNew || false
          ]
        );
      }
    }
    
    connection.release();
    cachedConnection = pool;
    console.log('Connected to TiDB Cloud successfully');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }

  return pool;
}

export interface Order {
  id?: number;
  _id?: string; // For backward compatibility
  tableNumber: string;
  items: {
    id: number;
    name: string;
    nameTh: string;
    price: number;
    quantity: number;
    comment?: string;
  }[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
  createdAt: Date | string;
  updatedAt: Date | string;
}


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

    // Add LINE login columns if they don't exist (TiDB supports IF NOT EXISTS)
    await connection.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100) NULL UNIQUE,
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS picture_url VARCHAR(500) NULL
    `).catch(() => {
      // Ignore if columns already exist (fallback for MySQL without IF NOT EXISTS support)
    });

    // Create members table for loyalty program
    await connection.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NULL,
        points INT NOT NULL DEFAULT 0,
        tier ENUM('bronze', 'silver', 'gold', 'member', 'platinum') NOT NULL DEFAULT 'bronze',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure tier column supports all required values (in case table already existed with old ENUM)
    await connection.query(`
      ALTER TABLE members MODIFY COLUMN tier ENUM('bronze', 'silver', 'gold', 'member', 'platinum') NOT NULL DEFAULT 'bronze'
    `).catch(() => { /* ignore if already correct */ });

    // Make phone nullable so LINE-only members can register without phone first
    await connection.query(`
      ALTER TABLE members MODIFY COLUMN phone VARCHAR(20) NULL
    `).catch(() => { /* ignore if already correct */ });

    // Add optional columns for extended member profile (idempotent)
    const memberAlters = [
      `ALTER TABLE members ADD COLUMN memberNumber VARCHAR(30) NULL`,
      `ALTER TABLE members ADD COLUMN validTill DATE NULL`,
      `ALTER TABLE members ADD COLUMN lineUid VARCHAR(100) NULL`,
      `ALTER TABLE members ADD COLUMN linePictureUrl VARCHAR(500) NULL`,
      `ALTER TABLE members ADD COLUMN totalVisits INT NOT NULL DEFAULT 0`,
      `ALTER TABLE members ADD COLUMN address VARCHAR(500) NULL`,
      `ALTER TABLE members ADD COLUMN gender ENUM('male','female','other') NULL`,
    ];
    for (const sql of memberAlters) {
      await connection.query(sql).catch(() => { /* column already exists */ });
    }

    // Create loyalty_qr_codes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS loyalty_qr_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        points_value INT NOT NULL DEFAULT 10,
        label VARCHAR(255) NULL,
        expires_at DATETIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        max_uses INT NOT NULL DEFAULT 0,
        used_count INT NOT NULL DEFAULT 0,
        created_by INT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create qr_scans table (tracks who scanned what — prevents duplicate)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qr_scans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        qr_code_id INT NOT NULL,
        member_id INT NOT NULL,
        points_earned INT NOT NULL,
        scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_qr_code_id (qr_code_id),
        INDEX idx_member_id (member_id),
        UNIQUE KEY unique_member_qr (member_id, qr_code_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create points_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS points_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        points INT NOT NULL,
        type ENUM('earn', 'redeem') NOT NULL,
        description VARCHAR(255),
        qr_code_id INT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_member_id (member_id),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create coupons table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'fixed',
        discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
        min_order DECIMAL(10, 2) NOT NULL DEFAULT 0,
        points_cost INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        max_uses INT NOT NULL DEFAULT 0,
        used_count INT NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_is_active (is_active),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add points_cost column if not exists (for existing tables)
    await connection.query(`
      ALTER TABLE coupons ADD COLUMN IF NOT EXISTS points_cost INT NOT NULL DEFAULT 0
    `).catch(() => {});

    // Create member_coupons table (tracks which member claimed which coupon)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS member_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        coupon_id INT NOT NULL,
        points_spent INT NOT NULL DEFAULT 0,
        claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_member_coupon (member_id, coupon_id),
        INDEX idx_member_id (member_id),
        INDEX idx_coupon_id (coupon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add new columns to member_coupons if not exist
    await connection.query(`ALTER TABLE member_coupons ADD COLUMN IF NOT EXISTS is_used TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
    await connection.query(`ALTER TABLE member_coupons ADD COLUMN IF NOT EXISTS used_at DATETIME NULL`).catch(() => {});
    await connection.query(`ALTER TABLE member_coupons ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) NULL`).catch(() => {});
    await connection.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mc_qr_token ON member_coupons (qr_token)`).catch(() => {});
    await connection.query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_member_uses INT NOT NULL DEFAULT 1`).catch(() => {});
    await connection.query(`ALTER TABLE member_coupons DROP INDEX unique_member_coupon`).catch(() => {});

    // Create receipts table to store checkout receipt logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableNumber VARCHAR(50) NOT NULL,
        paidAt DATETIME NOT NULL,
        items JSON NOT NULL,
        bill JSON NULL,
        foodTotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        billTotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        grandTotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        qrCode VARCHAR(100) NULL,
        qrPoints INT NOT NULL DEFAULT 0,
        qrMaxUses INT NOT NULL DEFAULT 0,
        qrHours DECIMAL(5,1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tableNumber (tableNumber),
        INDEX idx_paidAt (paidAt),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS loyalty_tiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tier_key VARCHAR(50) NOT NULL UNIQUE,
        tier_name VARCHAR(100) NOT NULL,
        min_points INT NOT NULL DEFAULT 0,
        color VARCHAR(20) NOT NULL DEFAULT '#b5a99d',
        benefits JSON NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed default loyalty tiers
    const [existingTiers] = await connection.query('SELECT COUNT(*) as count FROM loyalty_tiers') as any;
    if (existingTiers[0].count === 0) {
      await connection.query(`
        INSERT INTO loyalty_tiers (tier_key, tier_name, min_points, color, benefits, sort_order) VALUES
        ('member', 'MEMBER', 0, '#b5a99d', '["สะสมคะแนนทุกการสแกน QR","รับส่วนลด 5% วันเกิด"]', 0),
        ('silver', 'SILVER', 1000, '#8a7a72', '["ทุกสิทธิ์ของ Member","รับส่วนลด 8% วันเกิด","ฟรีเครื่องดื่ม 1 แก้ว/เดือน"]', 1),
        ('gold', 'GOLD', 5000, '#F6AD55', '["ทุกสิทธิ์ของ Silver","รับส่วนลด 10% วันเกิด","ฟรีของหวาน/เดือน"]', 2)
      `);
    }

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


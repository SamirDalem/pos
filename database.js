const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

// Ensure stock_quantity column exists in products table BEFORE any inserts
function addStockQuantityColumnIfMissing(callback) {
  db.all("PRAGMA table_info(products)", (err, columns) => {
    if (err) return callback && callback();
    const hasStock = columns.some(col => col.name === 'stock_quantity');
    if (!hasStock) {
      db.run("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0", (err) => {
        if (!err) {
          console.log('Added stock_quantity column to products table.');
        }
        callback && callback();
      });
    } else {
      callback && callback();
    }
  });
}

// Ensure order_type column exists in sales table
function addOrderTypeColumnIfMissing(callback) {
  db.all("PRAGMA table_info(sales)", (err, columns) => {
    if (err) return callback && callback();
    const hasOrderType = columns.some(col => col.name === 'order_type');
    if (!hasOrderType) {
      db.run("ALTER TABLE sales ADD COLUMN order_type TEXT DEFAULT 'dine-in'", (err) => {
        if (!err) {
          console.log('Added order_type column to sales table.');
        } else {
          console.error('Failed to add order_type column:', err);
        }
        callback && callback();
      });
    } else {
      callback && callback();
    }
  });
}

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      sku TEXT UNIQUE
    )
  `, () => {
    addStockQuantityColumnIfMissing(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_amount REAL NOT NULL,
          tax_amount REAL NOT NULL,
          date_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, () => {
        // Ensure order_type column exists (fix for migration)
        addOrderTypeColumnIfMissing(() => {
          db.run(`
            CREATE TABLE IF NOT EXISTS sale_items (
              sale_id INTEGER,
              product_id INTEGER,
              quantity INTEGER,
              price_at_sale REAL,
              FOREIGN KEY(sale_id) REFERENCES sales(id),
              FOREIGN KEY(product_id) REFERENCES products(id)
            )
          `);

          // Insert sample products
          const insertSample = db.prepare("INSERT OR IGNORE INTO products (name, price, sku, stock_quantity) VALUES (?, ?, ?, ?)");
          insertSample.run('Coffee', 3.50, 'CF-001', 10);
          insertSample.run('Croissant', 2.75, 'CR-002', 5);
          insertSample.run('Sandwich', 8.99, 'SW-003', 0);
          insertSample.finalize();

          console.log('Database and tables initialized!');
        });
      });
    });
  });
});

// Utility: Delete all orders (sales and sale_items)
function deleteAllOrders(callback) {
  db.serialize(() => {
    db.run('DELETE FROM sale_items', (err) => {
      if (err) {
        console.error('Failed to delete sale_items:', err);
        callback && callback(err);
        return;
      }
      db.run('DELETE FROM sales', (err2) => {
        if (err2) {
          console.error('Failed to delete sales:', err2);
          callback && callback(err2);
          return;
        }
        console.log('All orders deleted!');
        callback && callback();
      });
    });
  });
}

// Uncomment and run ONCE to clear all orders, then comment again to avoid deleting on every start
// deleteAllOrders();

module.exports = db;
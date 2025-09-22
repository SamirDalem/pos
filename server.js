const express = require('express');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// GET all products
app.get('/api/products', (req, res) => {
  console.log('Fetching products...');
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Products fetched:', rows.length);
    res.json(rows);
  });
});

// POST a new product
app.post('/api/products', (req, res) => {
  const { name, price, sku, stock_quantity } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  db.run(
    `INSERT INTO products (name, price, sku, stock_quantity) VALUES (?, ?, ?, ?)`,
    [name, parseFloat(price), sku, parseInt(stock_quantity || 0)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Product added!', productId: this.lastID });
    }
  );
});

// DELETE a product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Product deleted!' });
  });
});

// PUT (update) a product
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, sku, stock_quantity } = req.body;
  db.run(
    'UPDATE products SET name = ?, price = ?, sku = ?, stock_quantity = ? WHERE id = ?',
    [name, price, sku, stock_quantity, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json(row);
        }
      });
    }
  );
});

// POST a new sale with inventory deduction
app.post('/api/sales', (req, res) => {
  const { items, total_amount, tax_amount, order_type = 'dine-in' } = req.body;

  // Get the next order id if table is empty (for "start from 1" logic)
  db.get("SELECT seq FROM sqlite_sequence WHERE name='sales'", (err, row) => {
    let nextOrderId = 1;
    if (!err && row && typeof row.seq === 'number') {
      nextOrderId = row.seq + 1;
    }
    // Check stock for all items first
    const checkStockPromises = items.map(item => {
      return new Promise((resolve, reject) => {
        db.get("SELECT name, stock_quantity FROM products WHERE id = ?", [item.id], (err, row) => {
          if (err) reject(err);
          else resolve({ item, stock: row });
        });
      });
    });

    Promise.all(checkStockPromises)
      .then(results => {
        for (const result of results) {
          if (!result.stock) {
            return res.status(404).json({ error: `Product ${result.item.id} not found.` });
          }
          if (result.stock.stock_quantity < result.item.quantity) {
            return res.status(400).json({
              error: `Not enough stock for ${result.stock.name}. Only ${result.stock.stock_quantity} left.`
            });
          }
        }

        // If stock is OK, proceed with transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          // Insert main sale record
          db.run(
            `INSERT INTO sales (total_amount, tax_amount, order_type) VALUES (?, ?, ?)`,
            [total_amount, tax_amount, order_type],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
              }
              const saleId = this.lastID || nextOrderId;

              // Insert sale items and update inventory
              const insertItem = db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)`);
const updateStock = db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`);

              items.forEach(item => {
                insertItem.run(saleId, item.id, item.quantity, item.price);
                updateStock.run(item.quantity, item.id);
              });

              insertItem.finalize();
              updateStock.finalize((err) => {
                if (err) {
                  db.run('ROLLBACK');
                  res.status(500).json({ error: err.message });
                } else {
                  db.run('COMMIT');
                  res.json({
                    message: 'Sale completed!',
                    saleId: saleId,
                    total: total_amount,
                    orderType: order_type
                  });
                }
              });
            }
          );
        });
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
});

// GET all orders with items
app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM sales ORDER BY id DESC", (err, sales) => {
    if (err) {
      console.error('Error fetching sales:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!sales || sales.length === 0) {
      // If no sales, reset the auto-increment counter so next order starts from 1
      db.run("DELETE FROM sqlite_sequence WHERE name='sales'", () => {
        return res.json([]);
      });
      return;
    }
    db.all(`
      SELECT si.sale_id, si.product_id, si.quantity, p.name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
    `, (err, items) => {
      if (err) {
        console.error('Error fetching sale_items:', err);
        return res.status(500).json({ error: err.message });
      }
      const salesWithItems = sales.map(sale => ({
        ...sale,
        items: items.filter(i => i.sale_id === sale.id)
      }));
      res.json(salesWithItems);
    });
  });
});

// DELETE an order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('DELETE FROM sale_items WHERE sale_id = ?', [id]);
    db.run('DELETE FROM sales WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Order deleted!' });
    });
  });
});

// PUT (edit) an order (only total_amount and order_type for simplicity)
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { total_amount, order_type } = req.body;
  db.run(
    'UPDATE sales SET total_amount = ?, order_type = ? WHERE id = ?',
    [total_amount, order_type, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Order updated!' });
    }
  );
});

// GET total sales and order count for a given period
app.get('/api/daystats', (req, res) => {
  // period can be 'today', '3days', '7days', default to 'today'
  const period = req.query.period || 'today';

  let dateFilter;
  switch (period) {
    case '3days':
      dateFilter = "date(date_time, 'localtime') >= date('now','localtime','-2 days')";
      break;
    case '7days':
      dateFilter = "date(date_time, 'localtime') >= date('now','localtime','-6 days')";
      break;
    case 'today':
    default:
      dateFilter = "date(date_time, 'localtime') = date('now','localtime')";
  }

  const query = `
    SELECT 
      IFNULL(SUM(total_amount),0) as totalSales, 
      COUNT(*) as orderCount 
    FROM sales 
    WHERE ${dateFilter}
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error('Error in /api/daystats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      totalSales: row.totalSales,
      orderCount: row.orderCount
    });
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import PaymentPage from './components/PaymentPage';

// Set base URL for API calls
axios.defaults.baseURL = 'http://localhost:5000';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState('cart');
  const [saleInfo, setSaleInfo] = useState(null);
  const [orderType, setOrderType] = useState('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showItemList, setShowItemList] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [newProduct, setNewProduct] = useState({ name: '', price: '', sku: '', stock_quantity: '' });
  const [confirmation, setConfirmation] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [editOrderId, setEditOrderId] = useState(null);
  const [editOrderData, setEditOrderData] = useState({});
  const [dayStats, setDayStats] = useState({ totalSales: 0, orderCount: 0 });

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const response = await axios.get('/api/test');
      console.log('Backend connection:', response.data);
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error);
      setError('Cannot connect to server. Make sure the backend is running on port 5000.');
      return false;
    }
  };

  // Fetch products on mount
  useEffect(() => {
    const fetchData = async () => {
      const isConnected = await testBackendConnection();
      if (isConnected) fetchProducts();
    };
    fetchData();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setError('');
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products. " + (error.message || ''));
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data);
    } catch (err) {
      alert('Failed to fetch orders');
    }
  };

  // Fetch day stats (period = today/3days/7days)
  const fetchDayStats = async (period = 'today') => {
    try {
      const res = await axios.get('/api/daystats', { params: { period } });
      setDayStats(res.data);
    } catch (err) {
      setDayStats({ totalSales: 0, orderCount: 0 });
    }
  };

  useEffect(() => {
    fetchDayStats();
  }, [confirmation, currentPage, showOrders, showItemList]);

  // Cart functions
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const availableQty = product.stock_quantity;
    if (availableQty < 1) {
      alert(`Sorry, ${product.name} is out of stock!`);
      return;
    }
    if (existingItem) {
      if (existingItem.quantity >= availableQty) {
        alert(`Cannot add more. Only ${availableQty} left in stock.`);
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const increaseQuantity = (productId) => {
    const item = cart.find(item => item.id === productId);
    const product = products.find(p => p.id === productId);
    if (item && product && item.quantity < product.stock_quantity) {
      setCart(cart.map(item => item.id === productId ? { ...item, quantity: item.quantity + 1 } : item));
    } else if (item && product) {
      alert(`Only ${product.stock_quantity} available in stock.`);
    }
  };

  const decreaseQuantity = (productId) => {
    setCart(cart.map(item => item.id === productId && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item));
  };

  const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));

  const calculateTotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    setCurrentPage('payment');
  };

  // Products CRUD
  const removeProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`/api/products/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
      setCart(cart.filter(item => item.id !== productId));
    } catch (error) {
      alert('Failed to delete product: ' + (error.response?.data?.error || error.message));
    }
  };

  const editProduct = async (updatedProduct) => {
    try {
      const response = await axios.put(`/api/products/${updatedProduct.id}`, updatedProduct);
      setProducts(products.map(p => p.id === updatedProduct.id ? response.data : p));
    } catch (error) {
      alert('Failed to update product: ' + (error.response?.data?.error || error.message));
    }
  };

  // Orders
  const openOrders = () => {
    setShowOrders(true);
    fetchOrders();
    fetchDayStats();
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await axios.delete(`/api/orders/${orderId}`);
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  const saveOrderEdit = async () => {
    try {
      await axios.put(`/api/orders/${editOrderId}`, editOrderData);
      setOrders(orders.map(o => o.id === editOrderId ? { ...o, ...editOrderData } : o));
      setEditOrderId(null);
      setEditOrderData({});
    } catch (err) {
      alert('Failed to update order');
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>☕ POS System</h1>
        <div className="order-type-toggle">
          <button className="item-list-btn" onClick={() => setShowItemList(true)}>🗂️ Item List</button>
          <button className="item-list-btn" onClick={openOrders}>📋 Orders</button>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <h3>⚠️ Connection Error</h3>
          <p>{error}</p>
          <button onClick={fetchProducts}>Retry</button>
        </div>
      )}

      {/* Cart Page */}
      {currentPage === 'cart' && !error && (
        <main className="pos-container">
          <div className="main-content">
            <section className="product-section">
              <h2>Menu</h2>
              <div className="product-grid">
                {products.map(product => (
                  <div key={product.id} className={`product-card ${product.stock_quantity === 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(product)}>
                    <h3>{product.name}</h3>
                    <p className="price">${product.price}</p>
                    <p className="stock">{product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} available`}</p>
                    {product.stock_quantity === 0 && <div className="out-of-stock-overlay">Out of Stock</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className="cart-section">
              <h2>Order Cart</h2>
              <div className="cart-items">
                {cart.length === 0 ? (
                  <p className="empty-cart">Your cart is empty</p>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div className="item-info">
                          <h4>{item.name}</h4>
                          <p>${item.price} each</p>
                        </div>
                        <div className="quantity-controls">
                          <button onClick={() => decreaseQuantity(item.id)} className="quantity-btn">-</button>
                          <span className="quantity">{item.quantity}</span>
                          <button onClick={() => increaseQuantity(item.id)} className="quantity-btn">+</button>
                          <button onClick={() => removeFromCart(item.id)} className="remove-btn">×</button>
                        </div>
                        <div className="item-total">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                    <div className="cart-total">
                      <h3>Total: ${calculateTotal()}</h3>
                    </div>
                    <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="checkout-btn">Proceed to Payment →</button>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Payment Page */}
      {currentPage === 'payment' && !error && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500, width: '100%' }}>
            <PaymentPage
              saleInfo={{ saleId: null, total: calculateTotal(), orderType }}
              onPaymentComplete={async (method, type) => {
                setLoading(true);
                try {
                  const response = await axios.post('/api/sales', { items: cart, total_amount: calculateTotal(), tax_amount: 0, order_type: type });
                  setCart([]);
                  setSaleInfo(null);
                  fetchProducts();
                  setCurrentPage('confirmation');
                  setConfirmation({
                    saleId: response.data.saleId,
                    total: response.data.total,
                    orderType: response.data.orderType || type,
                    paymentMethod: method
                  });
                } catch (error) {
                  alert("Checkout failed: " + (error.response?.data?.error || error.message));
                } finally { setLoading(false); }
              }}
              onCancel={() => { setCurrentPage('cart'); setSaleInfo(null); }}
            />
          </div>
        </div>
      )}

      {/* Order Confirmation */}
      {currentPage === 'confirmation' && confirmation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div className="order-confirmed-check">✅</div>
            <h2 style={{ color: '#48bb78', marginBottom: '1rem' }}>Order Confirmed!</h2>
            <div style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              <div><strong>Order Number:</strong> #{confirmation.saleId}</div>
              <div><strong>Total Paid:</strong> ${confirmation.total}</div>
              <div><strong>Order Type:</strong> {confirmation.orderType === 'dine-in' ? 'Dine In' : 'Take Out'}</div>
              <div><strong>Payment Method:</strong> {confirmation.paymentMethod === 'cash' ? 'Cash' : 'Card'}</div>
            </div>
            <button className="submit-btn" style={{ width: '100%' }} onClick={() => { setCurrentPage('cart'); setConfirmation(null); }}>Return Home</button>
          </div>
        </div>
      )}

      {/* Item List */}
      {showItemList && (
        <div className="modal-overlay" onClick={() => setShowItemList(false)}>
          <div className="modal-content" style={{ maxWidth: 700, width: '100%' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowItemList(false)}>×</button>
            <h2>Product List</h2>
            <table className="item-list-table">
              <thead>
                <tr>
                  <th>Name</th><th>Price</th><th>SKU</th><th>Stock</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Name" /></td>
                  <td><input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Price" /></td>
                  <td><input value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="SKU" /></td>
                  <td><input type="number" value={newProduct.stock_quantity} onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} placeholder="Stock" /></td>
                  <td>
                    <button onClick={async () => {
                      try {
                        await axios.post('/api/products', newProduct);
                        setNewProduct({ name: '', price: '', sku: '', stock_quantity: '' });
                        fetchProducts();
                      } catch (err) { alert('Failed to add product.'); }
                    }}>Add</button>
                  </td>
                </tr>
                {products.map(product => (
                  editRow === product.id ? (
                    <tr key={product.id}>
                      <td><input value={editRowData.name} onChange={e => setEditRowData({ ...editRowData, name: e.target.value })} /></td>
                      <td><input type="number" value={editRowData.price} onChange={e => setEditRowData({ ...editRowData, price: e.target.value })} /></td>
                      <td><input value={editRowData.sku} onChange={e => setEditRowData({ ...editRowData, sku: e.target.value })} /></td>
                      <td><input type="number" value={editRowData.stock_quantity} onChange={e => setEditRowData({ ...editRowData, stock_quantity: e.target.value })} /></td>
                      <td>
                        <button onClick={() => { editProduct(editRowData); setEditRow(null); }}>Save</button>
                        <button onClick={() => setEditRow(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={product.id}>
                      <td>{product.name}</td><td>${product.price}</td><td>{product.sku}</td><td>{product.stock_quantity}</td>
                      <td>
                        <button onClick={() => { setEditRow(product.id); setEditRowData(product); }}>Edit</button>
                        <button onClick={() => removeProduct(product.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrders && (
        <div className="modal-overlay" onClick={() => setShowOrders(false)}>
          <div className="modal-content" style={{ maxWidth: 700, width: '100%' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowOrders(false)}>×</button>
            <h2>Orders</h2>

            {/* Period Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <button onClick={() => fetchDayStats('today')}>Today</button>
              <button onClick={() => fetchDayStats('3days')}>Last 3 Days</button>
              <button onClick={() => fetchDayStats('7days')}>Last 7 Days</button>
            </div>

            {/* Day Stats */}
            <div style={{ marginBottom: '1rem', color: '#2d3748', fontWeight: 500, fontSize: '1.1rem', background: '#f7fafc', borderRadius: 8, padding: '0.7rem 1rem' }}>
              <span>Total Sale: <span style={{ color: '#48bb78', fontWeight: 700 }}>${Number(dayStats.totalSales).toFixed(2)}</span></span>
              <span style={{ marginLeft: 32 }}>Orders: <span style={{ color: '#667eea', fontWeight: 700 }}>{dayStats.orderCount}</span></span>
            </div>

            {/* Search */}
            <input style={{ marginBottom: 10, width: '100%', padding: 8 }} placeholder="Search by Order Number" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />

            {/* Orders Table */}
            <div className="orders-table-scroll">
              <table className="item-list-table">
                <thead>
                  <tr>
                    <th>Order #</th><th>Total</th><th>Order Type</th><th>Date</th><th>Items</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(order => orderSearch === '' || String(order.id).includes(orderSearch)).map(order => (
                    editOrderId === order.id ? (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td><input type="number" value={editOrderData.total_amount} onChange={e => setEditOrderData({ ...editOrderData, total_amount: e.target.value })} /></td>
                        <td>
                          <select value={editOrderData.order_type} onChange={e => setEditOrderData({ ...editOrderData, order_type: e.target.value })}>
                            <option value="dine-in">Dine In</option>
                            <option value="take-out">Take Out</option>
                          </select>
                        </td>
                        <td>{order.date_time}</td>
                        <td>{order.items?.map(i => <div key={i.product_id}>{i.name} x{i.quantity}</div>)}</td>
                        <td>
                          <button onClick={saveOrderEdit}>Save</button>
                          <button onClick={() => setEditOrderId(null)}>Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={order.id}>
                        <td>#{order.id}</td><td>${order.total_amount}</td><td>{order.order_type}</td><td>{order.date_time}</td>
                        <td>{order.items?.map(i => <div key={i.product_id}>{i.name} x{i.quantity}</div>)}</td>
                        <td>
                          <button onClick={() => { setEditOrderId(order.id); setEditOrderData({ total_amount: order.total_amount, order_type: order.order_type }); }}>Edit</button>
                          <button onClick={() => deleteOrder(order.id)}>Delete</button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

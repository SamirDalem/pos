import React, { useState } from 'react';
import axios from 'axios';

function AddProduct({ onProductAdded, removeProduct, editProduct }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sku: '',
    stock_quantity: ''
  });
  const [isFormVisible, setFormVisible] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [editData, setEditData] = useState({});
  const [products, setProducts] = useState([]);

  // Fetch products for management UI
  React.useEffect(() => {
    axios.get('/api/products').then(res => setProducts(res.data));
  }, [onProductAdded]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/products', formData);
      alert('Product Added!');
      setFormData({ name: '', price: '', sku: '', stock_quantity: '' });
      setFormVisible(false);
      if (onProductAdded) onProductAdded();
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product: " + (error.response?.data?.error || error.message));
    }
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editProduct(editData);
    setShowEdit(null);
  };

  return (
    <div className="add-product">
      <button 
        onClick={() => setFormVisible(!isFormVisible)}
        className="toggle-form-btn"
      >
        {isFormVisible ? 'Cancel' : '+ Add New Product'}
      </button>

      {isFormVisible && (
        <form onSubmit={handleSubmit} className="product-form">
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="price"
            step="0.01"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="sku"
            placeholder="SKU (Optional)"
            value={formData.sku}
            onChange={handleChange}
          />
          <input
            type="number"
            name="stock_quantity"
            placeholder="Initial Stock"
            value={formData.stock_quantity}
            onChange={handleChange}
          />
          <button type="submit" className="submit-btn">Add Product</button>
        </form>
      )}

      <h3>Manage Products</h3>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            {showEdit === product.id ? (
              <form onSubmit={handleEditSubmit} style={{ display: 'inline' }}>
                <input name="name" value={editData.name || ''} onChange={handleEditChange} placeholder="Name" />
                <input name="price" value={editData.price || ''} onChange={handleEditChange} placeholder="Price" />
                <input name="sku" value={editData.sku || ''} onChange={handleEditChange} placeholder="SKU" />
                <input name="stock_quantity" value={editData.stock_quantity || ''} onChange={handleEditChange} placeholder="Stock" />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowEdit(null)}>Cancel</button>
              </form>
            ) : (
              <>
                {product.name} (${product.price}) [Stock: {product.stock_quantity}] 
                <button onClick={() => { setShowEdit(product.id); setEditData(product); }}>Edit</button>
                <button onClick={() => removeProduct(product.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AddProduct;
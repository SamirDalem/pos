import React, { useState } from 'react';

function PaymentPage({ saleInfo, onPaymentComplete, onCancel }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderType, setOrderType] = useState(saleInfo.orderType || 'dine-in');

  const handleSubmit = (e) => {
    e.preventDefault();
    onPaymentComplete(paymentMethod, orderType);
  };

  return (
    <div className="payment-page">
      <div className="payment-header">
        <h2>Complete Payment</h2>
      </div>

      <div className="payment-details">
        {saleInfo.saleId && (
          <div className="detail-row">
            <span className="label">Order ID:</span>
            <span className="value">#{saleInfo.saleId}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="label">Total Amount:</span>
          <span className="value">${saleInfo.total}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="payment-method">
          <h3>Order Type</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={`method-option${orderType === 'dine-in' ? ' selected' : ''}`}
              style={{
                background: orderType === 'dine-in' ? '#667eea' : '#f7fafc',
                color: orderType === 'dine-in' ? '#fff' : '#2d3748',
                border: orderType === 'dine-in' ? '2px solid #667eea' : '2px solid #e2e8f0'
              }}
              onClick={() => setOrderType('dine-in')}
            >
              Dine In
            </button>
            <button
              type="button"
              className={`method-option${orderType === 'take-out' ? ' selected' : ''}`}
              style={{
                background: orderType === 'take-out' ? '#667eea' : '#f7fafc',
                color: orderType === 'take-out' ? '#fff' : '#2d3748',
                border: orderType === 'take-out' ? '2px solid #667eea' : '2px solid #e2e8f0'
              }}
              onClick={() => setOrderType('take-out')}
            >
              Take Out
            </button>
          </div>
          <h3>Select Payment Method</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className={`method-option${paymentMethod === 'card' ? ' selected' : ''}`}
              style={{
                background: paymentMethod === 'card' ? '#667eea' : '#f7fafc',
                color: paymentMethod === 'card' ? '#fff' : '#2d3748',
                border: paymentMethod === 'card' ? '2px solid #667eea' : '2px solid #e2e8f0'
              }}
              onClick={() => setPaymentMethod('card')}
            >
              Credit/Debit Card
            </button>
            <button
              type="button"
              className={`method-option${paymentMethod === 'cash' ? ' selected' : ''}`}
              style={{
                background: paymentMethod === 'cash' ? '#667eea' : '#f7fafc',
                color: paymentMethod === 'cash' ? '#fff' : '#2d3748',
                border: paymentMethod === 'cash' ? '2px solid #667eea' : '2px solid #e2e8f0'
              }}
              onClick={() => setPaymentMethod('cash')}
            >
              Cash
            </button>
          </div>
        </div>

        <div className="payment-actions">
          <button 
            type="button" 
            onClick={onCancel}
            className="back-btn"
          >
            ← Back to Cart
          </button>
          <button 
            type="submit"
            className="confirm-btn"
          >
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  );
}

export default PaymentPage;
import React from 'react';
import { CheckCircle, Printer, ShoppingBag } from 'lucide-react';
import { Order, ShopSettings } from '../types';

interface SuccessViewProps {
  order: Order;
  settings: ShopSettings;
  onReturnToStore: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  order,
  settings,
  onReturnToStore,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '40px 24px', textAlign: 'center' }}>
      
      {/* Icon Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <CheckCircle size={72} style={{ color: 'var(--success-color)' }} />
        
        <div>
          <h1 style={{ color: 'var(--success-color)', marginBottom: '8px', fontSize: '2rem' }}>Payment Successful!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>We have received your payment and are packaging your order.</p>
        </div>

        {/* Invoice detail sheet */}
        <div 
          style={{ 
            width: '100%', 
            border: '2px dashed var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: '24px', 
            backgroundColor: 'var(--bg-primary)',
            textAlign: 'left',
            marginTop: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ORDER NUMBER:</span>
              <div style={{ fontWeight: '900', fontSize: '1.25rem' }}>{order.id}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>PAYMENT DATE:</span>
              <div style={{ fontWeight: 'bold' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Delivery section */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>DELIVER TO:</span>
            <div style={{ fontWeight: 'bold' }}>{order.customerName}</div>
            <div style={{ fontSize: '0.95rem' }}>{order.customerAddress}</div>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Phone: {order.customerPhone}</div>
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>ITEMS BOUGHT:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {order.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span>{it.name} <span style={{ color: 'var(--text-secondary)' }}>({it.variantDetails}) x{it.quantity}</span></span>
                  <span style={{ fontWeight: 'bold' }}>KSh {(it.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total paid */}
          <div 
            style={{ 
              borderTop: '2px solid var(--border-color)', 
              paddingTop: '12px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '1.35rem',
              color: 'var(--accent-primary)'
            }}
          >
            <span>Total Paid:</span>
            <span>KSh {order.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Print & Return */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '16px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePrint}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Printer size={20} />
            <span>Print Receipt</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={onReturnToStore}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ShoppingBag size={20} />
            <span>Return to Shop</span>
          </button>
        </div>

      </div>
    </div>
  );
};

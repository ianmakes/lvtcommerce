import React from 'react';
import { CheckCircle, Printer, ShoppingBag } from 'lucide-react';
import { Order, ShopSettings } from '../types';
import { navigate } from '../Router';

interface SuccessViewProps {
  order: Order;
  settings: ShopSettings;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  order,
  settings,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '40px 0', textAlign: 'center' }}>
      
      {/* Icon Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', border: '1px solid var(--color-hairline)', padding: '32px' }}>
        <CheckCircle size={64} style={{ color: 'var(--color-success)' }} />
        
        <div>
          <h1 className="font-heading-lg" style={{ color: 'var(--color-success)', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Successful</h1>
          <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px' }}>We have received your payment for your order at {settings.shopName || "GoldenCare Market"} and are preparing it.</p>
        </div>

        {/* Invoice detail sheet */}
        <div 
          style={{ 
            width: '100%', 
            border: '1px solid var(--color-hairline-soft)', 
            borderRadius: 'var(--radius-none)', 
            padding: '24px', 
            backgroundColor: 'var(--color-soft-cloud)',
            textAlign: 'left',
            marginTop: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600 }}>ORDER NUMBER:</span>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>{order.id}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600 }}>PAYMENT DATE:</span>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Delivery section */}
          <div style={{ marginBottom: '16px', fontSize: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600, marginBottom: '2px' }}>DELIVER TO:</span>
            <div style={{ fontWeight: 600 }}>{order.customerName}</div>
            <div>{order.customerAddress}</div>
            <div style={{ color: 'var(--text-mute)', marginTop: '2px' }}>Phone: {order.customerPhone}</div>
          </div>

          {/* Notes section */}
          {order.notes && (
            <div style={{ marginBottom: '16px', borderTop: '1px dashed var(--color-hairline)', paddingTop: '12px', fontSize: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600, marginBottom: '2px' }}>DELIVERY NOTES:</span>
              <div style={{ fontStyle: 'italic', color: 'var(--text-charcoal)' }}>"{order.notes}"</div>
            </div>
          )}

          {/* Items */}
          <div style={{ borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600, marginBottom: '8px' }}>ITEMS BOUGHT:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              {order.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{it.name} <span style={{ color: 'var(--text-mute)' }}>({it.variantDetails}) x{it.quantity}</span></span>
                  <span style={{ fontWeight: 600 }}>KSh {(it.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total paid */}
          <div 
            style={{ 
              borderTop: '1px solid var(--color-hairline)', 
              paddingTop: '12px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '18px',
              color: 'var(--color-ink)'
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
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/account?tab=orders')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ShoppingBag size={16} />
            <span>See my order</span>
          </button>
        </div>

      </div>
    </div>
  );
};

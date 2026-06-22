import React from 'react';
import { ArrowLeft, Hourglass } from 'lucide-react';
import { navigate } from '../Router';

interface ComingSoonPageProps {
  title: string;
  settings?: any;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, settings }) => {
  return (
    <div className="container" style={{ padding: '80px 0 120px', maxWidth: '600px', textAlign: 'center', color: 'var(--color-ink)' }}>
      <div 
        style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--color-soft-cloud)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px',
          border: '1px solid var(--color-hairline-soft)'
        }}
      >
        <Hourglass size={28} />
      </div>

      <span className="font-caption-md" style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-mute)' }}>
        {(settings?.shopName || 'GoldenCare')} System &bull; Expansion
      </span>
      
      <h1 className="font-heading-xl" style={{ marginTop: '12px', marginBottom: '16px', textTransform: 'uppercase' }}>
        {title}
      </h1>

      <p className="font-body-md" style={{ color: 'var(--text-mute)', marginBottom: '32px', lineHeight: 1.6 }}>
        We are currently upgrading our digital storefront to integrate the {title.toLowerCase()} service module. 
        Structural material testing and API configurations are underway. Estimated availability: Q3 2026.
      </p>

      <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--color-hairline-soft)', marginBottom: '32px' }} />

      <button 
        type="button" 
        className="btn btn-primary" 
        onClick={() => navigate('/shop')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
      >
        <ArrowLeft size={16} />
        <span>Return to Shop</span>
      </button>
    </div>
  );
};

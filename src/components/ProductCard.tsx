import React from 'react';
import { Product, ShopSettings } from '../types';

interface ProductCardProps {
  product: Product;
  settings: ShopSettings;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings,
  onSelectProduct,
}) => {
  const formattedPrice = product.basePrice.toLocaleString();
  const hasVariants = product.variants && product.variants.length > 0;
  const priceDisplay = hasVariants 
    ? `From ₦${formattedPrice}` 
    : `₦${formattedPrice}`;

  return (
    <article className="card prod-card">
      <div className="prod-img-container">
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
          alt={product.name} 
          className="prod-img"
          loading="lazy"
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '12px' }}>
        <span className="prod-badge" style={{ margin: 0 }}>{product.category}</span>
      </div>

      <h3 className="prod-title" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{product.name}</h3>
      <p className="prod-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{product.description}</p>
      
      <div className="prod-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
        <span className="prod-price" style={{ color: 'var(--accent-primary)', fontSize: '1.35rem', fontWeight: 'bold' }}>
          {priceDisplay}
        </span>
        <button 
          className="btn btn-primary btn-small"
          onClick={() => onSelectProduct(product)}
          style={{ minWidth: '130px' }}
        >
          View Details
        </button>
      </div>
    </article>
  );
};

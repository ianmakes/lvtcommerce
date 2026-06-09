import React from 'react';
import { Star, Heart } from 'lucide-react';
import { Product, ShopSettings } from '../types';

interface ProductCardProps {
  product: Product;
  settings: ShopSettings;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
}) => {
  const formattedPrice = product.basePrice.toLocaleString();
  const hasVariants = product.variants && product.variants.length > 0;
  const priceDisplay = hasVariants 
    ? `From KSh ${formattedPrice}` 
    : `KSh ${formattedPrice}`;

  const rating = product.rating || 0;
  const reviewCount = product.reviewCount || 0;

  // Render star ratings
  const renderStars = () => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Star key={i} size={14} fill="var(--gold-primary)" style={{ color: 'var(--gold-primary)' }} />);
      } else if (i - 0.5 <= rating) {
        stars.push(
          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <Star size={14} style={{ color: 'var(--border-strong)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={14} fill="var(--gold-primary)" style={{ color: 'var(--gold-primary)' }} />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} size={14} style={{ color: 'var(--border-strong)' }} />);
      }
    }
    return stars;
  };

  return (
    <article className="card prod-card" style={{ position: 'relative' }}>
      {/* Promo Badge */}
      {product.badge && (
        <span 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '20px', 
            backgroundColor: 'var(--accent-primary)', 
            color: 'var(--text-inverse)', 
            padding: '4px 10px', 
            borderRadius: '4px', 
            fontSize: '0.75rem', 
            fontWeight: 'bold',
            zIndex: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {product.badge}
        </span>
      )}

      {/* Wishlist Heart Icon Toggle Button */}
      <button
        type="button"
        className="wishlist-toggle-btn"
        onClick={(e) => onToggleWishlist(product.id, e)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)',
        }}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart 
          size={18} 
          fill={isWishlisted ? "var(--warning-color)" : "none"} 
          style={{ 
            color: isWishlisted ? "var(--warning-color)" : "var(--text-secondary)",
            transition: 'transform 0.2s ease',
          }} 
        />
      </button>

      <div className="prod-img-container" onClick={() => onSelectProduct(product)} style={{ cursor: 'pointer' }}>
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
          alt={product.name} 
          className="prod-img"
          loading="lazy"
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
        <span className="prod-badge" style={{ margin: 0 }}>{product.category}</span>
        
        {/* Star rating summary */}
        {reviewCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'flex' }}>{renderStars()}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>({reviewCount})</span>
          </div>
        )}
      </div>

      <h3 className="prod-title" onClick={() => onSelectProduct(product)} style={{ fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {product.name}
      </h3>
      <p className="prod-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
        {product.description}
      </p>
      
      <div className="prod-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
        <span className="prod-price" style={{ color: 'var(--accent-primary)', fontSize: '1.3rem', fontWeight: 'bold' }}>
          {priceDisplay}
        </span>
        <button 
          className="btn btn-primary btn-small"
          onClick={() => onSelectProduct(product)}
          style={{ minWidth: '120px' }}
        >
          View Details
        </button>
      </div>
    </article>
  );
};

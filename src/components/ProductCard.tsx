import React from 'react';
import { Heart } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
}) => {
  const formattedPrice = product.basePrice.toLocaleString();
  const hasVariants = product.variants && product.variants.length > 0;

  // Color hex mapper for product attributes
  const getColorHex = (colorName: string) => {
    switch (colorName.toLowerCase()) {
      case 'stealth black': return '#111111';
      case 'matte carbon': return '#4b4b4d';
      case 'cyber silver': return '#cacacb';
      case 'standard': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  };

  // Extract color options if they exist
  const colorAttribute = product.attributes?.find(attr => attr.name.toLowerCase() === 'color');
  const colors = colorAttribute ? colorAttribute.options : [];

  // Simulated Sale logic
  const isOnSale = product.id === 'prod-magnify';
  const originalPrice = isOnSale ? 10000 : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigating if clicking the heart button
    const target = e.target as HTMLElement;
    if (target.closest('.btn-icon-circular')) {
      return;
    }
    onSelectProduct(product);
  };

  return (
    <article className="prod-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="prod-img-container">
        {/* Promo Badge */}
        {product.badge && (
          <span className="badge-promo">{product.badge}</span>
        )}

        {/* Wishlist Button (Circular Icon Button) */}
        <button
          type="button"
          className="btn-icon-circular"
          onClick={(e) => onToggleWishlist(product.id, e)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart 
            size={18} 
            fill={isWishlisted ? "var(--color-sale)" : "none"} 
            style={{ 
              color: isWishlisted ? "var(--color-sale)" : "var(--color-ink)",
            }} 
          />
        </button>

        <img 
          src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
          alt={product.name} 
          className="prod-img"
          loading="lazy"
        />
      </div>

      <div className="prod-card-metadata">
        {/* Color Swatch Dots */}
        {colors.length > 0 && (
          <div className="swatch-dots" style={{ marginBottom: '4px' }}>
            {colors.map((color, idx) => (
              <span 
                key={color} 
                className={`swatch-dot ${color.toLowerCase() === 'cyber silver' ? 'has-light-border' : ''} ${idx === 0 ? 'active' : ''}`}
                style={{ backgroundColor: getColorHex(color) }}
                title={color}
              />
            ))}
          </div>
        )}

        <span className="prod-card-category">{product.category}</span>
        <h3 className="prod-card-title">{product.name}</h3>
        
        <div className="prod-card-price-row">
          {isOnSale && originalPrice ? (
            <>
              <span className="price-sale">KSh {product.basePrice.toLocaleString()}</span>
              <span className="price-original">KSh {originalPrice.toLocaleString()}</span>
              <span className="price-percent">15% off</span>
            </>
          ) : (
            <span className="price-regular">
              {hasVariants ? `From KSh ${formattedPrice}` : `KSh ${formattedPrice}`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

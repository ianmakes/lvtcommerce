import React from 'react';
import { Heart } from 'lucide-react';
import { Product } from '../types';
import { navigate } from '../Router';


interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  viewMode?: 'grid' | 'list';
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
  viewMode = 'grid',
  onAddToCart,
  onQuickView,
}) => {
  const formattedPrice = product.basePrice.toLocaleString();
  const hasVariants = product.variants && product.variants.length > 0;

  // Extract color options if they exist
  const colorAttribute = product.attributes?.find(attr => attr.name.toLowerCase() === 'color');
  const colors = colorAttribute ? colorAttribute.options : [];

  // Color hex mapper for product attributes
  const getColorHex = (colorName: string) => {
    const customHex = colorAttribute?.colorValues?.[colorName];
    if (customHex) return customHex;
    switch (colorName.toLowerCase()) {
      case 'stealth black': return '#111111';
      case 'matte carbon': return '#4b4b4d';
      case 'cyber silver': return '#cacacb';
      case 'standard': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  };

  // Sale logic
  const isOnSale = !!(product.salePrice && product.salePrice > 0 && product.salePrice < product.basePrice);
  const originalPrice = isOnSale ? product.basePrice : null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent navigating if clicking any overlay buttons or the wishlist heart
    if (target.closest('.btn-icon-circular') || target.closest('.prod-card-hover-actions')) {
      return;
    }
    onSelectProduct(product);
    navigate(`/product/${product.id}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) {
      onQuickView(product);
    } else {
      onAddToCart(product);
    }
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <article className={`prod-card ${viewMode === 'list' ? 'list-view' : ''} ${product.isFeatured ? 'is-featured' : ''}`} onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="prod-img-container">
        {/* Featured Badge */}
        {product.isFeatured && (
          <span className="deal-badge-featured" style={{ position: 'absolute', top: '12px', left: '12px', right: 'auto' }}>
            FEATURED
          </span>
        )}

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

        {/* Hover Action Overlay */}
        <div className="prod-card-hover-actions">
          <button
            type="button"
            className="btn btn-primary btn-small btn-full"
            onClick={handleAddToCartClick}
            style={{ fontSize: '13px', fontWeight: 600, height: '36px', minHeight: '36px' }}
          >
            {hasVariants ? "Choose Option" : "Add to Cart"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small btn-full"
            onClick={handleQuickViewClick}
            style={{ fontSize: '13px', fontWeight: 600, height: '36px', minHeight: '36px' }}
          >
            Quick View
          </button>
        </div>
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

        <span className="prod-card-category">
          {(product.categories && product.categories.length > 0) ? product.categories[0] : product.category}
        </span>
        <h3 className="prod-card-title">{product.name}</h3>

        {/* Subtle Review Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-mute)', margin: '4px 0 6px' }}>
          <div style={{ display: 'flex', color: '#dba617' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} style={{ fontSize: '12px', lineHeight: 1 }}>
                {star <= Math.round(product.rating || 0) ? '★' : '☆'}
              </span>
            ))}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-mute)' }}>
            ({product.reviewCount || 0})
          </span>
        </div>
        
        {/* Description excerpt — only shown in list view */}
        {viewMode === 'list' && (
          <p className="prod-card-description">{product.description}</p>
        )}

        <div className="prod-card-price-row">
          {isOnSale && originalPrice && product.salePrice ? (
            <>
              <span className="price-sale" style={{ color: 'var(--color-sale)', fontWeight: 700 }}>KSh {product.salePrice.toLocaleString()}</span>
              <span className="price-original">KSh {originalPrice.toLocaleString()}</span>
              <span className="price-percent">{Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)}% off</span>
            </>
          ) : (
            <span className="price-regular">
              {hasVariants ? `From KSh ${formattedPrice}` : `KSh ${formattedPrice}`}
            </span>
          )}
        </div>

        {/* View Details link — only shown in list view */}
        {viewMode === 'list' && (
          <span className="prod-card-view-link">View Details &rarr;</span>
        )}
      </div>
    </article>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ArrowRight } from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types';
import { navigate } from '../Router';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeImage, setActiveImage] = useState('');

  // Reset/Initialize state when product changes
  useEffect(() => {
    if (!product) return;

    if (product.attributes && product.attributes.length > 0) {
      const initialOptions: Record<string, string> = {};
      product.attributes.forEach(attr => {
        if (attr.options && attr.options.length > 0) {
          initialOptions[attr.name] = attr.options[0];
        }
      });
      setSelectedOptions(initialOptions);
    } else {
      setSelectedOptions({});
    }
    
    setQuantity(1);
    setErrorMsg('');
    setSuccessMsg('');
    setActiveImage(product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500');
  }, [product]);

  // Find matching variant whenever selections change
  useEffect(() => {
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      const matched = product.variants.find(v => {
        return Object.entries(v.options).every(([key, val]) => {
          return selectedOptions[key] === val;
        });
      });
      setCurrentVariant(matched || null);

      if (matched && matched.image) {
        setActiveImage(matched.image);
      }
    } else {
      setCurrentVariant(null);
    }
  }, [selectedOptions, product]);

  if (!product) return null;

  const hasVariants = product.attributes && product.attributes.length > 0;
  
  // Pricing logic
  const activePrice = currentVariant ? currentVariant.price : product.basePrice;
  
  // A variant is out of stock if its stock is <= 0.
  // For simple products, we check if they have a variant or if base stock is managed, but since they have no variants list, we default to in-stock unless customized.
  const isOutOfStock = hasVariants 
    ? (currentVariant ? currentVariant.stock <= 0 : true) 
    : false;

  const activeStock = currentVariant ? currentVariant.stock : null;

  const handleSelectOption = (attrName: string, optionVal: string) => {
    const nextOptions = { ...selectedOptions, [attrName]: optionVal };
    setSelectedOptions(nextOptions);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleQuantityAdjust = (amt: number) => {
    const newQty = quantity + amt;
    if (newQty < 1) return;

    const maxStock = currentVariant ? currentVariant.stock : 999;
    if (hasVariants && currentVariant && newQty > maxStock) {
      setErrorMsg(`Sorry, we only have ${maxStock} items of this variation in stock.`);
      return;
    }
    setErrorMsg('');
    setQuantity(newQty);
  };

  const handleAddToCartClick = () => {
    if (hasVariants && !currentVariant) {
      setErrorMsg("Please select valid options before adding to cart.");
      return;
    }

    if (hasVariants && currentVariant && currentVariant.stock <= 0) {
      setErrorMsg("This variant is currently out of stock.");
      return;
    }

    const cartId = currentVariant 
      ? `${product.id}-${currentVariant.id}` 
      : `${product.id}-base`;

    const cartItem: CartItem = {
      id: cartId,
      product,
      selectedVariant: currentVariant,
      quantity,
    };

    onAddToCart(cartItem);
    setSuccessMsg(`Added ${quantity} of ${product.name} to your cart successfully!`);
    setErrorMsg('');
  };

  const handleViewFullDetails = () => {
    onClose();
    navigate(`/product/${product.id}`);
  };

  // Color hex mapping (consistent with theme)
  const getColorHex = (colorName: string) => {
    switch (colorName.toLowerCase()) {
      case 'stealth black': return '#111111';
      case 'matte carbon': return '#4b4b4d';
      case 'cyber silver': return '#cacacb';
      case 'standard': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex' }}>
      <div 
        className="modal-content quickview-modal" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          className="modal-close" 
          onClick={onClose}
          aria-label="Close modal"
          style={{ top: '16px', right: '16px', zIndex: 10 }}
        >
          <X size={18} />
        </button>

        <div className="quickview-grid">
          {/* Left Panel: Image */}
          <div className="quickview-media">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="quickview-img"
            />
          </div>

          {/* Right Panel: Content */}
          <div className="quickview-info">
            <div className="quickview-info-scroll">
              <span className="prod-card-category" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px', display: 'inline-block' }}>
                {(product.categories && product.categories.length > 0) ? product.categories[0] : product.category}
              </span>
              <h2 className="quickview-title" style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 600, color: 'var(--text-ink)', lineHeight: '1.2' }}>{product.name}</h2>
              
              <div className="quickview-price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-ink)' }}>
                  KSh {activePrice.toLocaleString()}
                </span>
              </div>

              <p style={{ color: 'var(--text-charcoal)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                {product.description}
              </p>

              {/* Attributes Selectors */}
              {hasVariants && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                  {product.attributes.map(attr => {
                    const isColorAttr = attr.name.toLowerCase() === 'color';
                    return (
                      <div key={attr.name}>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px', color: 'var(--text-ink)', letterSpacing: '0.5px' }}>
                          Select {attr.name}:
                        </span>
                        
                        {isColorAttr ? (
                          <div className="swatch-dots" style={{ gap: '10px', display: 'flex', flexWrap: 'wrap' }}>
                            {attr.options.map(opt => {
                              const isSelected = selectedOptions[attr.name] === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  className={`swatch-dot ${opt.toLowerCase() === 'cyber silver' ? 'has-light-border' : ''} ${isSelected ? 'active' : ''}`}
                                  style={{ backgroundColor: getColorHex(opt), width: '28px', height: '28px', cursor: 'pointer', border: isSelected ? '2px solid var(--color-ink)' : '2px solid transparent' }}
                                  onClick={() => handleSelectOption(attr.name, opt)}
                                  title={opt}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {attr.options.map(opt => {
                              const isSelected = selectedOptions[attr.name] === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  className={`filter-chip ${isSelected ? 'active' : ''}`}
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    border: '1px solid var(--color-hairline)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleSelectOption(attr.name, opt)}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '24px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-mute)' }}>Availability:</span>
                {isOutOfStock ? (
                  <span style={{ color: 'var(--color-sale)', fontWeight: 600 }}>Out of Stock</span>
                ) : (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    In Stock {activeStock !== null ? `(${activeStock} available)` : ''}
                  </span>
                )}
              </div>

              {/* Messages */}
              {errorMsg && (
                <div style={{ color: 'var(--color-sale)', backgroundColor: '#fff5f5', padding: '10px 14px', border: '1px solid var(--color-sale)', fontSize: '13px', fontWeight: 500, marginBottom: '20px' }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4', padding: '10px 14px', border: '1px solid var(--color-success)', fontSize: '13px', fontWeight: 500, marginBottom: '20px' }}>
                  {successMsg}
                </div>
              )}

              {/* Quantity Selector & Add to Cart */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-sm)', height: '44px', padding: '0 4px' }}>
                  <button 
                    type="button"
                    className="btn-icon-circular"
                    onClick={() => handleQuantityAdjust(-1)}
                    disabled={isOutOfStock}
                    style={{ width: '32px', height: '32px', minHeight: '32px', backgroundColor: 'transparent' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>{quantity}</span>
                  <button 
                    type="button"
                    className="btn-icon-circular"
                    onClick={() => handleQuantityAdjust(1)}
                    disabled={isOutOfStock}
                    style={{ width: '32px', height: '32px', minHeight: '32px', backgroundColor: 'transparent' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddToCartClick}
                  disabled={isOutOfStock}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    height: '44px',
                    minHeight: '44px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>

              {/* View Full Details */}
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  type="button"
                  className="prod-card-view-link"
                  onClick={handleViewFullDetails}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--color-ink)',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  View Full Details <ArrowRight size={14} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

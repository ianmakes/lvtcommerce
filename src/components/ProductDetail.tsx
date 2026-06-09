import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Product, ProductVariant, ShopSettings, CartItem } from '../types';

interface ProductDetailProps {
  product: Product;
  settings: ShopSettings;
  onBack: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  settings,
  onBack,
  onAddToCart,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Initialize options with the first available option for each attribute
  useEffect(() => {
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
  }, [product]);

  // 2. Find matching variant whenever selections change
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const matched = product.variants.find(v => {
        return Object.entries(v.options).every(([key, val]) => {
          return selectedOptions[key] === val;
        });
      });
      setCurrentVariant(matched || null);
    } else {
      setCurrentVariant(null);
    }
  }, [selectedOptions, product]);

  const handleSelectOption = (attrName: string, optionVal: string) => {
    setSelectedOptions({ ...selectedOptions, [attrName]: optionVal });
    setSuccessMsg('');
  };

  const handleQuantityAdjust = (amt: number) => {
    const newQty = quantity + amt;
    if (newQty < 1) return;
    
    const maxStock = currentVariant ? currentVariant.stock : 999;
    if (newQty > maxStock && product.variants && product.variants.length > 0) {
      setErrorMsg(`Sorry, we only have ${maxStock} items of this variation in stock.`);
      return;
    }
    setErrorMsg('');
    setQuantity(newQty);
  };

  const handleAddToCartClick = () => {
    const hasVars = product.attributes && product.attributes.length > 0;
    
    if (hasVars && !currentVariant) {
      setErrorMsg("Please select valid options before adding to cart.");
      return;
    }

    if (hasVars && currentVariant && currentVariant.stock <= 0) {
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

  const hasVariants = product.attributes && product.attributes.length > 0;
  const activePrice = currentVariant ? currentVariant.price : product.basePrice;
  const isOutOfStock = hasVariants ? (!currentVariant || currentVariant.stock <= 0) : false;
  const activeStock = currentVariant ? currentVariant.stock : null;

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      {/* Back button */}
      <button 
        className="btn btn-secondary btn-small"
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px', minHeight: '44px' }}
      >
        <ArrowLeft size={18} />
        <span>Back to Store</span>
      </button>

      {/* Main Grid Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
            {/* Split viewport for large displays */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px', padding: '32px' }}>
              
              {/* Image side */}
              <div 
                style={{ 
                  width: '100%', 
                  height: '420px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden',
                  border: '2px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <img 
                  src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Selections side */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="prod-badge" style={{ marginBottom: '16px' }}>{product.category}</span>
                  <h1 style={{ fontSize: '2.2rem', marginBottom: '16px' }}>{product.name}</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '32px' }}>
                    {product.description}
                  </p>

                  {/* Attributes Selectors */}
                  {hasVariants && product.attributes.map(attr => (
                    <div key={attr.name} className="variant-section" style={{ marginBottom: '24px' }}>
                      <span className="variant-label" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px', display: 'block' }}>
                        {attr.name}:
                      </span>
                      <div className="variant-options">
                        {attr.options.map(opt => {
                          const isSelected = selectedOptions[attr.name] === opt;
                          return (
                            <button
                              key={opt}
                              className={`variant-pill ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectOption(attr.name, opt)}
                              style={{ padding: '10px 20px', minHeight: '44px' }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Pricing and Stock Detail block */}
                  <div style={{ borderTop: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)', padding: '20px 0', margin: '24px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Price:</span>
                      <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-primary)' }}>
                        ₦{activePrice.toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Availability Status:</span>
                      {isOutOfStock ? (
                        <span style={{ color: 'var(--warning-color)', fontWeight: 800 }}>Out of Stock</span>
                      ) : (
                        <span style={{ color: 'var(--success-color)', fontWeight: 800 }}>
                          In Stock {activeStock !== null ? `(${activeStock} units left)` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                {errorMsg && (
                  <div 
                    style={{ 
                      color: 'var(--warning-color)', 
                      backgroundColor: 'var(--warning-light)', 
                      padding: '16px', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--warning-color)',
                      marginBottom: '20px',
                      fontWeight: 'bold'
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div 
                    style={{ 
                      color: 'var(--success-color)', 
                      backgroundColor: 'var(--success-light)', 
                      padding: '16px', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--success-color)',
                      marginBottom: '20px',
                      fontWeight: 'bold'
                    }}
                  >
                    {successMsg}
                  </div>
                )}

                {/* Cart Action & Quantity */}
                <div>
                  {!isOutOfStock && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Quantity:</span>
                      <div className="quantity-controls">
                        <button className="qty-btn" onClick={() => handleQuantityAdjust(-1)} aria-label="Decrease quantity">
                          <Minus size={20} />
                        </button>
                        <span className="qty-num" style={{ fontSize: '1.2rem', minWidth: '32px' }}>{quantity}</span>
                        <button className="qty-btn" onClick={() => handleQuantityAdjust(1)} aria-label="Increase quantity">
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleAddToCartClick}
                    disabled={isOutOfStock}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '12px',
                      opacity: isOutOfStock ? 0.5 : 1,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      fontSize: '1.15rem',
                      minHeight: '60px'
                    }}
                  >
                    <ShoppingCart size={24} />
                    <span>{isOutOfStock ? 'Temporarily Out of Stock' : 'Add to Shopping Cart'}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

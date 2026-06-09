import React, { useState, useEffect } from 'react';
import { Volume2, X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Product, ProductVariant, ShopSettings, CartItem } from '../types';
import { speakText } from './VoiceHelper';

interface ProductDetailProps {
  product: Product;
  settings: ShopSettings;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  settings,
  onClose,
  onAddToCart,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

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
  }, [product]);

  // 2. Find matching variant whenever selections change
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      // Find variant where all option keys match selectedOptions
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

  // 3. Accessibility announcement when variant changes
  const announceVariantSelection = (attrName: string, optionVal: string, price: number, stock: number) => {
    if (!settings.voiceAssistDefault) return;
    
    let stockText = stock > 0 ? `In Stock, ${stock} items left` : "Out of stock";
    speakText(`Selected ${attrName}: ${optionVal}. Price is now ${price.toLocaleString()} Naira. ${stockText}.`, settings.voiceRate);
  };

  const handleSelectOption = (attrName: string, optionVal: string) => {
    const nextOptions = { ...selectedOptions, [attrName]: optionVal };
    setSelectedOptions(nextOptions);

    // Speak it
    if (product.variants && product.variants.length > 0) {
      const matched = product.variants.find(v => {
        return Object.entries(v.options).every(([key, val]) => {
          return (key === attrName ? optionVal : selectedOptions[key]) === val;
        });
      });
      if (matched) {
        announceVariantSelection(attrName, optionVal, matched.price, matched.stock);
      }
    }
  };

  const handleSpeakDetails = () => {
    const hasVars = product.attributes && product.attributes.length > 0;
    let text = `${product.name}. Description: ${product.description}. `;
    if (hasVars) {
      const currentPrice = currentVariant ? currentVariant.price : product.basePrice;
      const currentStock = currentVariant ? currentVariant.stock : 0;
      const optionsText = Object.entries(selectedOptions).map(([k, v]) => `${k} is ${v}`).join(', ');
      text += `Current selections are: ${optionsText}. Price is ${currentPrice} Naira. Stock status is ${currentStock > 0 ? 'available' : 'unavailable'}.`;
    } else {
      text += `Price is ${product.basePrice} Naira. In stock.`;
    }
    speakText(text, settings.voiceRate);
  };

  // Adjust Quantity
  const handleQuantityAdjust = (amt: number) => {
    const newQty = quantity + amt;
    if (newQty < 1) return;
    
    const maxStock = currentVariant ? currentVariant.stock : 999;
    if (newQty > maxStock && product.variants && product.variants.length > 0) {
      setErrorMsg(`Sorry, we only have ${maxStock} items of this variant in stock.`);
      if (settings.voiceAssistDefault) {
        speakText(`Sorry, we only have ${maxStock} items of this variation in stock.`, settings.voiceRate);
      }
      return;
    }
    setErrorMsg('');
    setQuantity(newQty);
    
    if (settings.voiceAssistDefault) {
      speakText(`Quantity set to ${newQty}.`, settings.voiceRate);
    }
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
    
    if (settings.voiceAssistDefault) {
      const itemPrice = currentVariant ? currentVariant.price : product.basePrice;
      speakText(`Added ${quantity} of ${product.name} to your cart. Total added value is ${(itemPrice * quantity).toLocaleString()} Naira. You can click close to browse more, or open cart to checkout.`, settings.voiceRate);
    }

    onClose();
  };

  // Pricing & Stock display
  const hasVariants = product.attributes && product.attributes.length > 0;
  const activePrice = currentVariant ? currentVariant.price : product.basePrice;
  const isOutOfStock = hasVariants ? (!currentVariant || currentVariant.stock <= 0) : false;
  const activeStock = currentVariant ? currentVariant.stock : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close details">
          <X size={24} />
        </button>

        <div className="prod-detail-grid">
          {/* Left Column: Image */}
          <div>
            <div 
              style={{ 
                width: '100%', 
                height: '350px', 
                borderRadius: 'var(--radius-md)', 
                overflow: 'hidden',
                border: '2px solid var(--border-color)' 
              }}
            >
              <img 
                src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
                alt={product.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="prod-badge" style={{ margin: 0 }}>{product.category}</span>
              {settings.voiceAssistDefault && (
                <button
                  className="btn btn-secondary btn-small"
                  onClick={handleSpeakDetails}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px' }}
                >
                  <Volume2 size={20} />
                  <span>Read Details Aloud</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Attributes, Quantity, Cart Add */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 'calc(var(--font-scale) * 1.6)', marginBottom: '12px' }}>{product.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'calc(var(--font-scale) * 1.0)', marginBottom: '24px' }}>
                {product.description}
              </p>

              {/* Attributes (Variable Options) selector */}
              {hasVariants && product.attributes.map(attr => (
                <div key={attr.name} className="variant-section">
                  <span className="variant-label">{attr.name}:</span>
                  <div className="variant-options">
                    {attr.options.map(opt => {
                      const isSelected = selectedOptions[attr.name] === opt;
                      return (
                        <button
                          key={opt}
                          className={`variant-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectOption(attr.name, opt)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Price & Stock Display */}
              <div style={{ margin: '24px 0', borderTop: '2px solid var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'calc(var(--font-scale) * 1.1)', fontWeight: 'bold' }}>Price:</span>
                  <span style={{ fontSize: 'calc(var(--font-scale) * 1.8)', fontWeight: '900', color: 'var(--accent-primary)' }}>
                    ₦{activePrice.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: 'calc(var(--font-scale) * 1.1)', fontWeight: 'bold' }}>Availability:</span>
                  {isOutOfStock ? (
                    <span style={{ color: 'var(--warning-color)', fontWeight: 800 }}>Out of Stock</span>
                  ) : (
                    <span style={{ color: 'var(--success-color)', fontWeight: 800 }}>
                      In Stock {activeStock !== null ? `(${activeStock} remaining)` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div 
                style={{ 
                  color: 'var(--warning-color)', 
                  backgroundColor: 'var(--warning-light)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--warning-color)',
                  marginBottom: '16px',
                  fontWeight: 'bold',
                  fontSize: 'calc(var(--font-scale) * 0.95)'
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Quantity Controls & Add Button */}
            <div style={{ marginTop: 'auto' }}>
              {!isOutOfStock && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 'calc(var(--font-scale) * 1.1)' }}>Select Quantity:</span>
                  <div className="quantity-controls">
                    <button className="qty-btn" onClick={() => handleQuantityAdjust(-1)} aria-label="Decrease quantity">
                      <Minus size={20} />
                    </button>
                    <span className="qty-num">{quantity}</span>
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
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer'
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
  );
};

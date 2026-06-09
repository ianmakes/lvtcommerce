import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, Plus, Minus, ShoppingCart, Star, MessageSquare, Calendar, ShieldCheck, Heart } from 'lucide-react';
import { Product, ProductVariant, ShopSettings, CartItem, ProductReview } from '../types';
import { getProductReviews, addProductReview } from '../db';

interface ProductDetailProps {
  product: Product;
  products: Product[];
  settings: ShopSettings;
  onBack: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
  currentUser: FirebaseUser | null;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onReviewSubmitted?: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  products,
  settings,
  onBack,
  onAddToCart,
  onBuyNow,
  currentUser,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
  onReviewSubmitted,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Gallery Active Image
  const [activeImage, setActiveImage] = useState(product.image);

  // Tab State: 'description' | 'specifications' | 'reviews'
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');

  // Reviews State
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // New Review Form State
  const [formName, setFormName] = useState(currentUser?.displayName || '');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Sync image when product changes
  useEffect(() => {
    setActiveImage(product.image);
    setActiveTab('description');
    setReviewSuccess('');
    setFormComment('');
    setFormRating(5);
    if (currentUser?.displayName) {
      setFormName(currentUser.displayName);
    }
  }, [product, currentUser]);

  // Load reviews from DB
  const loadReviews = async () => {
    try {
      setLoadingReviews(true);
      const data = await getProductReviews(product.id);
      setReviews(data);
    } catch (err) {
      console.error("Error loading reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [product]);

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

  const handleBuyNowClick = () => {
    const hasVars = product.attributes && product.attributes.length > 0;
    
    if (hasVars && !currentVariant) {
      setErrorMsg("Please select valid options before buying.");
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

    onBuyNow(cartItem);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) {
      setErrorMsg("Please fill out both your name and review comment.");
      return;
    }

    const newReview: ProductReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      buyerName: formName.trim(),
      rating: formRating,
      comment: formComment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addProductReview(newReview);
      setReviewSuccess("Thank you! Your review has been submitted successfully.");
      setFormComment('');
      setFormRating(5);
      setErrorMsg('');
      loadReviews();
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setErrorMsg("Failed to submit review. Please try again.");
    }
  };

  const hasVariants = product.attributes && product.attributes.length > 0;
  const activePrice = currentVariant ? currentVariant.price : product.basePrice;
  const isOutOfStock = hasVariants ? (!currentVariant || currentVariant.stock <= 0) : false;
  const activeStock = currentVariant ? currentVariant.stock : null;

  // Gather related products in same category
  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // Gallery images list
  const galleryImages = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  // Helper for stars
  const renderStars = (ratingVal: number, size = 16) => {
    const stars = [];
    const floor = Math.floor(ratingVal);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Star key={i} size={size} fill="var(--gold-primary)" style={{ color: 'var(--gold-primary)' }} />);
      } else if (i - 0.5 <= ratingVal) {
        stars.push(
          <div key={i} style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
            <Star size={size} style={{ color: 'var(--border-strong)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={size} fill="var(--gold-primary)" style={{ color: 'var(--gold-primary)' }} />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} size={size} style={{ color: 'var(--border-strong)' }} />);
      }
    }
    return stars;
  };

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

      {/* Main split grid */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', padding: '40px' }}>
            
            {/* Image side with alternate thumbnails gallery */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: '420px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  position: 'relative'
                }}
              >
                {product.badge && (
                  <span style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {product.badge}
                  </span>
                )}
                <img 
                  src={activeImage || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Thumbnails row */}
              {galleryImages.length > 1 && (
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {galleryImages.map((imgUrl, index) => {
                    const isCurrent = imgUrl === activeImage;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveImage(imgUrl)}
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: isCurrent ? '2px solid var(--gold-primary)' : '1px solid var(--border-strong)',
                          backgroundColor: 'var(--bg-secondary)',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <img src={imgUrl} alt={`thumbnail-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selections side */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="prod-badge" style={{ margin: 0 }}>{product.category}</span>
                  
                  {/* Rating star clicks to review tab */}
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveTab('reviews');
                      document.getElementById('details-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
                  >
                    <div style={{ display: 'flex' }}>{renderStars(product.rating || 0)}</div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', textDecoration: 'underline' }}>
                      {reviews.length} reviews
                    </span>
                  </button>
                </div>

                <h1 style={{ fontSize: '2.0rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>{product.name}</h1>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.0rem', lineHeight: '1.6', marginBottom: '24px' }}>
                  {product.description}
                </p>

                {/* Attributes Selectors */}
                {hasVariants && product.attributes.map(attr => (
                  <div key={attr.name} className="variant-section" style={{ marginBottom: '20px' }}>
                    <span className="variant-label" style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px', display: 'block' }}>
                      Select {attr.name}:
                    </span>
                    <div className="variant-options">
                      {attr.options.map(opt => {
                        const isSelected = selectedOptions[attr.name] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`variant-pill ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectOption(attr.name, opt)}
                            style={{ padding: '8px 16px', minHeight: '40px', fontSize: '0.9rem' }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Pricing and Stock Detail block */}
                <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '16px 0', margin: '20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.0rem', fontWeight: 'bold' }}>Price:</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-primary)' }}>
                      KSh {activePrice.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '1.0rem', fontWeight: 'bold' }}>Availability:</span>
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

              {/* Action Notifications */}
              {errorMsg && (
                <div style={{ color: 'var(--warning-color)', backgroundColor: 'var(--warning-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-color)', marginBottom: '16px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ color: 'var(--success-color)', backgroundColor: 'var(--success-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-color)', marginBottom: '16px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {successMsg}
                </div>
              )}

              {/* Cart Action & Quantity */}
              <div>
                {!isOutOfStock && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.0rem' }}>Quantity:</span>
                    <div className="quantity-controls">
                      <button type="button" className="qty-btn" onClick={() => handleQuantityAdjust(-1)} aria-label="Decrease quantity">
                        <Minus size={16} />
                      </button>
                      <span className="qty-num" style={{ fontSize: '1.1rem', minWidth: '28px' }}>{quantity}</span>
                      <button type="button" className="qty-btn" onClick={() => handleQuantityAdjust(1)} aria-label="Increase quantity">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Amazon-style Double Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={handleAddToCartClick}
                    disabled={isOutOfStock}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      opacity: isOutOfStock ? 0.5 : 1,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      fontSize: '1.0rem',
                      minHeight: '52px',
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)'
                    }}
                  >
                    <ShoppingCart size={20} />
                    <span>Add to Shopping Cart</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleBuyNowClick}
                    disabled={isOutOfStock}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px',
                      opacity: isOutOfStock ? 0.5 : 1,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      fontSize: '1.0rem',
                      minHeight: '52px',
                      background: 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-hover) 100%)',
                      borderColor: 'var(--gold-primary)'
                    }}
                  >
                    <ShieldCheck size={20} />
                    <span>Buy Now (Direct Checkout)</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Tabs Section: specs, description, reviews */}
      <section id="details-tabs-section" style={{ marginBottom: '56px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '24px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'description' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              fontWeight: 'bold',
              color: activeTab === 'description' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.05rem',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            Product Overview
          </button>
          
          {product.specifications && (
            <button
              type="button"
              className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('specifications')}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'specifications' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                fontWeight: 'bold',
                color: activeTab === 'specifications' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.05rem',
                fontFamily: 'Outfit, sans-serif'
              }}
            >
              Specifications
            </button>
          )}

          <button
            type="button"
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'reviews' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              fontWeight: 'bold',
              color: activeTab === 'reviews' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.05rem',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            Customer Reviews ({reviews.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="card" style={{ padding: '32px' }}>
          {activeTab === 'description' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>About this item</h3>
              <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>{product.description}</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                <li>Designed for daily aids, accessibility, and high safety standards.</li>
                <li>Made with medical-grade, highly durable, and tested lightweight components.</li>
                <li>Comfortable grips and pivots ideal for elder support and wellness routines.</li>
              </ul>
            </div>
          )}

          {activeTab === 'specifications' && product.specifications && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Technical Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <tbody>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-secondary)', width: '35%' }}>{key}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              {/* Reviews Summary Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ marginBottom: '12px' }}>Customer Ratings</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '3.0rem', fontWeight: 900, lineHeight: 1, color: 'var(--accent-primary)' }}>{product.rating || '0.0'}</span>
                    <div>
                      <div style={{ display: 'flex' }}>{renderStars(product.rating || 0, 20)}</div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Based on {reviews.length} reviews</span>
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[5, 4, 3, 2, 1].map(starNum => {
                    const starReviews = reviews.filter(r => r.rating === starNum);
                    const pct = reviews.length > 0 ? (starReviews.length / reviews.length) * 100 : 0;
                    return (
                      <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <span style={{ minWidth: '40px', fontWeight: 'bold' }}>{starNum} star</span>
                        <div style={{ flexGrow: 1, height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--gold-primary)', borderRadius: '4px' }} />
                        </div>
                        <span style={{ minWidth: '32px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Form (Only for buyers) */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>Write a Customer Review</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Share your experience with this product to help other customers make informed decisions.
                </p>

                {currentUser ? (
                  <form onSubmit={handleReviewSubmit}>
                    {reviewSuccess && (
                      <div style={{ color: 'var(--success-color)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '12px' }}>
                        {reviewSuccess}
                      </div>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>Your Name:</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          placeholder="e.g. John Doe"
                          style={{ minHeight: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>Star Rating:</label>
                        <div style={{ display: 'flex', gap: '6px', height: '40px', alignItems: 'center' }}>
                          {[1, 2, 3, 4, 5].map(starNum => (
                            <button
                              key={starNum}
                              type="button"
                              onClick={() => setFormRating(starNum)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <Star 
                                size={24} 
                                fill={starNum <= formRating ? "var(--gold-primary)" : "none"} 
                                style={{ color: starNum <= formRating ? "var(--gold-primary)" : "var(--border-strong)" }} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Review Details:</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={formComment}
                        onChange={e => setFormComment(e.target.value)}
                        placeholder="What did you like or dislike? Was it easy to use?"
                        style={{ minHeight: '80px', padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-small">
                      Submit Review
                    </button>
                  </form>
                ) : (
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    Please sign in or register an account to write a review.
                  </p>
                )}
              </div>

              {/* Reviews List */}
              <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} />
                <span>Reviews ({reviews.length})</span>
              </h4>

              {loadingReviews ? (
                <p>Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No reviews yet for this product. Be the first to review!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {reviews.map(rev => (
                    <div key={rev.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', display: 'block', color: 'var(--text-primary)' }}>{rev.buyerName}</span>
                          <div style={{ display: 'flex', marginTop: '2px' }}>{renderStars(rev.rating)}</div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={14} />
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section style={{ borderTop: '2px solid var(--border-color)', paddingTop: '40px', marginTop: '40px' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '24px', fontFamily: 'Outfit, sans-serif' }}>
            Frequently Bought Together / Related Products
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
            {relatedProducts.map(prod => {
              const prodPrice = prod.variants && prod.variants.length > 0
                ? `From KSh ${prod.basePrice.toLocaleString()}`
                : `KSh ${prod.basePrice.toLocaleString()}`;
              return (
                <div 
                  key={prod.id} 
                  className="card" 
                  onClick={() => {
                    onSelectProduct(prod);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--border-color)' }}
                >
                  <div style={{ height: '180px', width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h4 style={{ fontSize: '1.0rem', fontWeight: 'bold', margin: '0 0 6px 0', flexGrow: 1 }}>{prod.name}</h4>
                  
                  {prod.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex' }}>{renderStars(prod.rating, 12)}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({prod.reviewCount})</span>
                    </div>
                  )}

                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{prodPrice}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

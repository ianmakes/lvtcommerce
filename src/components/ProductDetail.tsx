import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Plus, Minus, ShoppingCart, Star, Heart, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Product, ProductVariant, CartItem, ProductReview } from '../types';
import { getProductReviews, addProductReview } from '../db';
import { Link } from '../Router';

interface ProductDetailProps {
  product: Product;
  products: Product[];
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
  onAddToCart,
  onBuyNow,
  currentUser,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
  onReviewSubmitted,
}) => {
  // Video URL helpers
  const isVideoUrl = (url: string): boolean => {
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) || /\.(mp4|webm|ogg)$/i.test(url);
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  };

  const getVideoThumbnail = (url: string): string | null => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    return null;
  };
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Gallery Active Image
  const [activeImage, setActiveImage] = useState(product.image);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Accordion open/close states
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveImage(product.image);
    setDetailsOpen(true);
    setShippingOpen(false);
    setReviewsOpen(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Initialize options with the first available option for each attribute
  useEffect(() => {
    if (product.attributes && product.attributes.length > 0) {
      const initialOptions: Record<string, string> = {};
      product.attributes.forEach(attr => {
        if (attr.options && attr.options.length > 0) {
          initialOptions[attr.name] = attr.options[0];
        }
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOptions(initialOptions);
    } else {
      setSelectedOptions({});
    }
    setQuantity(1);
    setErrorMsg('');
    setSuccessMsg('');
  }, [product]);

  // Find matching variant whenever selections change
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const matched = product.variants.find(v => {
        return Object.entries(v.options).every(([key, val]) => {
          return selectedOptions[key] === val;
        });
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentVariant(matched || null);
    } else {
      setCurrentVariant(null);
    }
  }, [selectedOptions, product]);

  const handleSelectOption = (attrName: string, optionVal: string) => {
    const nextOptions = { ...selectedOptions, [attrName]: optionVal };
    setSelectedOptions(nextOptions);
    setSuccessMsg('');

    // Switch main image to variant specific image if one is defined
    if (product.variants && product.variants.length > 0) {
      const matched = product.variants.find(v => {
        return Object.entries(v.options).every(([key, val]) => {
          return nextOptions[key] === val;
        });
      });
      if (matched && matched.image) {
        setActiveImage(matched.image);
      }
    }
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

  // Related products in same category
  const relatedProducts = products
    .filter(p => (p.categories || [p.category]).some(c => (product.categories || [product.category]).includes(c)) && p.id !== product.id)
    .slice(0, 4);

  // Gallery images list (featured image + product images list + variant images)
  const baseGallery = product.images && product.images.length > 0 ? product.images : [];
  const variantImages = (product.variants || [])
    .map(v => v.image)
    .filter((img): img is string => typeof img === 'string' && img.trim() !== '');

  const galleryImages = Array.from(new Set([
    product.image,
    ...baseGallery,
    ...variantImages
  ])).filter(Boolean);

  // Concentric circle swatch helper
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
    <div className="container" style={{ padding: '30px 0' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-mute)', marginBottom: '32px', letterSpacing: '0.5px' }}>
        <Link to="/" style={{ color: 'var(--text-mute)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-ink)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-mute)'}>Home</Link>
        <span style={{ color: 'var(--color-hairline)' }}>/</span>
        <Link to="/shop" style={{ color: 'var(--text-mute)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-ink)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-mute)'}>Shop</Link>
        <span style={{ color: 'var(--color-hairline)' }}>/</span>
        <span style={{ textTransform: 'capitalize', color: 'var(--text-mute)' }}>{((product.categories && product.categories.length > 0) ? product.categories[0] : product.category).toLowerCase()}</span>
        <span style={{ color: 'var(--color-hairline)' }}>/</span>
        <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{product.name}</span>
      </div>

      {/* Main PDP Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '48px', marginBottom: '48px' }}>
        
        {/* Left Side: Main Image + Horizontal Thumbnails Underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Large Main 1:1 Image */}
          <div 
            className="prod-img-container" 
            onClick={() => setIsLightboxOpen(true)}
            style={{ aspectRatio: '1 / 1', height: 'auto', border: '1px solid var(--color-hairline-soft)', width: '100%', cursor: 'zoom-in' }}
          >
            {product.badge && (
              <span className="badge-promo">{product.badge}</span>
            )}
            {isVideoUrl(activeImage) ? (
              getVideoEmbedUrl(activeImage) ? (
                <iframe
                  src={getVideoEmbedUrl(activeImage) || ''}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen"
                  title="product video"
                />
              ) : (
                <video src={activeImage} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )
            ) : (
              <img 
                src={activeImage || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
                alt={product.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>

          {/* Horizontal thumbnails under the main image */}
          {galleryImages.length > 1 && (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0' }}>
              {galleryImages.map((imgUrl, index) => {
                const isCurrent = imgUrl === activeImage;
                const isVideo = isVideoUrl(imgUrl);
                const thumbSrc = isVideo ? (getVideoThumbnail(imgUrl) || imgUrl) : imgUrl;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--radius-none)',
                      overflow: 'hidden',
                      border: isCurrent ? '2px solid var(--color-ink)' : '1px solid var(--color-hairline-soft)',
                      backgroundColor: 'var(--color-soft-cloud)',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) e.currentTarget.style.borderColor = 'var(--text-stone)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.borderColor = 'var(--color-hairline-soft)';
                    }}
                  >
                    <img src={thumbSrc} alt={`thumbnail-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isVideo && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19" /></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Product Details & Purchase Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <span className="font-caption-md" style={{ textTransform: 'uppercase', fontWeight: 600 }}>{(product.categories && product.categories.length > 0) ? product.categories.join(', ') : product.category}</span>
            {product.tags && product.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {product.tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-block', padding: '3px 10px', fontSize: '11px', fontWeight: 500, border: '1px solid var(--color-hairline)', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tag}</span>
                ))}
              </div>
            )}
            <h1 className="font-heading-xl" style={{ marginTop: '8px', marginBottom: '12px' }}>{product.name}</h1>
            <span className="font-heading-lg" style={{ display: 'block', marginBottom: '24px' }}>
              KSh {activePrice.toLocaleString()}
            </span>
            <p className="font-body-md" style={{ color: 'var(--text-charcoal)', lineHeight: 1.6 }}>
              {product.description}
            </p>
          </div>

          {/* Options & Swatches Selectors */}
          {hasVariants && product.attributes.map(attr => {
            const isColorAttr = attr.name.toLowerCase() === 'color';
            return (
              <div key={attr.name}>
                <span className="font-body-strong" style={{ display: 'block', marginBottom: '10px' }}>
                  Select {attr.name}:
                </span>
                
                {isColorAttr ? (
                  /* Colors Swatch Concentric circles style */
                  <div className="swatch-dots" style={{ gap: '10px' }}>
                    {attr.options.map(opt => {
                      const isSelected = selectedOptions[attr.name] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`swatch-dot ${opt.toLowerCase() === 'cyber silver' ? 'has-light-border' : ''} ${isSelected ? 'active' : ''}`}
                          style={{ backgroundColor: getColorHex(opt), width: '28px', height: '28px' }}
                          onClick={() => handleSelectOption(attr.name, opt)}
                          title={opt}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* Size / Other options as filter chips (pills) */
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {attr.options.map(opt => {
                      const isSelected = selectedOptions[attr.name] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`filter-chip ${isSelected ? 'active' : ''}`}
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

          {/* Pricing detail notification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ fontWeight: 600 }}>Status:</span>
            {isOutOfStock ? (
              <span style={{ color: 'var(--color-sale)', fontWeight: 600 }}>Out of Stock</span>
            ) : (
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                In Stock {activeStock !== null ? `(${activeStock} available)` : ''}
              </span>
            )}
          </div>

          {/* Alert messages */}
          {errorMsg && (
            <div style={{ color: 'var(--color-sale)', backgroundColor: '#fff5f5', padding: '12px 16px', border: '1px solid var(--color-sale)', fontSize: '14px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ color: 'var(--color-success)', backgroundColor: '#f0fbf5', padding: '12px 16px', border: '1px solid var(--color-success)', fontSize: '14px', fontWeight: 500 }}>
              {successMsg}
            </div>
          )}

          {/* Action Row */}
          <div>
            {!isOutOfStock && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span className="font-body-strong">Quantity</span>
                <div className="quantity-controls">
                  <button type="button" className="qty-btn" onClick={() => handleQuantityAdjust(-1)} aria-label="Decrease quantity">
                    <Minus size={14} />
                  </button>
                  <span className="qty-num">{quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => handleQuantityAdjust(1)} aria-label="Increase quantity">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="pdp-action-buttons">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddToCartClick}
                disabled={isOutOfStock}
                style={{ opacity: isOutOfStock ? 0.5 : 1 }}
              >
                <ShoppingCart size={18} />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBuyNowClick}
                disabled={isOutOfStock}
                style={{ opacity: isOutOfStock ? 0.5 : 1 }}
              >
                <span>Direct Purchase</span>
              </button>

              <button
                type="button"
                className="btn btn-wishlist"
                onClick={(e) => onToggleWishlist(product.id, e)}
                style={{
                  color: isWishlisted ? 'var(--color-sale)' : 'var(--color-ink)',
                }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={18} fill={isWishlisted ? 'var(--color-sale)' : 'none'} />
              </button>
            </div>
          </div>

          {/* Stacked Accordion Disclosure Rows (Nike signature PDP style) */}
          <div style={{ borderTop: '1px solid var(--color-hairline)', marginTop: '24px' }}>
            
            {/* Accordion 1: Product Overview */}
            <div className="pdp-disclosure-row">
              <div className="pdp-disclosure-header" onClick={() => setDetailsOpen(!detailsOpen)}>
                <span>Product Overview</span>
                {detailsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {detailsOpen && (
                <div className="pdp-disclosure-content">
                  <p style={{ marginBottom: '12px' }}>{product.description}</p>
                  {product.specifications && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
                      <tbody>
                        {Object.entries(product.specifications).map(([key, val]) => (
                          <tr key={key} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                            <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-charcoal)', width: '40%', fontSize: '14px' }}>{key}</td>
                            <td style={{ padding: '8px 0', color: 'var(--text-ink)', fontSize: '14px' }}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 2: Shipping & Delivery */}
            <div className="pdp-disclosure-row">
              <div className="pdp-disclosure-header" onClick={() => setShippingOpen(!shippingOpen)}>
                <span>Shipping & Returns</span>
                {shippingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {shippingOpen && (
                <div className="pdp-disclosure-content">
                  <p>Free standard shipping on orders over KSh 30,000. For orders below this threshold, a flat delivery fee of KSh 500 applies nationwide.</p>
                  <p style={{ marginTop: '10px' }}>Orders are processed and dispatched within 24 to 48 hours. Returns are accepted within 30 days of purchase in original packaging and condition.</p>
                </div>
              )}
            </div>

            {/* Accordion 3: Reviews */}
            <div className="pdp-disclosure-row">
              <div className="pdp-disclosure-header" onClick={() => setReviewsOpen(!reviewsOpen)}>
                <span>Reviews ({reviews.length})</span>
                {reviewsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {reviewsOpen && (
                <div className="pdp-disclosure-content">
                  {/* Reviews Summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text-ink)' }}>{product.rating || '0.0'}</span>
                    <div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <Star 
                            key={starNum} 
                            size={16} 
                            fill={starNum <= Math.round(product.rating || 0) ? 'var(--text-ink)' : 'none'} 
                            style={{ color: 'var(--text-ink)' }} 
                          />
                        ))}
                      </div>
                      <span className="font-caption-sm">Based on {reviews.length} reviews</span>
                    </div>
                  </div>

                  {/* Review Submit form */}
                  <div style={{ backgroundColor: 'var(--color-soft-cloud)', padding: '20px', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Write a Review</h4>
                    {currentUser ? (
                      <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reviewSuccess && (
                          <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '13px' }}>
                            {reviewSuccess}
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label className="form-label">Name</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              style={{ minHeight: '40px', padding: '6px 12px', fontSize: '14px' }}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label">Rating</label>
                            <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'center' }}>
                              {[1, 2, 3, 4, 5].map(starNum => (
                                <button
                                  key={starNum}
                                  type="button"
                                  onClick={() => setFormRating(starNum)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  <Star 
                                    size={20} 
                                    fill={starNum <= formRating ? "var(--text-ink)" : "none"} 
                                    style={{ color: 'var(--text-ink)' }} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Review Details</label>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={formComment}
                            onChange={e => setFormComment(e.target.value)}
                            placeholder="Share your experience..."
                            style={{ minHeight: '64px', padding: '8px 12px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary btn-small" style={{ alignSelf: 'flex-start' }}>
                          Submit Review
                        </button>
                      </form>
                    ) : (
                      <span className="font-caption-sm" style={{ color: 'var(--color-sale)', fontWeight: 600 }}>Please sign in to write a review.</span>
                    )}
                  </div>

                  {/* Reviews List */}
                  {loadingReviews ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[1, 2].map(n => (
                        <div key={n} style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '16px', width: '120px' }} />
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '12px', width: '80px' }} />
                          </div>
                          <div className="skeleton-row-box skeleton-pulse" style={{ height: '12px', width: '100px', marginBottom: '8px' }} />
                          <div className="skeleton-row-box skeleton-pulse" style={{ height: '14px', width: '100%' }} />
                        </div>
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="font-caption-sm" style={{ fontStyle: 'italic' }}>No reviews yet. Be the first to write one!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {reviews.map(rev => (
                        <div key={rev.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{rev.buyerName}</span>
                            <span className="font-caption-sm" style={{ fontSize: '11px' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                            {[1, 2, 3, 4, 5].map(starNum => (
                              <Star 
                                key={starNum} 
                                size={12} 
                                fill={starNum <= rev.rating ? 'var(--text-ink)' : 'none'} 
                                style={{ color: 'var(--text-ink)' }} 
                              />
                            ))}
                          </div>
                          <p style={{ fontSize: '14px', color: 'var(--text-charcoal)', margin: 0 }}>{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: '40px' }}>
          <h2 className="font-heading-xl" style={{ marginBottom: '24px' }}>
            You Might Also Like
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
            {relatedProducts.map(prod => (
              <div 
                key={prod.id} 
                className="prod-card" 
                onClick={() => {
                  onSelectProduct(prod);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="prod-img-container">
                  {prod.badge && (
                    <span className="badge-promo">{prod.badge}</span>
                  )}
                  <img src={prod.image} alt={prod.name} className="prod-img" />
                </div>
                <div className="prod-card-metadata">
                  <span className="prod-card-category">{(prod.categories && prod.categories.length > 0) ? prod.categories[0] : prod.category}</span>
                  <h4 className="prod-card-title">{prod.name}</h4>
                  <div className="prod-card-price-row">
                    <span className="price-regular">KSh {prod.basePrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Overlay */}
      {isLightboxOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsLightboxOpen(false)}
          style={{ 
            zIndex: 4000, 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            cursor: 'zoom-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <button 
            type="button" 
            onClick={() => setIsLightboxOpen(false)}
            style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              background: 'none', 
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close Lightbox"
          >
            <X size={32} />
          </button>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              maxWidth: '90%', 
              maxHeight: '90%', 
              backgroundColor: 'transparent',
              borderRadius: '0px',
              overflow: 'hidden'
            }}
          >
            {isVideoUrl(activeImage) ? (
              getVideoEmbedUrl(activeImage) ? (
                <iframe
                  src={getVideoEmbedUrl(activeImage) || ''}
                  style={{ width: '80vw', height: '80vh', border: 'none' }}
                  allow="autoplay; fullscreen"
                  title="product video lightbox"
                />
              ) : (
                <video src={activeImage} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
              )
            ) : (
              <img 
                src={activeImage} 
                alt={product.name} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '85vh', 
                  objectFit: 'contain', 
                  border: '1px solid rgba(255,255,255,0.1)' 
                }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

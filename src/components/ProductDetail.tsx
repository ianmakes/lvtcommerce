import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Plus, Minus, ShoppingCart, Star, Heart, ChevronDown, ChevronUp, X, Zap, Share2, Phone, Home, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Product, ProductVariant, CartItem, ProductReview } from '../types';
import { getProductReviews, addProductReview, checkIfUserPurchasedProduct } from '../db';
import { Link, navigate } from '../Router';

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
  const [pdpActiveTab, setPdpActiveTab] = useState<'overview' | 'reviews' | 'shipping'>('overview');

  // Reviews State
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [checkingPurchase, setCheckingPurchase] = useState<boolean>(true);

  // New Review Form State
  const [formName, setFormName] = useState(currentUser?.displayName || '');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Image index tracking for mobile carousel
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Flash Sale Timer State
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 14, minutes: 32, seconds: 45 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync image when product changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveImage(product.image);
    setActiveImageIndex(0);
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

  useEffect(() => {
    const verifyPurchase = async () => {
      if (currentUser?.email) {
        try {
          setCheckingPurchase(true);
          const purchased = await checkIfUserPurchasedProduct(currentUser.email, product.id);
          setHasPurchased(purchased);
        } catch (err) {
          console.error("Error checking purchase history:", err);
          setHasPurchased(false);
        } finally {
          setCheckingPurchase(false);
        }
      } else {
        setHasPurchased(false);
        setCheckingPurchase(false);
      }
    };
    verifyPurchase();
  }, [product.id, currentUser]);

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
      createdAt: new Date().toISOString(),
      buyerEmail: currentUser?.email || undefined,
      approved: false
    };

    try {
      await addProductReview(newReview);
      setReviewSuccess("Thank you! Your review has been submitted and is pending moderator approval.");
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
  const activePrice = currentVariant 
    ? currentVariant.price 
    : (product.salePrice && product.salePrice > 0 && product.salePrice < product.basePrice
        ? product.salePrice
        : product.basePrice);
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
    const colorAttribute = product.attributes?.find(attr => attr.name.toLowerCase() === 'color');
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

  const getBrand = () => {
    if (product.specifications) {
      const brandKey = Object.keys(product.specifications).find(k => k.toLowerCase() === 'brand');
      if (brandKey) return product.specifications[brandKey];
    }
    const firstWord = product.name.trim().split(/\s+/)[0];
    return firstWord || 'GoldenCare';
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setActiveImageIndex(index);
    }
  };

  if (isMobile) {
    return (
      <div className="mobile-pdp-container" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', backgroundColor: '#f5f5f5' }}>
        {/* Gallery Carousel */}
        <div style={{ position: 'relative', backgroundColor: '#ffffff', borderBottom: '1px solid var(--color-hairline-soft)' }}>
          {product.badge && (
            <span className="badge-promo" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>{product.badge}</span>
          )}
          <div 
            onScroll={handleScroll}
            style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              scrollSnapType: 'x mandatory', 
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="mobile-pdp-carousel"
          >
            {galleryImages.map((imgUrl, idx) => (
              <div 
                key={idx}
                onClick={() => setIsLightboxOpen(true)}
                style={{ 
                  flex: '0 0 100%', 
                  width: '100%', 
                  scrollSnapAlign: 'start', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  aspectRatio: '1/1',
                  backgroundColor: '#ffffff'
                }}
              >
                {isVideoUrl(imgUrl) ? (
                  getVideoEmbedUrl(imgUrl) ? (
                    <iframe
                      src={getVideoEmbedUrl(imgUrl) || ''}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="autoplay; fullscreen"
                      title="product video"
                    />
                  ) : (
                    <video src={imgUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <img src={imgUrl} alt={`${product.name}-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          {galleryImages.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '12px 0 16px' }}>
              {galleryImages.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: idx === activeImageIndex ? 'var(--color-ink)' : '#dcdcdc',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Meta Section */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', marginBottom: '8px', borderBottom: '1px solid var(--color-hairline-soft)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#0f3b73', color: '#ffffff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '2px' }}>Official Store</span>
            <span style={{ backgroundColor: '#fcd34d', color: '#000000', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '2px' }}>1 Year Warranty</span>
          </div>

          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.4, margin: '0 0 8px' }}>
            {product.name}
          </h1>

          <div style={{ fontSize: '13px', color: 'var(--text-mute)', marginBottom: '12px' }}>
            <span>Brand: </span>
            <span style={{ color: '#0f3b73', fontWeight: 600 }}>{getBrand()}</span>
            <span style={{ color: 'var(--color-hairline-soft)', margin: '0 8px' }}>|</span>
            <span style={{ color: '#0f3b73', cursor: 'pointer' }} onClick={() => navigate('/shop')}>Similar products from {getBrand()}</span>
          </div>

          {/* Flash Sales Ticker */}
          <div style={{ 
            background: 'linear-gradient(90deg, #e61a23 0%, #ff4e00 100%)', 
            color: '#ffffff', 
            padding: '10px 12px', 
            borderRadius: '6px', 
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px' }}>
              <Zap size={14} fill="#ffffff" />
              <span>Flash Sales</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>
              Time Left: {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
            </div>
          </div>

          {/* Price Block */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-ink)' }}>KSh {activePrice.toLocaleString()}</span>
            {!currentVariant && product.salePrice && product.salePrice > 0 && product.salePrice < product.basePrice && (
              <>
                <span style={{ textDecoration: 'line-through', color: 'var(--text-mute)', fontSize: '14px' }}>KSh {product.basePrice.toLocaleString()}</span>
                <span style={{ color: '#ff6600', backgroundColor: '#fff0e6', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                  -{Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Stock Progress Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-charcoal)', marginBottom: '4px', fontWeight: 500 }}>
              <span>{activeStock !== null ? `${activeStock} items left` : '37 items left'}</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: activeStock !== null ? `${Math.min(100, (activeStock / 20) * 100)}%` : '65%', height: '100%', background: 'linear-gradient(90deg, #f5af19, #f12711)', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Shipping Estimate */}
          <div style={{ fontSize: '12px', color: 'var(--text-charcoal)', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '12px' }}>
            <span>+ shipping from KSh 120 to Nairobi CBD </span>
            <span style={{ color: '#ff6600', fontWeight: 600, cursor: 'pointer' }}>See options</span>
          </div>
        </div>

        {/* Ratings, Share, Wishlist line */}
        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', marginBottom: '8px', borderBottom: '1px solid var(--color-hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '1px', color: '#dba617' }}>
              {[1, 2, 3, 4, 5].map(starNum => {
                const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
                return (
                  <Star 
                    key={starNum} 
                    size={14} 
                    fill={starNum <= Math.round(averageRating) ? '#dba617' : 'none'} 
                    style={{ color: '#dba617' }} 
                  />
                );
              })}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-mute)', fontWeight: 600 }}>
              {reviews.length} ratings
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              type="button" 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    text: product.shortDescription || product.description,
                    url: window.location.href
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  setSuccessMsg("Product link copied to clipboard!");
                }
              }}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-ink)' }}
            >
              <Share2 size={20} />
            </button>
            <button 
              type="button" 
              onClick={(e) => onToggleWishlist(product.id, e)}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: isWishlisted ? 'var(--color-sale)' : 'var(--color-ink)' }}
            >
              <Heart size={20} fill={isWishlisted ? 'var(--color-sale)' : 'none'} />
            </button>
          </div>
        </div>

        {/* Variants Selection (if any) */}
        {hasVariants && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', marginBottom: '8px', borderBottom: '1px solid var(--color-hairline-soft)' }}>
            {product.attributes.map(attr => {
              const isColorAttr = attr.name.toLowerCase() === 'color';
              return (
                <div key={attr.name} style={{ marginBottom: '12px' }}>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-ink)' }}>
                    Select {attr.name}:
                  </span>
                  {isColorAttr ? (
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
          </div>
        )}

        {/* Description & Specs collapsed accordions / tabs */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', marginBottom: '8px', borderBottom: '1px solid var(--color-hairline-soft)' }}>
          <div 
            onClick={() => setDetailsOpen(!detailsOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: detailsOpen ? '1px solid var(--color-hairline-soft)' : 'none' }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Product Details</span>
            {detailsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {detailsOpen && (
            <div style={{ padding: '12px 0 0', fontSize: '13px', color: 'var(--text-charcoal)', lineHeight: 1.6 }}>
              <p style={{ whiteSpace: 'pre-line', margin: '0 0 12px' }}>
                {product.longDescription || product.description}
              </p>
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '12px' }}>
                  <tbody>
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-charcoal)', fontSize: '13px' }}>{key}</td>
                        <td style={{ padding: '8px 0', color: 'var(--text-ink)', fontSize: '13px' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', marginBottom: '8px', borderBottom: '1px solid var(--color-hairline-soft)' }}>
          <div 
            onClick={() => setReviewsOpen(!reviewsOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Customer Reviews ({reviews.length})</span>
            {reviewsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {reviewsOpen && (
            <div style={{ paddingTop: '12px' }}>
              {/* Ratings Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700 }}>{product.rating || '0.0'}</span>
                <div>
                  <div style={{ display: 'flex', gap: '2px', color: '#dba617' }}>
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <Star key={starNum} size={14} fill={starNum <= Math.round(product.rating || 0) ? '#dba617' : 'none'} style={{ color: '#dba617' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-mute)' }}>Based on {reviews.length} reviews</span>
                </div>
              </div>

              {/* Reviews List */}
              {loadingReviews ? (
                <div>Loading...</div>
              ) : reviews.length === 0 ? (
                <div style={{ fontStyle: 'italic', color: 'var(--text-mute)', fontSize: '13px' }}>No reviews yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviews.map(rev => (
                    <div key={rev.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{rev.buyerName}</span>
                        <span style={{ color: 'var(--text-mute)' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1px', marginBottom: '6px', color: '#dba617' }}>
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <Star key={starNum} size={10} fill={starNum <= rev.rating ? '#dba617' : 'none'} style={{ color: '#dba617' }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-charcoal)', margin: 0 }}>{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Products Scroller */}
        {relatedProducts.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>You Might Also Like</h3>
            <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '8px' }}>
              {relatedProducts.map(prod => (
                <div 
                  key={prod.id}
                  onClick={() => {
                    onSelectProduct(prod);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ flex: '0 0 140px', width: '140px', cursor: 'pointer' }}
                >
                  <div style={{ aspectRatio: '1/1', backgroundColor: 'var(--color-soft-cloud)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-hairline-soft)', position: 'relative', marginBottom: '6px' }}>
                    <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h4 style={{ fontSize: '12px', fontWeight: 500, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</h4>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>KSh {prod.basePrice.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Sticky Action Bar */}
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '64px', 
          backgroundColor: '#ffffff', 
          borderTop: '1px solid var(--color-hairline-soft)', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 16px calc(env(safe-area-inset-bottom, 0px))', 
          boxSizing: 'content-box',
          gap: '12px',
          zIndex: 2000,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
        }}>
          <button 
            type="button" 
            onClick={() => navigate('/')}
            style={{ 
              width: '44px', 
              height: '44px', 
              border: '1px solid #dcdcdc', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--color-ink)', 
              cursor: 'pointer', 
              backgroundColor: '#ffffff' 
            }}
            aria-label="Go Home"
          >
            <Home size={20} />
          </button>
          <button 
            type="button" 
            onClick={() => window.location.href = 'tel:+254712345678'}
            style={{ 
              width: '44px', 
              height: '44px', 
              border: '1px solid #dcdcdc', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--color-ink)', 
              cursor: 'pointer', 
              backgroundColor: '#ffffff' 
            }}
            aria-label="Call Support"
          >
            <Phone size={20} />
          </button>
          <button 
            type="button" 
            className="btn-add-to-cart-mobile"
            onClick={handleAddToCartClick}
            disabled={isOutOfStock}
            style={{ 
              flex: 1, 
              height: '44px', 
              backgroundColor: '#f68b1e', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              fontWeight: 'bold', 
              fontSize: '15px', 
              cursor: 'pointer',
              opacity: isOutOfStock ? 0.5 : 1
            }}
          >
            <ShoppingCart size={18} />
            <span>ADD TO CART</span>
          </button>
        </div>

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
              padding: '24px',
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0
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
                overflow: 'hidden'
              }}
            >
              {isVideoUrl(galleryImages[activeImageIndex]) ? (
                getVideoEmbedUrl(galleryImages[activeImageIndex]) ? (
                  <iframe
                    src={getVideoEmbedUrl(galleryImages[activeImageIndex]) || ''}
                    style={{ width: '80vw', height: '80vh', border: 'none' }}
                    allow="autoplay; fullscreen"
                    title="product video lightbox"
                  />
                ) : (
                  <video src={galleryImages[activeImageIndex]} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
                )
              ) : (
                <img 
                  src={galleryImages[activeImageIndex]} 
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
  }

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
      <div className="responsive-grid-pdp">
        
        {/* Left Side: Main Image + Thumbnails */}
        <div className="pdp-gallery-container">
          {galleryImages.length > 1 && (
            <div className="pdp-thumbnails-strip">
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

          <div className="pdp-main-image-wrapper">
            <div 
              className="pdp-main-img-container" 
              onClick={() => setIsLightboxOpen(true)}
              style={{ border: '1px solid var(--color-hairline-soft)', width: '100%' }}
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
          </div>
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
              {!currentVariant && product.salePrice && product.salePrice > 0 && product.salePrice < product.basePrice ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--color-sale)', fontWeight: 700 }}>KSh {product.salePrice.toLocaleString()}</span>
                  <span style={{ textDecoration: 'line-through', color: 'var(--text-mute)', fontSize: '16px' }}>KSh {product.basePrice.toLocaleString()}</span>
                  <span style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>{Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)}% OFF</span>
                </span>
              ) : (
                `KSh ${activePrice.toLocaleString()}`
              )}
            </span>
            <p className="font-body-md" style={{ color: 'var(--text-charcoal)', lineHeight: 1.6 }}>
              {product.shortDescription || product.description}
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
            {/* Cumulative Product Ratings Summary */}
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              border: '1px solid var(--color-hairline-soft)',
              backgroundColor: 'var(--color-soft-cloud)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1 }}>
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div style={{ display: 'flex', gap: '2px', color: '#dba617' }}>
                  {[1, 2, 3, 4, 5].map(starNum => {
                    const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
                    return (
                      <Star 
                        key={starNum} 
                        size={12} 
                        fill={starNum <= Math.round(averageRating) ? '#dba617' : 'none'} 
                        style={{ color: '#dba617' }} 
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-mute)', fontWeight: 600, lineHeight: 1 }}>
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Tabs Section */}
      <div className="pdp-tabs-container">
        <div className="pdp-tabs-header">
          <button
            type="button"
            className={`pdp-tab-btn ${pdpActiveTab === 'overview' ? 'active' : ''}`}
            onClick={() => setPdpActiveTab('overview')}
          >
            Product Overview
          </button>
          <button
            type="button"
            className={`pdp-tab-btn ${pdpActiveTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setPdpActiveTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
          <button
            type="button"
            className={`pdp-tab-btn ${pdpActiveTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setPdpActiveTab('shipping')}
          >
            Shipping & Returns
          </button>
        </div>

        <div className="pdp-tabs-content">
          {pdpActiveTab === 'overview' && (
            <div className="pdp-tab-pane pdp-tab-fade-in">
              <div className="pdp-tab-overview-grid">
                <div>
                  <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Description</h3>
                  <p style={{ whiteSpace: 'pre-line', fontSize: '15px', color: 'var(--text-charcoal)', lineHeight: 1.7 }}>
                    {product.longDescription || product.description}
                  </p>
                </div>
                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div>
                    <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Specifications</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <tbody>
                        {Object.entries(product.specifications).map(([key, val]) => (
                          <tr key={key} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                            <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--text-charcoal)', width: '45%', fontSize: '14px' }}>{key}</td>
                            <td style={{ padding: '12px 0', color: 'var(--text-ink)', fontSize: '14px' }}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {pdpActiveTab === 'reviews' && (
            <div className="pdp-tab-pane pdp-tab-fade-in">
              <div className="pdp-tab-reviews-grid" style={{ marginTop: '32px' }}>
                {/* Left Side: Summary & Write Review */}
                <div>
                  <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Customer Ratings</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '48px', fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1 }}>{product.rating || '0.0'}</span>
                    <div>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <Star 
                            key={starNum} 
                            size={18} 
                            fill={starNum <= Math.round(product.rating || 0) ? 'var(--text-ink)' : 'none'} 
                            style={{ color: 'var(--text-ink)' }} 
                          />
                        ))}
                      </div>
                      <span className="font-caption-sm" style={{ color: 'var(--text-mute)' }}>Based on {reviews.length} reviews</span>
                    </div>
                  </div>

                  {/* Review Submit form */}
                  <div style={{ backgroundColor: 'var(--color-soft-cloud)', padding: '24px', borderRadius: 'var(--radius-none)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Write a Review</h4>
                    {!currentUser ? (
                      <span className="font-caption-sm" style={{ color: 'var(--color-sale)', fontWeight: 600 }}>Please sign in to write a review.</span>
                    ) : checkingPurchase ? (
                      <span className="font-caption-sm" style={{ color: 'var(--text-mute)' }}>Verifying purchase status...</span>
                    ) : !hasPurchased ? (
                      <div style={{ padding: '12px', border: '1px dashed var(--color-sale)', backgroundColor: '#fffdfd', color: 'var(--color-sale)', fontSize: '13px', fontWeight: 500 }}>
                        Only verified buyers who have purchased this product can leave a review.
                      </div>
                    ) : (
                      <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reviewSuccess && (
                          <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '13px' }}>
                            {reviewSuccess}
                          </div>
                        )}
                        <div>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            style={{ minHeight: '40px', padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Rating</label>
                          <div style={{ display: 'flex', gap: '6px', height: '32px', alignItems: 'center' }}>
                            {[1, 2, 3, 4, 5].map(starNum => (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => setFormRating(starNum)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <Star 
                                  size={24} 
                                  fill={starNum <= formRating ? "var(--text-ink)" : "none"} 
                                  style={{ color: 'var(--text-ink)' }} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Review Details</label>
                          <textarea
                            className="form-input"
                            rows={4}
                            value={formComment}
                            onChange={e => setFormComment(e.target.value)}
                            placeholder="Share your experience..."
                            style={{ minHeight: '80px', padding: '8px 12px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary btn-small" style={{ width: '100%' }}>
                          Submit Review
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Right Side: Reviews List */}
                <div>
                  <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Reviews ({reviews.length})</h3>
                  {loadingReviews ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {[1, 2, 3].map(n => (
                        <div key={n} style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '18px', width: '140px' }} />
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '12px', width: '80px' }} />
                          </div>
                          <div className="skeleton-row-box skeleton-pulse" style={{ height: '14px', width: '100px', marginBottom: '12px' }} />
                          <div className="skeleton-row-box skeleton-pulse" style={{ height: '14px', width: '100%' }} />
                        </div>
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-mute)', fontSize: '15px' }}>No reviews yet. Be the first to write one!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {reviews.map(rev => (
                        <div key={rev.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>{rev.buyerName}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                            {[1, 2, 3, 4, 5].map(starNum => (
                              <Star 
                                key={starNum} 
                                size={14} 
                                fill={starNum <= rev.rating ? 'var(--text-ink)' : 'none'} 
                                style={{ color: 'var(--text-ink)' }} 
                              />
                            ))}
                          </div>
                          <p style={{ fontSize: '15px', color: 'var(--text-charcoal)', margin: 0, lineHeight: 1.6 }}>{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {pdpActiveTab === 'shipping' && (
            <div className="pdp-tab-pane pdp-tab-fade-in" style={{ marginTop: '32px' }}>
              <div style={{ maxWidth: '800px' }}>
                <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Shipping & Delivery</h3>
                <p style={{ fontSize: '15px', color: 'var(--text-charcoal)', lineHeight: 1.7, marginBottom: '16px' }}>
                  Free standard shipping on orders over KSh 30,000. For orders below this threshold, a flat delivery fee of KSh 500 applies nationwide.
                </p>
                <p style={{ fontSize: '15px', color: 'var(--text-charcoal)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Orders are processed and dispatched within 24 to 48 hours. Delivery timelines are typically 1-3 business days depending on location.
                </p>
                <h3 className="font-heading-md" style={{ marginBottom: '16px' }}>Returns & Exchanges</h3>
                <p style={{ fontSize: '15px', color: 'var(--text-charcoal)', lineHeight: 1.7 }}>
                  Returns are accepted within 30 days of purchase. Items must be returned in their original packaging, unused, and in the same condition that they were received.
                </p>
              </div>
            </div>
          )}
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

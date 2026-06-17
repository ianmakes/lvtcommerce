import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Lock, 
  ChevronRight, 
  Star, 
  ChevronLeft,
  Heart
} from 'lucide-react';
import { Product, HomeSlide, Category, ShopSettings } from '../types';

interface HomePageProps {
  products: Product[];
  slides: HomeSlide[];
  activeSlide: number;
  setActiveSlide: React.Dispatch<React.SetStateAction<number>>;
  categories: string[];
  dbCategories: Category[];
  navigate: (to: string) => void;
  onAddToCart: (product: Product, quantity: number, variantId?: string) => void;
  isWishlisted: (id: string) => boolean;
  onToggleWishlist: (product: Product) => void;
  onQuickView: (product: Product) => void;
  handleShowToast: (msg: string, type: 'success' | 'warning') => void;
  onSelectCategory: (category: string) => void;
  settings: ShopSettings;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  slides,
  activeSlide,
  setActiveSlide,
  categories,
  dbCategories,
  navigate,
  onAddToCart,
  onQuickView,
  handleShowToast,
  onSelectCategory,
  settings,
  isWishlisted,
  onToggleWishlist
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('All');

  // Auto advance hero slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [slides.length, setActiveSlide]);

  // Video embed helpers for hero slider
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0` : null;
  };

  const getVimeoEmbedUrl = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1&background=1` : null;
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    return getYouTubeEmbedUrl(url) || getVimeoEmbedUrl(url);
  };

  // Filter products by tab
  const getFilteredProductsForTab = () => {
    if (selectedTab === 'All') {
      return products.slice(0, 8);
    }
    return products
      .filter(p => (p.categories || [p.category]).includes(selectedTab))
      .slice(0, 8);
  };

  // Get dynamic categories list for sidebar
  const sidebarCategoriesList = dbCategories.length > 0 
    ? dbCategories.map(c => c.name) 
    : categories.filter(c => c !== 'All');

  return (
    <div className="homepage-redesign">
      
      {/* 1. Category Sidebar + Hero Slider side-by-side */}
      <section className="homepage-hero-section">
        <div className="container hero-split-container">
          
          {/* Left Sidebar Menu (Fully Dynamic Realtime Categories) */}
          <div className="hero-category-sidebar">
            <div className="sidebar-header">
              <span className="hamburger-lines">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <h3>All Categories</h3>
            </div>
            <ul className="sidebar-list">
              {sidebarCategoriesList.map(catName => (
                <li key={catName} className="sidebar-item" onClick={() => onSelectCategory(catName)}>
                  <span>{catName}</span>
                  <ChevronRight size={14} className="sidebar-arrow" />
                </li>
              ))}
            </ul>
          </div>

          {/* Right Hero Slider */}
          <div className="homepage-slider-container">
            {slides.length > 0 ? (
              slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`homepage-slide ${idx === activeSlide ? 'active' : ''}`}
                  style={{
                    backgroundImage: slide.mediaType !== 'video' ? `linear-gradient(135deg, rgba(26, 35, 126, 0.85) 0%, rgba(13, 71, 161, 0.4) 100%), url(${slide.image})` : 'linear-gradient(135deg, rgba(26, 35, 126, 0.9) 0%, rgba(13, 71, 161, 0.6) 100%)'
                  }}
                >
                  {slide.mediaType === 'video' && slide.videoUrl && (
                    <div className="slide-video-overlay">
                      {getVideoEmbedUrl(slide.videoUrl) ? (
                        <iframe
                          src={getVideoEmbedUrl(slide.videoUrl) || ''}
                          className="slide-video-iframe"
                          allow="autoplay; fullscreen"
                          title="slide video"
                        />
                      ) : (
                        <video src={slide.videoUrl} autoPlay muted loop playsInline className="slide-video-element" />
                      )}
                    </div>
                  )}
                  
                  <div className="slide-content-wrapper">
                    <span className="slide-tagline" style={{ color: '#e8eaf6' }}>16X Digital Zoom 1080P HD SLR Camera</span>
                    <h1 className="slide-title-display" style={{ color: '#ffffff' }}>{slide.title}</h1>
                    <p className="slide-description-text" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>{slide.description}</p>
                    <div className="slide-actions-row">
                      <button 
                        className="btn-red-action" 
                        onClick={() => {
                          if (slide.buttonLink.startsWith('http')) {
                            window.open(slide.buttonLink, '_blank');
                          } else {
                            navigate(slide.buttonLink);
                          }
                        }}
                      >
                        {slide.buttonText || 'Shop Recently'}
                      </button>
                      <button 
                        className="btn-blue-outline"
                        onClick={() => navigate('/shop')}
                      >
                        Shop Popular
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="slide-placeholder-loader">
                <span className="slide-loader-text">Loading Gallery...</span>
              </div>
            )}

            {/* Slider Controls (Dots only, arrows removed) */}
            {slides.length > 1 && (
              <div className="slider-nav-dots">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`slider-nav-dot ${idx === activeSlide ? 'active' : ''}`}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 2. Feature Badges Row */}
      <section className="homepage-badges-section">
        <div className="container">
          <div className="badges-grid">
            <div className="badge-card">
              <div className="badge-icon-box">
                <Truck size={24} className="badge-icon" />
              </div>
              <div className="badge-text-box">
                <h4>{settings.cmsBadge1Title || "Delivery Free 24 hrs"}</h4>
                <p>{settings.cmsBadge1Desc || "Light speed delivery right to your door step"}</p>
              </div>
            </div>
            <div className="badge-card">
              <div className="badge-icon-box">
                <ShieldCheck size={24} className="badge-icon" />
              </div>
              <div className="badge-text-box">
                <h4>{settings.cmsBadge2Title || "Quality assurance"}</h4>
                <p>{settings.cmsBadge2Desc || "100% genuine products with full warranty support"}</p>
              </div>
            </div>
            <div className="badge-card">
              <div className="badge-icon-box">
                <Lock size={24} className="badge-icon" />
              </div>
              <div className="badge-text-box">
                <h4>{settings.cmsBadge3Title || "100% Secure Checkout"}</h4>
                <p>{settings.cmsBadge3Desc || "Your transactions are encrypted and secure"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deals of the Week */}
      <section className="homepage-deals-section">
        <div className="container">
          <div className="section-header-row">
            <h2 className="section-heading-dark">Deals of the Week</h2>
            <button onClick={() => navigate('/shop')} className="btn-link-shop-all">
              Shop All &rarr;
            </button>
          </div>
          
          <div className="deals-products-grid">
            {products.filter(p => p.isFeatured).slice(0, 4).map((prod, idx) => {
              const discounts = ["-15%", "-10%", "-25%", "-20%"];
              const disc = discounts[idx % discounts.length];
              return (
                <div key={prod.id} className="deal-product-card featured-highlight" onClick={() => navigate(`/product/${prod.id}`)}>
                  <div className="deal-img-wrapper">
                    <div className="deal-badges-group">
                      <span className="deal-badge-percent">{disc}</span>
                      <span className="deal-badge-featured">FEATURED</span>
                    </div>
                    
                    {/* Wishlist Button */}
                    <button
                      type="button"
                      className="btn-icon-circular"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(prod);
                      }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s ease, background-color 0.2s'
                      }}
                      aria-label={isWishlisted(prod.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart 
                        size={18} 
                        fill={isWishlisted(prod.id) ? "var(--color-sale)" : "none"} 
                        style={{ 
                          color: isWishlisted(prod.id) ? "var(--color-sale)" : "var(--color-ink)",
                          transition: 'fill 0.2s'
                        }} 
                      />
                    </button>

                    <img src={prod.image} alt={prod.name} className="deal-product-image" />
                    
                    {/* Action overlays for add to cart and quick view */}
                    <div className="deal-hover-actions">
                      <button 
                        className="btn-quickview"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickView(prod);
                        }}
                      >
                        Quick View
                      </button>
                      <button 
                        className="btn-add-cart"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(prod, 1);
                          handleShowToast(`${prod.name} added to cart!`, 'success');
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  <div className="deal-info-wrapper">
                    <h4 
                      className="deal-product-name"
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        if (el.scrollWidth > el.clientWidth) {
                          el.setAttribute('title', prod.name);
                        } else {
                          el.removeAttribute('title');
                        }
                      }}
                    >
                      {prod.name}
                    </h4>
                    <div className="deal-rating-box">
                      <div className="stars-row">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.round(prod.rating || 5) ? "#dba617" : "none"} color="#dba617" />
                        ))}
                      </div>
                      <span className="review-count">({prod.reviewCount || 0})</span>
                    </div>
                    <div className="deal-price-box">
                      {prod.salePrice && prod.salePrice > 0 && prod.salePrice < prod.basePrice ? (
                        <>
                          <span className="deal-price-new">KSh {prod.salePrice.toLocaleString()}</span>
                          <span className="deal-price-old">KSh {prod.basePrice.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="deal-price-new">KSh {prod.basePrice.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Promotional Full-Width Banner */}
      <section className="homepage-promo-banner-section">
        <div className="container">
          <div className="promo-banner-blue">
            <div className="promo-banner-content">
              <h2 style={{ color: '#ffffff' }}>{settings.cmsPromoBannerTitle || "Celebrate July with Discounts on All Phone Accessories!"}</h2>
              <div className="promo-banner-actions">
                <button className="btn-red-action" onClick={() => navigate(settings.cmsPromoBannerBtn1Link || '/shop')}>
                  {settings.cmsPromoBannerBtn1Text || "Shop Recently"} &rarr;
                </button>
                <button className="btn-blue-outline" onClick={() => navigate(settings.cmsPromoBannerBtn2Link || '/shop')}>
                  {settings.cmsPromoBannerBtn2Text || "Shop Popular"} &rarr;
                </button>
              </div>
            </div>
            <div className="promo-banner-design-accent">
              <span className="accent-bar-1"></span>
              <span className="accent-bar-2"></span>
              <span className="accent-bar-3"></span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Two Promo Cards side-by-side (Linked to actual dynamic products) */}
      <section className="homepage-two-banners-section">
        <div className="container">
          <div className="two-banners-grid">
            
            {/* Banner 1 */}
            <div 
              className="promo-card-box purple-gradient-box" 
              onClick={() => navigate(settings.cmsCard1Link || (products[0] ? `/product/${products[0].id}` : '/shop'))} 
              style={{ cursor: 'pointer' }}
            >
              <div className="promo-card-text">
                <span className="promo-badge-text" style={{ color: '#e8eaf6' }}>{settings.cmsCard1Badge || "Save Up To 70%"}</span>
                <h3 style={{ color: '#ffffff' }}>{settings.cmsCard1Title || (products[0] ? products[0].name : "Great discounts on accessories")}</h3>
                <p className="promo-price-tag" style={{ color: '#fcd34d' }}>
                  {settings.cmsCard1Price || (products[0] ? `KSh ${products[0].basePrice.toLocaleString()}` : "$120.00")}
                </p>
                <button className="btn-red-action-small" onClick={(e) => {
                  e.stopPropagation();
                  navigate(settings.cmsCard1Link || (products[0] ? `/product/${products[0].id}` : '/shop'));
                }}>
                  Shop Now &rarr;
                </button>
              </div>
              <div className="promo-card-image-box">
                {(settings.cmsCard1Image || (products[0] && products[0].image)) && (
                  <img src={settings.cmsCard1Image || products[0]?.image} alt={settings.cmsCard1Title || products[0]?.name || "promo 1"} className="floating-img" />
                )}
              </div>
            </div>

            {/* Banner 2 */}
            <div 
              className="promo-card-box dark-navy-box" 
              onClick={() => navigate(settings.cmsCard2Link || (products[1] ? `/product/${products[1].id}` : '/shop'))} 
              style={{ cursor: 'pointer' }}
            >
              <div className="promo-card-text">
                <span className="promo-badge-text" style={{ color: '#e8eaf6' }}>{settings.cmsCard2Badge || "Local Alarm Clock"}</span>
                <h3 style={{ color: '#ffffff' }}>{settings.cmsCard2Title || (products[1] ? products[1].name : "Smart alarm for daily routine")}</h3>
                <p className="promo-price-tag" style={{ color: '#fcd34d' }}>
                  {settings.cmsCard2Price || (products[1] ? `KSh ${products[1].basePrice.toLocaleString()}` : "")}
                </p>
                <button className="btn-red-action-small" onClick={(e) => {
                  e.stopPropagation();
                  navigate(settings.cmsCard2Link || (products[1] ? `/product/${products[1].id}` : '/shop'));
                }}>
                  Shop Now &rarr;
                </button>
              </div>
              <div className="promo-card-image-box">
                {(settings.cmsCard2Image || (products[1] && products[1].image)) && (
                  <img src={settings.cmsCard2Image || products[1]?.image} alt={settings.cmsCard2Title || products[1]?.name || "promo 2"} className="floating-img" />
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Explore Inventory (Tabbed Product Explorer) */}
      <section className="homepage-explore-inventory-section">
        <div className="container">
          <h2 className="explore-section-heading">Explore Inventory</h2>
          
          {/* Tab Selector */}
          <div className="explore-tabs-bar">
            {categories.slice(0, 4).map(cat => (
              <button
                key={cat}
                className={`explore-tab-btn ${selectedTab === cat ? 'active' : ''}`}
                onClick={() => setSelectedTab(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tab Product Grid */}
          <div className="explore-products-grid">
            {getFilteredProductsForTab().map(prod => (
              <div key={prod.id} className="explore-product-card" onClick={() => navigate(`/product/${prod.id}`)}>
                <div className="explore-img-container">
                  {prod.badge ? (
                    <span className="explore-badge">{prod.badge}</span>
                  ) : (prod.salePrice && prod.salePrice > 0 && prod.salePrice < prod.basePrice) ? (
                    <span className="explore-badge">SALE</span>
                  ) : null}
                  
                  {/* Wishlist Button */}
                  <button
                    type="button"
                    className="btn-icon-circular"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(prod);
                    }}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease, background-color 0.2s'
                    }}
                    aria-label={isWishlisted(prod.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart 
                      size={18} 
                      fill={isWishlisted(prod.id) ? "var(--color-sale)" : "none"} 
                      style={{ 
                        color: isWishlisted(prod.id) ? "var(--color-sale)" : "var(--color-ink)",
                        transition: 'fill 0.2s'
                      }} 
                    />
                  </button>

                  <img src={prod.image} alt={prod.name} className="explore-img" />
                  
                  {/* Action overlays to make it interactive on hover */}
                  <div className="explore-hover-actions">
                    <button 
                      className="btn-quickview"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickView(prod);
                      }}
                    >
                      Quick View
                    </button>
                    <button 
                      className="btn-add-cart"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(prod, 1);
                        handleShowToast(`${prod.name} added to cart!`, 'success');
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
                <div className="explore-metadata">
                  <h4 
                    className="explore-title"
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      if (el.scrollWidth > el.clientWidth) {
                        el.setAttribute('title', prod.name);
                      } else {
                        el.removeAttribute('title');
                      }
                    }}
                  >
                    {prod.name}
                  </h4>

                  {/* Subtle Review Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-mute)', margin: '4px 0 6px' }}>
                    <div style={{ display: 'flex', color: '#dba617' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} style={{ fontSize: '12px', lineHeight: 1 }}>
                          {star <= Math.round(prod.rating || 0) ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-mute)' }}>
                      ({prod.reviewCount || 0})
                    </span>
                  </div>

                  <div className="explore-price-row">
                    {prod.salePrice && prod.salePrice > 0 && prod.salePrice < prod.basePrice ? (
                      <>
                        <span className="explore-price-sale" style={{ color: 'var(--color-sale)', fontWeight: 700 }}>KSh {prod.salePrice.toLocaleString()}</span>
                        <span className="explore-price-original" style={{ textDecoration: 'line-through', color: 'var(--text-mute)', fontSize: '13px', marginLeft: '6px' }}>KSh {prod.basePrice.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="explore-price">KSh {prod.basePrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="explore-more-btn-box">
            <button className="btn-explore-more" onClick={() => navigate('/shop')}>
              Explore Inventory &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 8. Brand Logos Bar */}
      <section className="homepage-brand-bar">
        <div className="container">
          <div className="brand-logos-row">
            <div className="brand-logo-item">
              <span className="logo-placeholder-text">TopBrand</span>
            </div>
            <div className="brand-logo-item">
              <span className="logo-placeholder-text">Retro Brand</span>
            </div>
            <div className="brand-logo-item">
              <span className="logo-placeholder-text">LogoIpsum</span>
            </div>
            <div className="brand-logo-item">
              <span className="logo-placeholder-text">LogoIpsum</span>
            </div>
            <div className="brand-logo-item">
              <span className="logo-placeholder-text">LogoIpsum</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Newsletter Section */}
      <section className="homepage-newsletter-section">
        <div className="container">
          <div className="newsletter-wrapper-box">
            <div className="newsletter-text-box">
              <h3>Subscribe our newsletter</h3>
              <p>Subscribe to receive design releases, structural upgrades, and exclusive pre-order discounts.</p>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleShowToast("Subscribed successfully!", "success");
                (e.target as HTMLFormElement).reset();
              }}
              className="newsletter-form-box"
            >
              <input 
                type="email" 
                placeholder="Enter email address" 
                className="newsletter-input" 
                required 
              />
              <button type="submit" className="newsletter-btn">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
};

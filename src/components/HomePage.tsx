import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Lock, 
  ChevronRight, 
  Star, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Heart,
  ChevronLeft
} from 'lucide-react';
import { Product, HomeSlide, Category } from '../types';

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
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  handleShowToast
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto advance hero slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 6000);
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

  // Helper to slice products for columns
  const getBestSellers = () => {
    return [...products]
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 4);
  };

  const getNewArrivals = () => {
    // Just slice or sort by id descending (assuming newer ones have higher IDs or are later in the array)
    return [...products].reverse().slice(0, 4);
  };

  const getRecommended = () => {
    return products.filter(p => p.isFeatured).slice(0, 4).length > 0
      ? products.filter(p => p.isFeatured).slice(0, 4)
      : products.slice(0, 4);
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

  // Static Testimonials
  const testimonials = [
    {
      id: 1,
      name: "Arlene McCoy",
      role: "Customer",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      content: "The Carbon Fiber Walking Staff completely transformed my morning routines. It is incredibly lightweight and looks absolutely beautiful. Excellent customer support too!"
    },
    {
      id: 2,
      name: "Eleanor Pena",
      role: "Designer",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      content: "I'm obsessed with the Smart Modular Capsule Pod. It sits on my counter like a piece of modern art, and the Bluetooth reminders make sure I never miss my wellness routine."
    },
    {
      id: 3,
      name: "Guy Hawkins",
      role: "Active Recovery",
      rating: 4,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      content: "High quality thermal recovery wraps. The heat settings are precise, and the battery life is solid. It's definitely premium grade."
    }
  ];

  return (
    <div className="homepage-redesign">
      
      {/* 1. Category Sidebar + Hero Slider side-by-side */}
      <section className="homepage-hero-section">
        <div className="container hero-split-container">
          
          {/* Left Sidebar Menu */}
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
              {dbCategories.map(cat => (
                <li key={cat.id} className="sidebar-item" onClick={() => navigate('/shop')}>
                  <span>{cat.name}</span>
                  <ChevronRight size={14} className="sidebar-arrow" />
                </li>
              ))}
              {/* Fillers to match the screenshot if categories are few */}
              {dbCategories.length < 5 && (
                <>
                  <li className="sidebar-item" onClick={() => navigate('/shop')}>
                    <span>Wellness Wearables</span>
                    <ChevronRight size={14} className="sidebar-arrow" />
                  </li>
                  <li className="sidebar-item" onClick={() => navigate('/shop')}>
                    <span>Smart Organizers</span>
                    <ChevronRight size={14} className="sidebar-arrow" />
                  </li>
                  <li className="sidebar-item" onClick={() => navigate('/shop')}>
                    <span>Daily Visual Aids</span>
                    <ChevronRight size={14} className="sidebar-arrow" />
                  </li>
                  <li className="sidebar-item" onClick={() => navigate('/shop')}>
                    <span>Recovery Supports</span>
                    <ChevronRight size={14} className="sidebar-arrow" />
                  </li>
                </>
              )}
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
                    <span className="slide-tagline">16X Digital Zoom 1080P HD SLR Camera</span>
                    <h1 className="slide-title-display">{slide.title}</h1>
                    <p className="slide-description-text">{slide.description}</p>
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

            {/* Slider Controls */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  className="slider-control-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
                  }}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="slider-control-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide(prev => (prev + 1) % slides.length);
                  }}
                  aria-label="Next slide"
                >
                  <ChevronRight size={20} />
                </button>
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
              </>
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
                <h4>Delivery Free 24 hrs</h4>
                <p>Light speed delivery right to your door step</p>
              </div>
            </div>
            <div className="badge-card">
              <div className="badge-icon-box">
                <ShieldCheck size={24} className="badge-icon" />
              </div>
              <div className="badge-text-box">
                <h4>Quality assurance</h4>
                <p>100% genuine products with full warranty support</p>
              </div>
            </div>
            <div className="badge-card">
              <div className="badge-icon-box">
                <Lock size={24} className="badge-icon" />
              </div>
              <div className="badge-text-box">
                <h4>100% Secure Checkout</h4>
                <p>Your transactions are encrypted and secure</p>
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
            {products.slice(0, 4).map((prod, idx) => {
              // Create dynamic discounts to simulate screenshot
              const discounts = ["-15%", "-10%", "-25%", "-20%"];
              const disc = discounts[idx % discounts.length];
              return (
                <div key={prod.id} className="deal-product-card" onClick={() => navigate(`/product/${prod.id}`)}>
                  <div className="deal-img-wrapper">
                    <span className="deal-badge-percent">{disc}</span>
                    <img src={prod.image} alt={prod.name} className="deal-product-image" />
                  </div>
                  <div className="deal-info-wrapper">
                    <h4 className="deal-product-name">{prod.name}</h4>
                    <div className="deal-rating-box">
                      <div className="stars-row">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.round(prod.rating || 5) ? "#dba617" : "none"} color="#dba617" />
                        ))}
                      </div>
                      <span className="review-count">({prod.reviewCount || 0})</span>
                    </div>
                    <div className="deal-price-box">
                      <span className="deal-price-new">KSh {prod.basePrice.toLocaleString()}</span>
                      <span className="deal-price-old">KSh {Math.round(prod.basePrice * 1.2).toLocaleString()}</span>
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
              <h2>Celebrate July with Discounts on All Phone Accessories!</h2>
              <div className="promo-banner-actions">
                <button className="btn-red-action" onClick={() => navigate('/shop')}>
                  Shop Recently &rarr;
                </button>
                <button className="btn-blue-outline" onClick={() => navigate('/shop')}>
                  Shop Popular &rarr;
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

      {/* 5. Product Columns (3-up) */}
      <section className="homepage-columns-section">
        <div className="container">
          <div className="columns-grid">
            
            {/* Column 1: Best Sellers */}
            <div className="product-column-box">
              <h3 className="column-heading">Best Sellers</h3>
              <div className="column-items-list">
                {getBestSellers().map(prod => (
                  <div key={prod.id} className="column-product-row" onClick={() => navigate(`/product/${prod.id}`)}>
                    <div className="column-img-box">
                      <img src={prod.image} alt={prod.name} />
                    </div>
                    <div className="column-text-box">
                      <h4>{prod.name}</h4>
                      <p className="column-price">KSh {prod.basePrice.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: New Arrival */}
            <div className="product-column-box">
              <h3 className="column-heading">New Arrival</h3>
              <div className="column-items-list">
                {getNewArrivals().map(prod => (
                  <div key={prod.id} className="column-product-row" onClick={() => navigate(`/product/${prod.id}`)}>
                    <div className="column-img-box">
                      <img src={prod.image} alt={prod.name} />
                    </div>
                    <div className="column-text-box">
                      <h4>{prod.name}</h4>
                      <p className="column-price">KSh {prod.basePrice.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Recommended for you */}
            <div className="product-column-box">
              <h3 className="column-heading">Recommended for you</h3>
              <div className="column-items-list">
                {getRecommended().map(prod => (
                  <div key={prod.id} className="column-product-row" onClick={() => navigate(`/product/${prod.id}`)}>
                    <div className="column-img-box">
                      <img src={prod.image} alt={prod.name} />
                    </div>
                    <div className="column-text-box">
                      <h4>{prod.name}</h4>
                      <p className="column-price">KSh {prod.basePrice.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Two Promo Cards side-by-side */}
      <section className="homepage-two-banners-section">
        <div className="container">
          <div className="two-banners-grid">
            
            {/* Banner 1 */}
            <div className="promo-card-box purple-gradient-box">
              <div className="promo-card-text">
                <span className="promo-badge-text">Save Up To 70%</span>
                <h3>Great discounts on accessories</h3>
                <p className="promo-price-tag">$120.00</p>
                <button className="btn-red-action-small" onClick={() => navigate('/shop')}>
                  Shop Now &rarr;
                </button>
              </div>
              <div className="promo-card-image-box">
                {products[0] && (
                  <img src={products[0].image} alt="Featured product" className="floating-img" />
                )}
              </div>
            </div>

            {/* Banner 2 */}
            <div className="promo-card-box dark-navy-box">
              <div className="promo-card-text">
                <span className="promo-badge-text">Local Alarm Clock</span>
                <h3>Smart alarm for daily routine</h3>
                <button className="btn-red-action-small" onClick={() => navigate('/shop')}>
                  Shop Now &rarr;
                </button>
              </div>
              <div className="promo-card-image-box">
                {products[1] && (
                  <img src={products[1].image} alt="Featured product" className="floating-img" />
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
                  {prod.badge && (
                    <span className="explore-badge">{prod.badge}</span>
                  )}
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
                  <h4 className="explore-title">{prod.name}</h4>
                  <div className="explore-price-row">
                    <span className="explore-price">KSh {prod.basePrice.toLocaleString()}</span>
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

      {/* 9. Testimonials */}
      <section className="homepage-testimonials-section">
        <div className="container">
          <div className="testimonials-list-row">
            {testimonials.map((test, idx) => (
              <div 
                key={test.id} 
                className={`testimonial-single-card ${idx === activeTestimonial ? 'active' : ''}`}
                style={{ display: idx === activeTestimonial ? 'flex' : 'none' }}
              >
                <div className="testimonial-avatar-box">
                  <img src={test.avatar} alt={test.name} />
                </div>
                <div className="testimonial-content-box">
                  <div className="testimonial-stars">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="#dba617" color="#dba617" />
                    ))}
                  </div>
                  <p className="testimonial-quote">"{test.content}"</p>
                  <h4 className="testimonial-author">{test.name}</h4>
                  <span className="testimonial-role">{test.role}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="testimonials-nav-dots">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                className={`testimonial-nav-dot ${idx === activeTestimonial ? 'active' : ''}`}
                onClick={() => setActiveTestimonial(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
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

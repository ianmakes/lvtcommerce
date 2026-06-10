import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, Settings, CheckCircle, Truck, Ban, X, Loader2, Image as ImageIcon, PackageCheck,
  Users, FileText, Layers, Tag, LogOut, ExternalLink, Activity
} from 'lucide-react';
import { Product, Order, ShopSettings, Attribute, ProductVariant } from '../types';
import { getProducts, saveProduct, deleteProduct, getOrders, updateOrderStatus, getSettings, saveSettings } from '../db';
import { useLocation, navigate } from '../Router';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface AdminDashboardProps {
  settings: ShopSettings;
  onChangeSettings: (newSettings: ShopSettings) => void;
  onRefreshProducts: () => void;
}

// Cloudinary Preset Samples
const CLOUDINARY_SAMPLES = [
  { name: "Cane Sample", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png" },
  { name: "Pill Box", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-5.jpg" },
  { name: "Microfiber Wrap", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-3.jpg" },
  { name: "Magnifying Zoom", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif" },
  { name: "Woman Field", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035257/samples/woman-on-a-football-field.jpg" },
  { name: "Coffee Break", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035256/samples/coffee.jpg" },
  { name: "Posture Chair", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035256/samples/chair.png" },
  { name: "Portrait Model", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035255/samples/man-portrait.jpg" },
  { name: "Walker Slippers", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035249/samples/shoe.jpg" },
  { name: "Outdoor Seniors", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035248/samples/two-ladies.jpg" },
  { name: "Herb Spices", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035244/samples/food/spices.jpg" },
  { name: "Leather Bag", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035243/samples/ecommerce/leather-bag-gray.jpg" },
  { name: "Wellness Bike", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035239/samples/bike.jpg" },
  { name: "Nature Sheep", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035238/samples/sheep.jpg" },
  { name: "Dessert Fruit", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035235/samples/food/dessert.jpg" },
  { name: "Seniors Winter", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035240/samples/people/boy-snow-hoodie.jpg" },
  { name: "Leisure Bicycle", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035242/samples/people/bicycle.jpg" },
  { name: "Bright Balloons", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035250/samples/balloons.jpg" },
  { name: "Warm Cushion", url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-4.jpg" }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onChangeSettings,
  onRefreshProducts,
}) => {
  const path = useLocation();

  // activeTab derived from URL path
  let activeTab: 'overview' | 'orders' | 'products' | 'settings' | 'customers' | 'reports' | 'categories' | 'tags' = 'overview';
  if (path === '/dashboard/orders') activeTab = 'orders';
  else if (path === '/dashboard/products') activeTab = 'products';
  else if (path === '/dashboard/settings') activeTab = 'settings';
  else if (path === '/dashboard/customers') activeTab = 'customers';
  else if (path === '/dashboard/reports') activeTab = 'reports';
  else if (path === '/dashboard/categories') activeTab = 'categories';
  else if (path === '/dashboard/tags') activeTab = 'tags';
  
  // Lists from Firestore DB
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [localSettings, setLocalSettings] = useState<ShopSettings>(settings);
  const [isLoading, setIsLoading] = useState(false);

  // Form Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeOrderDetails, setActiveOrderDetails] = useState<Order | null>(null);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImg, setProdImg] = useState('');
  const [prodGallery, setProdGallery] = useState<string[]>([]);
  const [prodAttrs, setProdAttrs] = useState<Attribute[]>([]);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [editorTab, setEditorTab] = useState<'general' | 'attributes' | 'variations'>('general');

  // Cloudinary Upload State
  const [uploadingImage, setUploadingImage] = useState(false);

  // Temp Attribute Editor
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');

  // Load Admin Data from Firestore
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const dbProds = await getProducts();
      const dbOrders = await getOrders();
      const dbSettings = await getSettings();
      setProducts(dbProds);
      setOrders(dbOrders);
      setLocalSettings(dbSettings);
    } catch (e) {
      console.error("Error loading data from Firestore:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData();
  }, []);

  // Web Crypto SHA-1 Generation for Cloudinary Signed Upload
  const generateSha1 = async (str: string): Promise<string> => {
    const utf8 = new TextEncoder().encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Direct Signed Upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const cloudinaryCloudName = "dhvnbtkgw";
      const cloudinaryApiKey = "826498111838123";
      const cloudinaryApiSecret = "tZkjGNGSkZFKBckwfCh9wkxniy0";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Cloudinary parameters sorting: alphabetical parameters joined with '&', followed by Secret Key (no &)
      // Since we are only passing 'timestamp', the parameter string is just: timestamp=<val>
      const signatureString = `timestamp=${timestamp}${cloudinaryApiSecret}`;
      const signature = await generateSha1(signatureString);

      // Construct Form Data payload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", cloudinaryApiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status: ${res.status}`);
      }

      const json = await res.json();
      setProdImg(json.secure_url);
      alert("Image uploaded to Cloudinary successfully!");
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      alert("Failed to upload image to Cloudinary. Please try again or select a sample image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Direct Signed Upload of Multiple Gallery Images to Cloudinary
  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const cloudinaryCloudName = "dhvnbtkgw";
      const cloudinaryApiKey = "826498111838123";
      const cloudinaryApiSecret = "tZkjGNGSkZFKBckwfCh9wkxniy0";

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureString = `timestamp=${timestamp}${cloudinaryApiSecret}`;
        const signature = await generateSha1(signatureString);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", cloudinaryApiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          const json = await res.json();
          uploadedUrls.push(json.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setProdGallery(prev => [...prev, ...uploadedUrls]);
        alert(`Successfully uploaded ${uploadedUrls.length} image(s) to product gallery!`);
      } else {
        alert("Failed to upload gallery images to Cloudinary.");
      }
    } catch (err) {
      console.error("Cloudinary gallery upload error:", err);
      alert("Failed to upload gallery images.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Cartesian Product Helper for Variant Generation
  const generateCartesianVariants = (attrs: Attribute[]): ProductVariant[] => {
    if (attrs.length === 0) return [];
    const validAttrs = attrs.filter(a => a.options && a.options.length > 0);
    if (validAttrs.length === 0) return [];

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>((a, b) => 
        a.flatMap(d => b.map(e => [d, e].flat())), 
        [[]]
      );
    };

    const optionsArrays = validAttrs.map(a => a.options);
    const combinations = cartesian(optionsArrays);

    return combinations.map((combo, idx) => {
      const variantOptions: Record<string, string> = {};
      combo.forEach((opt, index) => {
        variantOptions[validAttrs[index].name] = opt;
      });

      return {
        id: `var-${Date.now()}-${idx}`,
        options: variantOptions,
        price: prodPrice || 1000,
        stock: 10,
        sku: `SKU-${Date.now()}-${idx}`
      };
    });
  };

  const handleAddAttribute = () => {
    if (!newAttrName.trim() || !newAttrOptions.trim()) {
      alert("Please enter attribute name and options.");
      return;
    }
    const optionsArray = newAttrOptions.split(',').map(o => o.trim()).filter(Boolean);
    const newAttr: Attribute = {
      name: newAttrName.trim(),
      options: optionsArray
    };
    
    const nextAttrs = [...prodAttrs, newAttr];
    setProdAttrs(nextAttrs);
    setNewAttrName('');
    setNewAttrOptions('');
    setProdVariants(generateCartesianVariants(nextAttrs));
  };

  const handleRemoveAttribute = (idx: number) => {
    const nextAttrs = prodAttrs.filter((_, i) => i !== idx);
    setProdAttrs(nextAttrs);
    setProdVariants(generateCartesianVariants(nextAttrs));
  };

  const handleVariantFieldChange = (idx: number, field: keyof ProductVariant, val: string | number) => {
    const nextVars = [...prodVariants];
    nextVars[idx] = {
      ...nextVars[idx],
      [field]: val
    };
    setProdVariants(nextVars);
  };

  // Save/Create Product in Firestore
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodCat.trim() || prodPrice <= 0) {
      alert("Please fill in Name, Category, and Base Price.");
      return;
    }

    setIsLoading(true);

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodName.trim(),
      description: prodDesc.trim(),
      category: prodCat.trim(),
      image: prodImg.trim() || "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
      basePrice: Number(prodPrice),
      attributes: prodAttrs,
      variants: prodVariants,
      images: prodGallery,
      ...(editingProduct ? {
        rating: editingProduct.rating,
        reviewCount: editingProduct.reviewCount,
        specifications: editingProduct.specifications,
        badge: editingProduct.badge
      } : {})
    };

    try {
      await saveProduct(newProduct);
      setProductModalOpen(false);
      setEditingProduct(null);
      await loadAdminData();
      onRefreshProducts();
      alert("Product saved successfully to database!");
    } catch (err) {
      console.error(err);
      alert("Failed to save product.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDesc(prod.description);
    setProdCat(prod.category);
    setProdPrice(prod.basePrice);
    setProdImg(prod.image);
    setProdGallery(prod.images || []);
    setProdAttrs(prod.attributes || []);
    setProdVariants(prod.variants || []);
    setProductModalOpen(true);
  };

  const handleDeleteProductClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setIsLoading(true);
      try {
        await deleteProduct(id);
        await loadAdminData();
        onRefreshProducts();
      } catch (err) {
        console.error(err);
        alert("Failed to delete product.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdCat('');
    setProdPrice(10000);
    setProdImg('');
    setProdGallery([]);
    setProdAttrs([]);
    setProdVariants([]);
    setProductModalOpen(true);
  };

  // Update Order Status in Firestore
  const handleUpdateOrderStatusClick = async (orderId: string, status: Order['orderStatus'], paymentStatus: Order['paymentStatus']) => {
    setIsLoading(true);
    try {
      await updateOrderStatus(orderId, status, paymentStatus);
      await loadAdminData();
      
      // Update drawer if open
      if (activeOrderDetails && activeOrderDetails.id === orderId) {
        setActiveOrderDetails({
          ...activeOrderDetails,
          orderStatus: status,
          paymentStatus: paymentStatus
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save Settings to Firestore
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await saveSettings(localSettings);
      onChangeSettings(localSettings);
      alert("Settings saved to Firestore successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics Calculations
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'Paid' && o.orderStatus !== 'Cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const activeProductsCount = products.length;

  return (
    <div className="wp-admin-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isLoading && (
        <div style={{ position: 'fixed', top: '40px', right: '20px', zIndex: 99999, backgroundColor: '#2271b1', color: 'white', padding: '8px 16px', borderRadius: '0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
          <span>Syncing Database...</span>
        </div>
      )}

      {/* WordPress Admin Bar */}
      <header className="wp-admin-bar">
        <div className="wp-admin-bar-left">
          <span style={{ fontWeight: 'bold', color: '#fff', marginRight: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ backgroundColor: '#2271b1', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '3px', fontSize: '11px', fontWeight: 900 }}>G</span>
            GoldenCare Admin
          </span>
          <a href="/" className="wp-admin-bar-link" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} />
            <span>Visit Storefront</span>
          </a>
        </div>
        <div className="wp-admin-bar-right">
          <span style={{ fontSize: '12px', color: '#c3c4c7' }}>Howdy, Manager</span>
          <button 
            type="button"
            onClick={async () => {
              try {
                await signOut(auth);
                navigate('/');
              } catch (err) {
                console.error("Sign out error:", err);
              }
            }}
            className="wp-admin-bar-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="wp-admin-wrapper">
        
        {/* Sidebar Nav */}
        <aside className="wp-admin-sidebar">
          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/home')}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </button>
          
          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/orders')}
          >
            <ShoppingBag size={18} />
            <span>Orders ({orders.length})</span>
          </button>
          
          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/products')}
          >
            <PackageCheck size={18} />
            <span>Products ({products.length})</span>
          </button>

          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/customers')}
          >
            <Users size={18} />
            <span>Customers</span>
          </button>

          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/reports')}
          >
            <FileText size={18} />
            <span>Reports</span>
          </button>

          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/categories')}
          >
            <Layers size={18} />
            <span>Categories</span>
          </button>

          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/tags')}
          >
            <Tag size={18} />
            <span>Promo Tags</span>
          </button>
          
          <button 
            type="button"
            className={`wp-admin-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className="wp-admin-main-content">
          
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div>
              <h1 className="wp-admin-page-title">Dashboard</h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* At a Glance Widget */}
                <div className="wp-postbox">
                  <h2 className="wp-postbox-title">At a Glance</h2>
                  <div className="wp-postbox-inside">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PackageCheck size={16} style={{ color: '#646970' }} />
                        <span><strong>{activeProductsCount}</strong> Products</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={16} style={{ color: '#646970' }} />
                        <span><strong>{orders.length}</strong> Orders</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} style={{ color: '#646970' }} />
                        <span><strong>{Array.from(new Set(orders.map(o => o.buyerEmail))).length}</strong> Customers</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={16} style={{ color: '#646970' }} />
                        <span><strong>KSh {totalRevenue.toLocaleString()}</strong> Revenue</span>
                      </div>
                    </div>
                    <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '15px 0' }} />
                    <p style={{ margin: 0, fontSize: '12px', color: '#646970' }}>GoldenCare Market is running on Stark Minimal theme.</p>
                  </div>
                </div>

                {/* Quick Draft Widget */}
                <div className="wp-postbox">
                  <h2 className="wp-postbox-title">Quick Draft</h2>
                  <div className="wp-postbox-inside">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const title = (form.elements.namedItem('draftTitle') as HTMLInputElement).value;
                      const content = (form.elements.namedItem('draftContent') as HTMLTextAreaElement).value;
                      localStorage.setItem('wp_quick_draft', JSON.stringify({ title, content, date: new Date().toLocaleDateString() }));
                      alert("Draft saved locally!");
                      form.reset();
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <input 
                          type="text" 
                          name="draftTitle" 
                          placeholder="Title" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px' }} 
                          required
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <textarea 
                          name="draftContent" 
                          placeholder="What's on your mind?" 
                          rows={3} 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} 
                          required
                        />
                      </div>
                      <button type="submit" className="wp-button-primary">Save Draft</button>
                    </form>
                  </div>
                </div>

                {/* Recent Activity Widget */}
                <div className="wp-postbox">
                  <h2 className="wp-postbox-title">Activity</h2>
                  <div className="wp-postbox-inside">
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600 }}>Recent Orders</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f1f1', paddingBottom: '6px' }}>
                          <div>
                            <span style={{ color: '#646970', marginRight: '8px' }}>{new Date(o.createdAt).toLocaleDateString()}</span>
                            <a 
                              onClick={() => {
                                navigate('/dashboard/orders');
                                setActiveOrderDetails(o);
                              }} 
                              style={{ color: '#2271b1', cursor: 'pointer', fontWeight: 500 }}
                            >
                              Order #{o.id.substring(6, 12)}
                            </a>
                            <span style={{ color: '#2c3338', marginLeft: '6px' }}>by {o.customerName}</span>
                          </div>
                          <span className={`wp-badge-status ${o.orderStatus.toLowerCase()}`}>{o.orderStatus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GoldenCare Insights Widget */}
                <div className="wp-postbox">
                  <h2 className="wp-postbox-title">GoldenCare Insights</h2>
                  <div className="wp-postbox-inside" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    <p style={{ marginTop: 0 }}>Welcome to your specialized wellness logistics system. We have successfully modularized the store settings:</p>
                    <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                      <li>Ensure Cloudinary keys are active for seamless asset pipelines.</li>
                      <li>Review the orders pipeline regularly to coordinate shipping dispatch.</li>
                      <li>Adjust coupons in the Promo Tags tab to coordinate promotional drops.</li>
                    </ul>
                    <p style={{ margin: 0 }}><a href="/about" target="_blank" style={{ color: '#2271b1', textDecoration: 'none' }}>Learn more about GoldenCare Philosophy &rarr;</a></p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: Manage Customer Orders */}
          {activeTab === 'orders' && (
            <div>
              <h1 className="wp-admin-page-title">Orders</h1>
              
              <ul className="wp-subsubsub">
                <li><a href="#" className="current">All <span className="count">({orders.length})</span></a> |</li>
                <li><a href="#">Pending <span className="count">({orders.filter(o => o.orderStatus === 'Pending').length})</span></a> |</li>
                <li><a href="#">Delivered <span className="count">({orders.filter(o => o.orderStatus === 'Delivered').length})</span></a></li>
              </ul>

              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Billing Address</th>
                    <th>Total</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setActiveOrderDetails(o)}>
                      <td>
                        <a style={{ fontWeight: 600, color: '#2271b1', textDecoration: 'none' }}>
                          #{o.id.substring(6, 12)}
                        </a>
                      </td>
                      <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`wp-badge-status ${o.orderStatus.toLowerCase()}`}>{o.orderStatus}</span>
                      </td>
                      <td>
                        <span className={`wp-badge-status ${o.paymentStatus.toLowerCase() === 'paid' ? 'paid' : 'unpaid'}`}>{o.paymentStatus}</span>
                      </td>
                      <td>
                        <strong>{o.customerName}</strong><br />
                        <span style={{ fontSize: '11px', color: '#646970' }}>{o.customerAddress}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>KSh {o.totalAmount.toLocaleString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="wp-button-secondary" style={{ padding: '2px 6px', minHeight: '26px', fontSize: '11px' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Dispatched', o.paymentStatus)} title="Mark Dispatched">
                            <Truck size={14} />
                          </button>
                          <button className="wp-button-primary" style={{ padding: '2px 6px', minHeight: '26px', fontSize: '11px', background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Delivered', 'Paid')} title="Mark Delivered">
                            <CheckCircle size={14} />
                          </button>
                          <button className="wp-button-secondary" style={{ padding: '2px 6px', minHeight: '26px', fontSize: '11px', color: '#b32d2e', borderColor: '#dcdcde' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Cancelled', o.paymentStatus)} title="Cancel Order">
                            <Ban size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Manage Products */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h1 className="wp-admin-page-title" style={{ margin: 0 }}>Products</h1>
                <button className="wp-button-secondary" onClick={handleOpenAddProduct} style={{ padding: '2px 8px', fontSize: '12px', minHeight: 'auto', lineHeight: '1.5' }}>
                  Add New
                </button>
              </div>

              {/* Subsubsub links */}
              <ul className="wp-subsubsub">
                <li><a href="#" className="current">All <span className="count">({products.length})</span></a> |</li>
                <li><a href="#">Published <span className="count">({products.length})</span></a> |</li>
                <li><a href="#">Trash <span className="count">(0)</span></a></li>
              </ul>

              {/* Bulk action / filter row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select style={{ padding: '3px 8px', fontSize: '13px', border: '1px solid #c3c4c7' }}>
                    <option>Bulk actions</option>
                    <option>Delete Permanently</option>
                  </select>
                  <button className="wp-button-secondary" style={{ padding: '2px 10px', minHeight: '28px', fontSize: '12px' }}>Apply</button>
                </div>
                
                {/* Search */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="search" 
                    placeholder="Search Products..." 
                    style={{ padding: '3px 8px', fontSize: '13px', border: '1px solid #c3c4c7' }} 
                  />
                  <button className="wp-button-secondary" style={{ padding: '2px 10px', minHeight: '28px', fontSize: '12px' }}>Search Products</button>
                </div>
              </div>

              {/* List Table */}
              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', paddingLeft: '10px' }}><input type="checkbox" /></th>
                    <th style={{ width: '64px' }}>Image</th>
                    <th>Name</th>
                    <th style={{ width: '120px' }}>Price</th>
                    <th style={{ width: '150px' }}>Categories</th>
                    <th style={{ width: '180px' }}>Attributes</th>
                    <th style={{ width: '120px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: '10px' }}><input type="checkbox" /></td>
                      <td>
                        <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid #dcdcde' }} />
                      </td>
                      <td>
                        <a onClick={() => handleEditProductClick(p)} style={{ fontWeight: 600, color: '#2271b1', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}>
                          {p.name}
                        </a>
                        <div className="row-actions">
                          <span className="edit"><a onClick={() => handleEditProductClick(p)}>Edit</a> | </span>
                          <span className="trash"><a onClick={() => handleDeleteProductClick(p.id, p.name)}>Trash</a> | </span>
                          <span className="view"><a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer">View</a></span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>KSh {p.basePrice.toLocaleString()}</td>
                      <td>{p.category}</td>
                      <td>
                        {p.attributes && p.attributes.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.attributes.map(a => (
                              <span key={a.name} style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', border: '1px solid #dcdcde' }}>
                                {a.name}: {a.options.length}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#a7aaad' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'block', fontSize: '12px' }}>Published</span>
                        <span style={{ color: '#646970', fontSize: '11px' }}>{new Date().toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Shop Settings */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettingsSubmit}>
              <h1 className="wp-admin-page-title">Settings</h1>
              
              <div className="wp-postbox">
                <h2 className="wp-postbox-title">General Settings</h2>
                <div className="wp-postbox-inside">
                  <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                        <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600 }}>
                          <label>Shop Title</label>
                        </th>
                        <td style={{ padding: '10px 0' }}>
                          <input 
                            type="text" 
                            style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                            value={localSettings.shopName}
                            onChange={e => setLocalSettings({ ...localSettings, shopName: e.target.value })}
                            required
                          />
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                        <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600 }}>
                          <label>Contact Phone</label>
                        </th>
                        <td style={{ padding: '10px 0' }}>
                          <input 
                            type="text" 
                            style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                            value={localSettings.phone}
                            onChange={e => setLocalSettings({ ...localSettings, phone: e.target.value })}
                            required
                          />
                          <p style={{ color: '#646970', margin: '4px 0 0', fontSize: '11px' }}>Used for notifications and customer order lines.</p>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                        <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600 }}>
                          <label>Shop Address</label>
                        </th>
                        <td style={{ padding: '10px 0' }}>
                          <textarea 
                            style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                            rows={3}
                            value={localSettings.address}
                            onChange={e => setLocalSettings({ ...localSettings, address: e.target.value })}
                            required
                          />
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                        <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600 }}>
                          <label>Payment Mode</label>
                        </th>
                        <td style={{ padding: '10px 0' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={localSettings.demoMode}
                              onChange={e => setLocalSettings({ ...localSettings, demoMode: e.target.checked })}
                            />
                            <span>Enable Payment Demo Mode (Simulates Paystack Checkout)</span>
                          </label>
                        </td>
                      </tr>
                      {!localSettings.demoMode && (
                        <tr>
                          <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600 }}>
                            <label>Paystack Public Key</label>
                          </th>
                          <td style={{ padding: '10px 0' }}>
                            <input 
                              type="text" 
                              placeholder="pk_test_..."
                              style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                              value={localSettings.paystackPublicKey}
                              onChange={e => setLocalSettings({ ...localSettings, paystackPublicKey: e.target.value })}
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                  <button type="submit" className="wp-button-primary">Save Changes</button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 5: Customers */}
          {activeTab === 'customers' && (
            <div>
              <h1 className="wp-admin-page-title">Customers</h1>
              
              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Email Address</th>
                    <th style={{ textAlign: 'right' }}>Total Orders</th>
                    <th style={{ textAlign: 'right' }}>Cumulative Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Aggregate customer records from orders
                    const customerMap: Record<string, { name: string; phone: string; email: string; orderCount: number; spent: number }> = {};
                    orders.forEach(o => {
                      const key = o.customerPhone || o.buyerEmail || o.customerName;
                      if (!customerMap[key]) {
                        customerMap[key] = {
                          name: o.customerName,
                          phone: o.customerPhone,
                          email: o.buyerEmail || 'Guest Shopper',
                          orderCount: 0,
                          spent: 0
                        };
                      }
                      customerMap[key].orderCount += 1;
                      customerMap[key].spent += o.totalAmount;
                    });

                    const customersList = Object.values(customerMap);
                    if (customersList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No customers found yet.
                          </td>
                        </tr>
                      );
                    }

                    return customersList.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.phone}</td>
                        <td>{c.email}</td>
                        <td style={{ textAlign: 'right' }}>{c.orderCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>KSh {c.spent.toLocaleString()}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: Reports */}
          {activeTab === 'reports' && (
            <div>
              <h1 className="wp-admin-page-title">Reports</h1>

              {(() => {
                const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
                const averageOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
                
                // Count product sales frequency
                const prodSales: Record<string, { name: string; qty: number; revenue: number }> = {};
                orders.forEach(o => {
                  o.items.forEach(it => {
                    if (!prodSales[it.productId]) {
                      prodSales[it.productId] = { name: it.name, qty: 0, revenue: 0 };
                    }
                    prodSales[it.productId].qty += it.quantity;
                    prodSales[it.productId].revenue += it.price * it.quantity;
                  });
                });
                const topSellers = Object.values(prodSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Key metrics grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <div className="wp-postbox">
                        <h2 className="wp-postbox-title">Gross Revenue</h2>
                        <div className="wp-postbox-inside" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2271b1' }}>
                          KSh {totalRevenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="wp-postbox">
                        <h2 className="wp-postbox-title">Total Orders</h2>
                        <div className="wp-postbox-inside" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3338' }}>
                          {orders.length}
                        </div>
                      </div>
                      <div className="wp-postbox">
                        <h2 className="wp-postbox-title">Average Order Value</h2>
                        <div className="wp-postbox-inside" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3338' }}>
                          KSh {averageOrder.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Top selling products table */}
                    <div className="wp-postbox">
                      <h2 className="wp-postbox-title">Top Selling Products</h2>
                      <div className="wp-postbox-inside" style={{ padding: 0 }}>
                        <table className="wp-list-table" style={{ border: 'none' }}>
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th style={{ textAlign: 'right' }}>Units Sold</th>
                              <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topSellers.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                                  No sales recorded yet.
                                </td>
                              </tr>
                            ) : (
                              topSellers.map((ts, i) => (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600 }}>{ts.name}</td>
                                  <td style={{ textAlign: 'right' }}>{ts.qty}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>KSh {ts.revenue.toLocaleString()}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 7: Categories */}
          {activeTab === 'categories' && (
            <div>
              <h1 className="wp-admin-page-title">Categories</h1>

              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th style={{ textAlign: 'right' }}>Product Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const catMap: Record<string, number> = {};
                    products.forEach(p => {
                      catMap[p.category] = (catMap[p.category] || 0) + 1;
                    });
                    const categoriesList = Object.entries(catMap);

                    if (categoriesList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No categories found.
                          </td>
                        </tr>
                      );
                    }

                    return categoriesList.map(([cat, count], i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{cat}</td>
                        <td style={{ textAlign: 'right' }}>{count}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: Tags */}
          {activeTab === 'tags' && (
            <div>
              <h1 className="wp-admin-page-title">Promo Tags</h1>

              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th>Promo Badge / Tag</th>
                    <th style={{ textAlign: 'right' }}>Applied Products Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const tagMap: Record<string, number> = {};
                    products.forEach(p => {
                      if (p.badge) {
                        tagMap[p.badge] = (tagMap[p.badge] || 0) + 1;
                      }
                    });
                    const tagsList = Object.entries(tagMap);

                    if (tagsList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No product badges applied yet.
                          </td>
                        </tr>
                      );
                    }

                    return tagsList.map(([tag, count], i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{tag}</td>
                        <td style={{ textAlign: 'right' }}>{count}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>

      {/* DRAWER/MODAL: Order Details (WP Postbox Style) */}
      {activeOrderDetails && (
        <div className="modal-overlay" onClick={() => setActiveOrderDetails(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', padding: 0, border: '1px solid #c3c4c7', borderRadius: '0' }}>
            <div style={{ borderBottom: '1px solid #c3c4c7', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f7f7' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Order Details — #{activeOrderDetails.id.substring(6, 12)}</h3>
              <button className="modal-close" onClick={() => setActiveOrderDetails(null)} style={{ position: 'static', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ color: '#646970', fontSize: '12px', marginBottom: '20px' }}>
                Placed on {new Date(activeOrderDetails.createdAt).toLocaleString()}
              </div>

              {/* Customer Info */}
              <div className="wp-postbox" style={{ marginBottom: '20px' }}>
                <h4 className="wp-postbox-title">Fulfillment Address</h4>
                <div className="wp-postbox-inside" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 8px' }}><strong>{activeOrderDetails.customerName}</strong></p>
                  <p style={{ margin: '0 0 8px' }}>Phone: {activeOrderDetails.customerPhone}</p>
                  <p style={{ margin: 0 }}>Location: {activeOrderDetails.customerAddress}</p>
                </div>
              </div>

              {/* Items Table */}
              <h4 style={{ fontSize: '13px', margin: '0 0 10px' }}>Items Ordered:</h4>
              <table className="wp-list-table" style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right', width: '60px' }}>Qty</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrderDetails.items.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: '11px', color: '#646970' }}>{it.variantDetails}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>KSh {it.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #c3c4c7', paddingTop: '15px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Order Status: </span>
                  <span className={`wp-badge-status ${activeOrderDetails.orderStatus.toLowerCase()}`}>{activeOrderDetails.orderStatus}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    className="wp-button-secondary"
                    onClick={() => handleUpdateOrderStatusClick(activeOrderDetails.id, 'Dispatched', activeOrderDetails.paymentStatus)}
                    disabled={activeOrderDetails.orderStatus === 'Delivered' || activeOrderDetails.orderStatus === 'Cancelled'}
                  >
                    Mark Dispatched
                  </button>
                  <button 
                    type="button"
                    className="wp-button-primary"
                    onClick={() => handleUpdateOrderStatusClick(activeOrderDetails.id, 'Delivered', 'Paid')}
                    disabled={activeOrderDetails.orderStatus === 'Delivered' || activeOrderDetails.orderStatus === 'Cancelled'}
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL/GUTENBERG SCREEN: Add/Edit Product */}
      {productModalOpen && (
        <div className="modal-overlay" onClick={() => { setProductModalOpen(false); setEditingProduct(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '960px', width: '95%', padding: 0, border: '1px solid #c3c4c7', borderRadius: '0' }}>
            
            {/* Header */}
            <div style={{ borderBottom: '1px solid #c3c4c7', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f7f7' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                {editingProduct ? `Edit Product — ${editingProduct.name}` : 'Add New Product'}
              </h3>
              <button className="modal-close" onClick={() => { setProductModalOpen(false); setEditingProduct(null); }} style={{ position: 'static', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ padding: '20px' }}>
              <div className="wp-editor-layout">
                
                {/* Left Column: Editor Pane */}
                <div>
                  {/* Title field */}
                  <input 
                    type="text" 
                    className="wp-editor-title-field"
                    value={prodName}
                    onChange={e => setProdName(e.target.value)}
                    placeholder="Enter product title here"
                    required
                  />

                  {/* Description textarea */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Description</h2>
                    <div className="wp-postbox-inside" style={{ padding: 0 }}>
                      <textarea 
                        value={prodDesc}
                        onChange={e => setProdDesc(e.target.value)}
                        placeholder="Describe the product specifications, materials, and features..."
                        style={{ width: '100%', border: 'none', padding: '15px', minHeight: '140px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  {/* Product Data Metabox (WooCommerce Style Tabs) */}
                  <div className="wp-metabox-tabs">
                    <button 
                      type="button" 
                      className={`wp-metabox-tab ${editorTab === 'general' ? 'active' : ''}`}
                      onClick={() => setEditorTab('general')}
                    >
                      General
                    </button>
                    <button 
                      type="button" 
                      className={`wp-metabox-tab ${editorTab === 'attributes' ? 'active' : ''}`}
                      onClick={() => setEditorTab('attributes')}
                    >
                      Attributes
                    </button>
                    <button 
                      type="button" 
                      className={`wp-metabox-tab ${editorTab === 'variations' ? 'active' : ''}`}
                      onClick={() => setEditorTab('variations')}
                    >
                      Variations ({prodVariants.length})
                    </button>
                  </div>

                  <div className="wp-metabox-tabs-content">
                    {/* General Tab */}
                    {editorTab === 'general' && (
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '15px' }}>
                          <label style={{ width: '160px', fontWeight: 600 }}>Regular Price (KSh):</label>
                          <input 
                            type="number" 
                            style={{ width: '200px', padding: '5px 8px', border: '1px solid #c3c4c7' }}
                            value={prodPrice}
                            onChange={e => setProdPrice(Number(e.target.value))}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Attributes Tab */}
                    {editorTab === 'attributes' && (
                      <div style={{ fontSize: '13px' }}>
                        <p style={{ margin: '0 0 15px', color: '#646970' }}>Add attributes (e.g. Size, Color) to generate product variations.</p>
                        
                        {/* List Attributes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                          {prodAttrs.map((attr, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c3c4c7', padding: '8px 12px', background: '#f6f7f7' }}>
                              <div>
                                <strong>{attr.name}</strong>: {attr.options.join(' | ')}
                              </div>
                              <button 
                                type="button" 
                                className="wp-button-link-delete" 
                                onClick={() => handleRemoveAttribute(idx)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Attribute Row */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: '#fafafa', border: '1px solid #c3c4c7', padding: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Name (e.g. Color)</label>
                            <input 
                              type="text" 
                              style={{ width: '100%', padding: '5px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                              value={newAttrName}
                              onChange={e => setNewAttrName(e.target.value)}
                              placeholder="Color"
                            />
                          </div>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Options (Comma-separated)</label>
                            <input 
                              type="text" 
                              style={{ width: '100%', padding: '5px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                              value={newAttrOptions}
                              onChange={e => setNewAttrOptions(e.target.value)}
                              placeholder="Stealth Black, Matte Carbon, Cyber Silver"
                            />
                          </div>
                          <button 
                            type="button" 
                            className="wp-button-secondary"
                            onClick={handleAddAttribute}
                          >
                            Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Variations Tab */}
                    {editorTab === 'variations' && (
                      <div style={{ fontSize: '13px' }}>
                        {prodVariants.length === 0 ? (
                          <p style={{ margin: 0, color: '#a7aaad', textAlign: 'center', padding: '30px' }}>No variations generated. Add attributes first to configure options.</p>
                        ) : (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: '10px', fontWeight: 600, borderBottom: '1px solid #c3c4c7', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span>Option Combination</span>
                              <span>Price (KSh)</span>
                              <span>Stock</span>
                              <span>SKU</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                              {prodVariants.map((v, idx) => {
                                const label = Object.values(v.options).join(' / ');
                                return (
                                  <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{label}</span>
                                    <input 
                                      type="number" 
                                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                                      value={v.price} 
                                      onChange={e => handleVariantFieldChange(idx, 'price', Number(e.target.value))}
                                      required
                                    />
                                    <input 
                                      type="number" 
                                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                                      value={v.stock} 
                                      onChange={e => handleVariantFieldChange(idx, 'stock', Number(e.target.value))}
                                      required
                                    />
                                    <input 
                                      type="text" 
                                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                                      value={v.sku} 
                                      onChange={e => handleVariantFieldChange(idx, 'sku', e.target.value)}
                                      required
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Metabox Sidepane */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Publish Metabox */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Publish</h2>
                    <div className="wp-postbox-inside" style={{ fontSize: '13px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <span>Status: <strong>Published</strong></span>
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <span>Visibility: <strong>Public</strong></span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f1f1', paddingTop: '12px' }}>
                        {editingProduct ? (
                          <button 
                            type="button" 
                            className="wp-button-link-delete"
                            onClick={() => {
                              handleDeleteProductClick(editingProduct.id, editingProduct.name);
                              setProductModalOpen(false);
                            }}
                          >
                            Move to Trash
                          </button>
                        ) : (
                          <span />
                        )}
                        <button type="submit" className="wp-button-primary">
                          {editingProduct ? 'Update' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Categories Metabox */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Categories</h2>
                    <div className="wp-postbox-inside">
                      <input 
                        type="text" 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px' }} 
                        value={prodCat}
                        onChange={e => setProdCat(e.target.value)}
                        placeholder="e.g. Mobility Aids"
                        required
                      />
                    </div>
                  </div>

                  {/* Main Product Image Metabox */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Image</h2>
                    <div className="wp-postbox-inside">
                      {prodImg ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '1px solid #c3c4c7', marginBottom: '10px', background: '#fafafa', overflow: 'hidden' }}>
                          <img src={prodImg} alt="product main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}
                            onClick={() => setProdImg('')}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ border: '2px dashed #c3c4c7', aspectRatio: '1/1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#a7aaad', marginBottom: '10px' }}>
                          <ImageIcon size={28} />
                          <span style={{ fontSize: '11px', marginTop: '4px' }}>No main image set</span>
                        </div>
                      )}

                      {/* Main Image Upload */}
                      <div style={{ marginBottom: '10px' }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                        />
                      </div>
                      
                      {/* Paste main image URL */}
                      <input 
                        type="text" 
                        placeholder="Or paste image URL"
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '12px', marginBottom: '12px' }}
                        value={prodImg}
                        onChange={e => setProdImg(e.target.value)}
                      />

                      {/* Samples slider */}
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#646970', marginBottom: '6px' }}>Select Preset Sample:</label>
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {CLOUDINARY_SAMPLES.map(sample => (
                          <button
                            key={sample.name}
                            type="button"
                            onClick={() => setProdImg(sample.url)}
                            style={{ flexShrink: 0, width: '48px', height: '48px', border: prodImg === sample.url ? '2px solid #2271b1' : '1px solid #c3c4c7', padding: 0, cursor: 'pointer', overflow: 'hidden' }}
                          >
                            <img src={sample.url} alt={sample.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Product Gallery Metabox (NEW) */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Gallery</h2>
                    <div className="wp-postbox-inside">
                      {prodGallery.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                          {prodGallery.map((imgUrl, index) => (
                            <div key={index} style={{ position: 'relative', width: '56px', height: '56px', border: '1px solid #c3c4c7', overflow: 'hidden' }}>
                              <img src={imgUrl} alt={`gallery-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button 
                                type="button" 
                                onClick={() => setProdGallery(prev => prev.filter((_, i) => i !== index))}
                                style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(179, 45, 46, 0.9)', color: '#fff', border: 'none', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, fontSize: '9px', fontWeight: 'bold' }}
                                title="Remove image"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#a7aaad', fontStyle: 'italic' }}>No gallery images added yet.</p>
                      )}

                      {/* Cloudinary Gallery Upload */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#646970', marginBottom: '4px' }}>Upload Gallery Images:</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple
                          onChange={handleGalleryImagesUpload}
                          disabled={uploadingImage}
                          style={{ fontSize: '12px', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Paste URL */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#646970', marginBottom: '4px' }}>Add Image URL:</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input 
                            type="text" 
                            id="newGalleryUrlInput"
                            placeholder="https://..."
                            style={{ flexGrow: 1, padding: '3px 6px', fontSize: '12px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val) {
                                  setProdGallery(prev => [...prev, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            className="wp-button-secondary"
                            style={{ minHeight: '26px', padding: '0 8px', fontSize: '12px' }}
                            onClick={() => {
                              const input = document.getElementById('newGalleryUrlInput') as HTMLInputElement;
                              if (input && input.value.trim()) {
                                setProdGallery(prev => [...prev, input.value.trim()]);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

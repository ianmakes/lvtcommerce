import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, Settings, Plus, Trash2, Edit2, 
  Save, CheckCircle, Truck, Ban, X, Upload, Loader2, Image as ImageIcon, PackageCheck
} from 'lucide-react';
import { Product, Order, ShopSettings, Attribute, ProductVariant } from '../types';
import { getProducts, saveProduct, deleteProduct, getOrders, updateOrderStatus, getSettings, saveSettings } from '../db';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'settings'>('overview');
  
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
  const [prodAttrs, setProdAttrs] = useState<Attribute[]>([]);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);

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

  const handleVariantFieldChange = (idx: number, field: keyof ProductVariant, val: any) => {
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
      variants: prodVariants
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

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Paid').length;
  const activeProductsCount = products.length;

  return (
    <div className="container">
      {isLoading && (
        <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 9999, backgroundColor: 'var(--accent-primary)', color: 'white', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
          <span>Syncing Database...</span>
        </div>
      )}

      <div className="admin-container">
        
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
            Manager Tabs
          </h3>
          <button 
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={20} />
            <span>Sales Overview</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBag size={20} />
            <span>Manage Orders ({orders.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <PackageCheck size={20} />
            <span>Manage Products ({products.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Shop Settings</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className="admin-content">
          
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div>
              <h2>Sales & Shop Overview</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Quick summary of your shop statistics.</p>

              {/* Metrics cards */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Revenue</div>
                  <div className="metric-value">₦{totalRevenue.toLocaleString()}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Incoming Orders</div>
                  <div className="metric-value">{pendingOrdersCount}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active Products</div>
                  <div className="metric-value">{activeProductsCount}</div>
                </div>
              </div>

              {/* Recent Orders List */}
              <h3 style={{ marginTop: '32px' }}>Recent Customer Orders</h3>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Name</th>
                      <th>Amount</th>
                      <th>Order Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveOrderDetails(o); }}>
                        <td style={{ fontWeight: 'bold' }}>{o.id}</td>
                        <td>{o.customerName}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>₦{o.totalAmount.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${o.orderStatus.toLowerCase()}`}>{o.orderStatus}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Manage Orders */}
          {activeTab === 'orders' && (
            <div>
              <h2>Manage Customer Orders</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Update order fulfillment states and inspect details.</p>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Buyer</th>
                      <th>Phone</th>
                      <th>Amount</th>
                      <th>Fulfillment</th>
                      <th>Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setActiveOrderDetails(o)}>
                        <td style={{ fontWeight: 'bold' }}>{o.id}</td>
                        <td>{o.customerName}</td>
                        <td>{o.customerPhone}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>₦{o.totalAmount.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${o.orderStatus.toLowerCase()}`}>{o.orderStatus}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Dispatched', o.paymentStatus)} title="Mark Dispatched">
                              <Truck size={16} />
                            </button>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px', backgroundColor: 'var(--success-light)', color: 'var(--success-color)' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Delivered', 'Paid')} title="Mark Delivered">
                              <CheckCircle size={16} />
                            </button>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px', backgroundColor: 'var(--warning-light)', color: 'var(--warning-color)' }} onClick={() => handleUpdateOrderStatusClick(o.id, 'Cancelled', o.paymentStatus)} title="Cancel Order">
                              <Ban size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Manage Products */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2>Product Stock List</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Manage your inventory, pricing, and variable options.</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddProduct} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Base Price</th>
                      <th>Has Options</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>
                          <img src={p.image} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                        <td>{p.category}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>₦{p.basePrice.toLocaleString()}</td>
                        <td>
                          {p.attributes && p.attributes.length > 0 ? (
                            <span className="badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
                              Yes ({p.variants.length} Variants)
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: '#eee', color: '#666' }}>No</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px' }} onClick={() => handleEditProductClick(p)}>
                              <Edit2 size={16} />
                            </button>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px', color: 'var(--warning-color)' }} onClick={() => handleDeleteProductClick(p.id, p.name)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Shop Settings */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettingsSubmit}>
              <h2>Shop Configurations</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Modify contact lines, payment configs, and assistant speed.</p>

              <div className="card">
                {/* Shop Name */}
                <div className="form-group">
                  <label className="form-label">Shop Name:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localSettings.shopName}
                    onChange={e => setLocalSettings({ ...localSettings, shopName: e.target.value })}
                    required
                  />
                </div>

                {/* Shop Phone */}
                <div className="form-group">
                  <label className="form-label">Contact Phone (For orders):</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localSettings.phone}
                    onChange={e => setLocalSettings({ ...localSettings, phone: e.target.value })}
                    required
                  />
                </div>

                {/* Shop Address */}
                <div className="form-group">
                  <label className="form-label">Contact Address:</label>
                  <textarea 
                    className="form-input" 
                    value={localSettings.address}
                    onChange={e => setLocalSettings({ ...localSettings, address: e.target.value })}
                    style={{ minHeight: '80px', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                {/* Demo Mode Toggle */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                  <input 
                    id="set-demo"
                    type="checkbox" 
                    style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                    checked={localSettings.demoMode}
                    onChange={e => setLocalSettings({ ...localSettings, demoMode: e.target.checked })}
                  />
                  <label htmlFor="set-demo" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Enable Payment Demo Mode (Simulates Paystack Checkout)
                  </label>
                </div>

                {/* Paystack Public Key */}
                {!localSettings.demoMode && (
                  <div className="form-group">
                    <label className="form-label">Paystack Public Key (pk_test_...):</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="pk_test_..."
                      value={localSettings.paystackPublicKey}
                      onChange={e => setLocalSettings({ ...localSettings, paystackPublicKey: e.target.value })}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <Save size={20} />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          )}

        </main>
      </div>

      {/* DRAWER: Order Details */}
      {activeOrderDetails && (
        <div className="modal-overlay" onClick={() => setActiveOrderDetails(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '32px' }}>
            <button className="modal-close" onClick={() => setActiveOrderDetails(null)}>
              <X size={24} />
            </button>

            <h2>Order Details ({activeOrderDetails.id})</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Placed on {new Date(activeOrderDetails.createdAt).toLocaleString()}
            </div>

            {/* Buyer contact card */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
              <h4 style={{ marginBottom: '8px' }}>Customer Contact:</h4>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{activeOrderDetails.customerName}</p>
              <p style={{ margin: '4px 0' }}>Phone: {activeOrderDetails.customerPhone}</p>
              <p style={{ margin: 0 }}>Address: {activeOrderDetails.customerAddress}</p>
            </div>

            {/* Items table */}
            <h4 style={{ marginBottom: '8px' }}>Items Ordered:</h4>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={{ padding: '10px' }}>Item</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrderDetails.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px' }}>
                        <div>{it.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{it.variantDetails}</div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>₦{it.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Status updates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Fulfillment Status: </span>
                <span className={`status-badge ${activeOrderDetails.orderStatus.toLowerCase()}`}>{activeOrderDetails.orderStatus}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => handleUpdateOrderStatusClick(activeOrderDetails.id, 'Dispatched', activeOrderDetails.paymentStatus)}
                  disabled={activeOrderDetails.orderStatus === 'Delivered' || activeOrderDetails.orderStatus === 'Cancelled'}
                  style={{ minHeight: '40px' }}
                >
                  Mark Dispatched
                </button>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => handleUpdateOrderStatusClick(activeOrderDetails.id, 'Delivered', 'Paid')}
                  disabled={activeOrderDetails.orderStatus === 'Delivered' || activeOrderDetails.orderStatus === 'Cancelled'}
                  style={{ minHeight: '40px' }}
                >
                  Mark Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Product */}
      {productModalOpen && (
        <div className="modal-overlay" onClick={() => { setProductModalOpen(false); setEditingProduct(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', padding: '32px' }}>
            <button className="modal-close" onClick={() => { setProductModalOpen(false); setEditingProduct(null); }}>
              <X size={24} />
            </button>

            <h2>{editingProduct ? `Edit ${editingProduct.name}` : 'Add New Variable Product'}</h2>
            
            <form onSubmit={handleSaveProduct} style={{ marginTop: '24px' }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Product Name:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="e.g. Memory Foam Cushion"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description:</label>
                <textarea 
                  className="form-input" 
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="Product benefits..."
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={prodCat}
                    onChange={e => setProdCat(e.target.value)}
                    placeholder="e.g. Mobility Aids"
                    required
                  />
                </div>
                
                {/* Base Price */}
                <div className="form-group">
                  <label className="form-label">Base Price (NGN):</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={prodPrice}
                    onChange={e => setProdPrice(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Cloudinary Dynamic Upload */}
              <div className="form-group" style={{ border: '2px dashed var(--border-color)', padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <Upload size={20} />
                  <span>Upload Image to Cloudinary:</span>
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ marginTop: '8px', cursor: 'pointer' }}
                />
                {uploadingImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
                    <span>Uploading to Cloudinary...</span>
                  </div>
                )}
              </div>

              {/* Image URL Display */}
              <div className="form-group">
                <label className="form-label">Active Image URL:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={prodImg}
                  onChange={e => setProdImg(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Preset Cloudinary Samples Carousel */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={18} />
                  <span>Or Pick from Preconfigured Samples:</span>
                </label>
                <div 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    padding: '8px 0', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    backgroundColor: '#fff' 
                  }}
                >
                  {CLOUDINARY_SAMPLES.map(sample => (
                    <div 
                      key={sample.name} 
                      onClick={() => setProdImg(sample.url)}
                      style={{ 
                        flexShrink: 0, 
                        width: '72px', 
                        cursor: 'pointer', 
                        textAlign: 'center',
                        border: prodImg === sample.url ? '2px solid var(--accent-primary)' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '4px',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <img src={sample.url} alt={sample.name} style={{ width: '100%', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div style={{ fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px', color: '#666' }}>{sample.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables (Attributes) Section */}
              <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
                <h3>Product Options (Variables)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Add options if this product has variations.
                </p>

                {/* Display Current Attributes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0' }}>
                  {prodAttrs.map((attr, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '8px' }}>
                      <div>
                        <strong>{attr.name}</strong>: {attr.options.join(', ')}
                      </div>
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--warning-color)', cursor: 'pointer' }} onClick={() => handleRemoveAttribute(idx)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Attribute Inputs */}
                <div className="attr-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Option Name (e.g. Size)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ minHeight: '44px', padding: '8px 12px' }}
                      value={newAttrName}
                      onChange={e => setNewAttrName(e.target.value)}
                      placeholder="Size"
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Options (Comma-separated)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ minHeight: '44px', padding: '8px 12px' }}
                      value={newAttrOptions}
                      onChange={e => setNewAttrOptions(e.target.value)}
                      placeholder="Small, Medium, Large"
                    />
                  </div>
                  <button type="button" className="btn btn-secondary btn-small" onClick={handleAddAttribute} style={{ minHeight: '44px' }}>
                    Add Option
                  </button>
                </div>
              </div>

              {/* Variants Matrix Display */}
              {prodVariants.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h3>Variation Prices & Stock</h3>
                  <div className="variant-matrix-card">
                    <div className="variant-matrix-row variant-matrix-header">
                      <span>Combination</span>
                      <span>Price (₦)</span>
                      <span>Stock</span>
                      <span>SKU</span>
                    </div>
                    {prodVariants.map((v, idx) => {
                      const label = Object.entries(v.options).map(([_, optVal]) => `${optVal}`).join(' / ');
                      return (
                        <div className="variant-matrix-row" key={v.id}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{label}</span>
                          <input 
                            type="number" 
                            className="form-input"
                            style={{ minHeight: '36px', padding: '6px', fontSize: '0.9rem' }}
                            value={v.price} 
                            onChange={e => handleVariantFieldChange(idx, 'price', Number(e.target.value))}
                            required
                          />
                          <input 
                            type="number" 
                            className="form-input"
                            style={{ minHeight: '36px', padding: '6px', fontSize: '0.9rem' }}
                            value={v.stock} 
                            onChange={e => handleVariantFieldChange(idx, 'stock', Number(e.target.value))}
                            required
                          />
                          <input 
                            type="text" 
                            className="form-input"
                            style={{ minHeight: '36px', padding: '6px', fontSize: '0.9rem' }}
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

              <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '20px', marginTop: '24px', display: 'flex', gap: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setProductModalOpen(false); setEditingProduct(null); }}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

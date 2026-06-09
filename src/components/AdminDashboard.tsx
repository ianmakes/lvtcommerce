import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, Settings, Plus, Trash2, Edit2, 
  Save, CheckCircle, Truck, PackageCheck, Ban, RefreshCw, X 
} from 'lucide-react';
import { Product, Order, ShopSettings, Attribute, ProductVariant } from '../types';
import { getProducts, saveProducts, getOrders, saveOrders, getSettings, saveSettings } from '../db';
import { speakText } from './VoiceHelper';

interface AdminDashboardProps {
  settings: ShopSettings;
  onChangeSettings: (newSettings: ShopSettings) => void;
  onRefreshProducts: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onChangeSettings,
  onRefreshProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'settings'>('overview');
  
  // Lists from DB
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [localSettings, setLocalSettings] = useState<ShopSettings>(settings);

  // Form Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Order Detail Drawer
  const [activeOrderDetails, setActiveOrderDetails] = useState<Order | null>(null);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImg, setProdImg] = useState('');
  const [prodAttrs, setProdAttrs] = useState<Attribute[]>([]);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);

  // Temp Attribute Editor
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');

  // Load Admin Data
  const loadAdminData = () => {
    setProducts(getProducts());
    setOrders(getOrders());
    setLocalSettings(getSettings());
  };

  useEffect(() => {
    loadAdminData();
    if (settings.voiceAssistDefault) {
      speakText("Admin Dashboard opened. Showing sales overview.", settings.voiceRate);
    }
  }, []);

  const handleTabChange = (tab: 'overview' | 'orders' | 'products' | 'settings') => {
    setActiveTab(tab);
    if (settings.voiceAssistDefault) {
      let label = "Sales Overview";
      if (tab === 'orders') label = "Manage Orders";
      if (tab === 'products') label = "Manage Products";
      if (tab === 'settings') label = "Shop Settings";
      speakText(`Showing ${label} section.`, settings.voiceRate);
    }
  };

  // Cartesian Product Helper for Variant Generation
  const generateCartesianVariants = (attrs: Attribute[]): ProductVariant[] => {
    if (attrs.length === 0) return [];

    // Filter out attributes with no options
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

    // Re-generate variants matrix automatically
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

  // Save/Create Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodCat.trim() || prodPrice <= 0) {
      alert("Please fill in Name, Category, and Base Price.");
      return;
    }

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodName.trim(),
      description: prodDesc.trim(),
      category: prodCat.trim(),
      image: prodImg.trim() || "https://images.unsplash.com/photo-1579684389782-64d84b5e902a?w=500",
      basePrice: Number(prodPrice),
      attributes: prodAttrs,
      variants: prodVariants
    };

    const currentProds = getProducts();
    let nextProds = [];

    if (editingProduct) {
      nextProds = currentProds.map(p => p.id === editingProduct.id ? newProduct : p);
      if (settings.voiceAssistDefault) speakText(`Product ${prodName} updated successfully.`, settings.voiceRate);
    } else {
      nextProds = [newProduct, ...currentProds];
      if (settings.voiceAssistDefault) speakText(`New product ${prodName} added successfully.`, settings.voiceRate);
    }

    saveProducts(nextProds);
    setProductModalOpen(false);
    setEditingProduct(null);
    loadAdminData();
    onRefreshProducts();
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

  const handleDeleteProductClick = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const nextProds = products.filter(p => p.id !== id);
      saveProducts(nextProds);
      loadAdminData();
      onRefreshProducts();
      if (settings.voiceAssistDefault) speakText(`Deleted product ${name}.`, settings.voiceRate);
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

  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, status: Order['orderStatus']) => {
    const currentOrders = getOrders();
    const nextOrders = currentOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          orderStatus: status,
          paymentStatus: status === 'Cancelled' ? 'Pending' as const : o.paymentStatus // Cancel resets paid or keeps paid depending on logic.
        };
      }
      return o;
    });
    
    saveOrders(nextOrders);
    loadAdminData();
    
    // Update active drawer representation
    const updatedOrder = nextOrders.find(o => o.id === orderId);
    if (updatedOrder) {
      setActiveOrderDetails(updatedOrder);
    }

    if (settings.voiceAssistDefault) {
      speakText(`Order status updated to ${status}.`, settings.voiceRate);
    }
  };

  // Save Settings
  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(localSettings);
    onChangeSettings(localSettings);
    if (settings.voiceAssistDefault) {
      speakText("Shop Settings saved successfully.", settings.voiceRate);
    }
    alert("Settings saved!");
  };

  // Metrics Calculations
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'Paid' && o.orderStatus !== 'Cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Paid').length;
  const activeProductsCount = products.length;

  return (
    <div className="container">
      <div className="admin-container">
        
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
            Manager Tabs
          </h3>
          <button 
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <BarChart3 size={20} />
            <span>Sales Overview</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleTabChange('orders')}
          >
            <ShoppingBag size={20} />
            <span>Manage Orders ({orders.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => handleTabChange('products')}
          >
            <PackageCheck size={20} />
            <span>Manage Products ({products.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
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
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveOrderDetails(o); if (settings.voiceAssistDefault) speakText(`Opening details for order ${o.id}`, settings.voiceRate); }}>
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
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px' }} onClick={() => handleUpdateOrderStatus(o.id, 'Dispatched')} title="Mark Dispatched">
                              <Truck size={16} />
                            </button>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px', backgroundColor: 'var(--success-light)', color: 'var(--success-color)' }} onClick={() => handleUpdateOrderStatus(o.id, 'Delivered')} title="Mark Delivered">
                              <CheckCircle size={16} />
                            </button>
                            <button className="btn btn-secondary btn-small" style={{ minHeight: '36px', padding: '4px 8px', backgroundColor: 'var(--warning-light)', color: 'var(--warning-color)' }} onClick={() => handleUpdateOrderStatus(o.id, 'Cancelled')} title="Cancel Order">
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

                {/* Voice Assist Default */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                  <input 
                    id="set-voice"
                    type="checkbox" 
                    style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                    checked={localSettings.voiceAssistDefault}
                    onChange={e => setLocalSettings({ ...localSettings, voiceAssistDefault: e.target.checked })}
                  />
                  <label htmlFor="set-voice" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Voice Assistance Enabled by Default
                  </label>
                </div>

                {/* Voice Rate */}
                <div className="form-group">
                  <label className="form-label">Voice Reading Speed: {localSettings.voiceRate}x</label>
                  <input 
                    type="range" 
                    min={0.6} 
                    max={1.5} 
                    step={0.05}
                    value={localSettings.voiceRate}
                    onChange={e => setLocalSettings({ ...localSettings, voiceRate: Number(e.target.value) })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                  />
                </div>

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
                  onClick={() => handleUpdateOrderStatus(activeOrderDetails.id, 'Dispatched')}
                  disabled={activeOrderDetails.orderStatus === 'Delivered' || activeOrderDetails.orderStatus === 'Cancelled'}
                  style={{ minHeight: '40px' }}
                >
                  Mark Dispatched
                </button>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => handleUpdateOrderStatus(activeOrderDetails.id, 'Delivered')}
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
                  placeholder="Summarize product health benefits..."
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

              {/* Image URL */}
              <div className="form-group">
                <label className="form-label">Image URL:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={prodImg}
                  onChange={e => setProdImg(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Variables (Attributes) Section */}
              <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
                <h3>Product Options (Variables)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Add options if this product has variations like Size or Color. Leave blank for standard products.
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
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Options (Comma-separated, e.g. Small, Medium)</label>
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
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Edit the prices, stock levels, and SKUs for each combination.
                  </p>

                  <div className="variant-matrix-card">
                    <div className="variant-matrix-row variant-matrix-header">
                      <span>Combination</span>
                      <span>Price (₦)</span>
                      <span>Stock</span>
                      <span>SKU</span>
                    </div>
                    {prodVariants.map((v, idx) => {
                      const label = Object.entries(v.options).map(([k, optVal]) => `${optVal}`).join(' / ');
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

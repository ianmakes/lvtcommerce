import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, Settings, CheckCircle, Truck, Ban, X, Loader2, Image as ImageIcon, PackageCheck,
  Users, FileText, Layers, Tag, LogOut, ExternalLink, Activity, Trash2, Plus, Sliders, Link as LinkIcon, Film, Mail,
  Boxes
} from 'lucide-react';
import { Product, Order, ShopSettings, Attribute, ProductVariant, HomeSlide, MediaFile, Category, Coupon, ShippingZone, TaxClass, AuditLog, showToast, BuyerProfile, ProcurementLog, Supplier } from '../types';
import { 
  getProducts, saveProduct, deleteProduct, getOrders, updateOrderStatus, getSettings, saveSettings,
  getHomeSlides, saveHomeSlide, deleteHomeSlide, getMediaFiles, saveMediaFile, deleteMediaFile,
  saveCategory, deleteCategory, saveCoupon, deleteCoupon,
  saveShippingZone, deleteShippingZone, saveTaxClass, deleteTaxClass, getAuditLogs,
  getAllUsers, deleteBuyerProfile, saveBuyerProfile, getProcurements, addProcurement,
  getSuppliers, saveSupplier, deleteSupplier
} from '../db';
import { useLocation, navigate } from '../Router';
import { auth, db, firebaseConfig } from '../firebase';
import { 
  signOut, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail,
  multiFactor, TotpMultiFactorGenerator, reauthenticateWithCredential, EmailAuthProvider,
  sendEmailVerification
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

interface AdminDashboardProps {
  settings: ShopSettings;
  onChangeSettings: (newSettings: ShopSettings) => void;
  onRefreshProducts: () => void;
  onRefreshSlides: () => void;
  categories: Category[];
  onRefreshCategories: () => void;
  coupons: Coupon[];
  onRefreshCoupons: () => void;
  shippingZones: ShippingZone[];
  onRefreshShippingZones: () => Promise<void>;
  taxClasses: TaxClass[];
  onRefreshTaxClasses: () => Promise<void>;
  currentUserRole: string | null;
  currentUserUid: string | null;
  superAdminUid: string;
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
  onRefreshSlides,
  categories,
  onRefreshCategories,
  coupons,
  onRefreshCoupons,
  shippingZones,
  onRefreshShippingZones,
  taxClasses,
  onRefreshTaxClasses,
  currentUserRole,
  currentUserUid,
  superAdminUid,
}) => {
  const path = useLocation();

  // activeTab derived from URL path
  let activeTab: 'overview' | 'orders' | 'products' | 'settings' | 'customers' | 'reports' | 'categories' | 'promos' | 'media' | 'slides' | 'inventory' = 'overview';
  if (path === '/dashboard/orders') activeTab = 'orders';
  else if (path === '/dashboard/products') activeTab = 'products';
  else if (path === '/dashboard/settings') activeTab = 'settings';
  else if (path === '/dashboard/customers') activeTab = 'customers';
  else if (path === '/dashboard/reports') activeTab = 'reports';
  else if (path === '/dashboard/categories') activeTab = 'categories';
  else if (path === '/dashboard/promos') activeTab = 'promos';
  else if (path === '/dashboard/media') activeTab = 'media';
  else if (path === '/dashboard/slides') activeTab = 'slides';
  else if (path === '/dashboard/inventory') activeTab = 'inventory';
  
  // Lists from Firestore DB
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [localSettings, setLocalSettings] = useState<ShopSettings>(settings);
  
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'profile' | 'smtp' | 'payment' | 'rbac' | 'audit' | 'shipping' | 'tax' | 'shoppage'>('general');

  // 2FA state variables
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [mfaEnrollmentOpen, setMfaEnrollmentOpen] = useState(false);
  const [mfaModalStep, setMfaModalStep] = useState<'unverified' | 'password' | 'scan' | 'recovery' | 'verify'>('password');
  const [mfaPassword, setMfaPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [totpQrUrl, setTotpQrUrl] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [downloadedCodes, setDownloadedCodes] = useState(false);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  useEffect(() => {
    if (auth.currentUser) {
      setIs2FAEnabled(multiFactor(auth.currentUser).enrolledFactors.length > 0);
    }
  }, []);

  const generateRecoveryCodes = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.push(code);
    }
    return codes;
  };

  const hashRecoveryCode = async (code: string) => {
    const msgBuffer = new TextEncoder().encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDownloadRecoveryCodes = () => {
    const content = `GoldenCare Market Admin MFA Recovery Codes\n=========================================\n\nSave these codes securely. Each code is ONE-TIME use.\n\n${generatedCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goldencare_mfa_recovery_codes_${currentUserUid}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedCodes(true);
  };

  const handleSendVerificationEmail = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        showToast("Verification email sent! Please check your inbox.", "success");
      }
    } catch (err: any) {
      console.error("Failed to send verification email:", err);
      setMfaError(err.message || "Failed to send verification email. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (auth.currentUser?.emailVerified) {
          setMfaModalStep('password');
          showToast("Email verified successfully! You can now proceed.", "success");
        } else {
          setMfaError("Email is still unverified. Please check your inbox and click the verification link.");
        }
      }
    } catch (err: any) {
      console.error("Failed to check verification status:", err);
      setMfaError(err.message || "Failed to check status. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyPasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No authenticated user found.");
      }
      const credential = EmailAuthProvider.credential(user.email, mfaPassword);
      await reauthenticateWithCredential(user, credential);

      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);
      
      const qrUrl = secret.generateQrCodeUrl(user.email, settings.shopName || "GoldenCare Market");
      setTotpQrUrl(qrUrl);

      const codes = generateRecoveryCodes();
      setGeneratedCodes(codes);
      setDownloadedCodes(false);

      setMfaModalStep('scan');
    } catch (err: any) {
      console.error("Re-authentication failed:", err);
      if (err.code === 'auth/unverified-email') {
        setMfaModalStep('unverified');
        setMfaError("Your email must be verified before enrolling a second factor.");
      } else {
        setMfaError(err.message || "Incorrect password. Please try again.");
      }
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyTotpStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      const user = auth.currentUser;
      if (!user || !totpSecret) {
        throw new Error("Enrollment session expired. Please restart.");
      }

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpVerificationCode);
      await multiFactor(user).enroll(assertion, "Authenticator App");

      const hashedCodes = await Promise.all(generatedCodes.map(c => hashRecoveryCode(c)));
      const secRef = doc(db, "users", user.uid, "security", "recovery");
      await setDoc(secRef, {
        recoveryCodes: hashedCodes,
        totpSecretKey: totpSecret.secretKey
      });

      setIs2FAEnabled(true);
      setMfaEnrollmentOpen(false);
      showToast("Two-Factor Authentication enrolled successfully!", "success");
    } catch (err: any) {
      console.error("Verification failed:", err);
      setMfaError("Invalid verification code. Please check your app and try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      if (confirm("Are you sure you want to disable Two-Factor Authentication? Recovery codes will also be deleted.")) {
        try {
          const user = auth.currentUser;
          if (user) {
            const factors = multiFactor(user).enrolledFactors;
            for (const f of factors) {
              await multiFactor(user).unenroll(f);
            }
            const secRef = doc(db, "users", user.uid, "security", "recovery");
            await deleteDoc(secRef);
            setIs2FAEnabled(false);
            showToast("Two-Factor Authentication disabled.", "success");
          }
        } catch (err) {
          console.error("Unenroll failed:", err);
          alert("Failed to disable 2FA. You may need to refresh or log in again.");
        }
      }
    } else {
      const user = auth.currentUser;
      setMfaPassword('');
      setTotpVerificationCode('');
      setMfaError('');
      
      if (user && !user.emailVerified) {
        setMfaModalStep('unverified');
      } else {
        setMfaModalStep('password');
      }
      setMfaEnrollmentOpen(true);
    }
  };

  // Users list state
  const [usersList, setUsersList] = useState<BuyerProfile[]>([]);
  // Selected user for Edit view
  const [selectedUser, setSelectedUser] = useState<(BuyerProfile & { orderCount?: number; spent?: number; isGuest?: boolean; orders?: Order[] }) | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'shop_manager' | 'contributor' | 'customer'>('all');

  const getUserOrderStats = (u: BuyerProfile & { isGuest?: boolean }) => {
    const email = u.email?.trim().toLowerCase();
    const phone = u.phone?.trim();
    const userOrders = orders.filter(o => {
      const oEmail = o.buyerEmail?.trim().toLowerCase();
      const oPhone = o.customerPhone?.trim();
      return (email && oEmail === email) || (phone && oPhone === phone);
    });
    const spent = userOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      orderCount: userOrders.length,
      spent,
      orders: userOrders
    };
  };

  // User form states
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormFirstName, setUserFormFirstName] = useState('');
  const [userFormLastName, setUserFormLastName] = useState('');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormAddress, setUserFormAddress] = useState('');
  const [userFormRole, setUserFormRole] = useState('customer');
  const [userFormPassword, setUserFormPassword] = useState('');

  // Shipping Zones CRUD state
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneRegions, setZoneRegions] = useState('');
  const [zoneCost, setZoneCost] = useState(0);

  // Tax Classes CRUD state
  const [editingTaxClass, setEditingTaxClass] = useState<TaxClass | null>(null);
  const [taxClassName, setTaxClassName] = useState('');
  const [taxClassRate, setTaxClassRate] = useState(0);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Product tax class selection
  const [prodTaxClassId, setProdTaxClassId] = useState('');

  // Intercept alert popups with showToast
  const alert = (message: string) => {
    const isWarning = message.toLowerCase().includes('failed') || 
                      message.toLowerCase().includes('error') || 
                      message.toLowerCase().includes('please') || 
                      message.toLowerCase().includes('invalid');
    showToast(message, isWarning ? 'warning' : 'success');
  };

  // Load audit logs dynamically
  useEffect(() => {
    if (activeTab === 'settings' && settingsSubTab === 'audit') {
      const fetchLogs = async () => {
        try {
          const logs = await getAuditLogs();
          setAuditLogs(logs);
        } catch (err) {
          console.error("Failed to load audit logs:", err);
        }
      };
      fetchLogs();
    }
  }, [activeTab, settingsSubTab]);
  
  // Slides & Media manager states
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaName, setNewMediaName] = useState('');
  const [mediaUploadType, setMediaUploadType] = useState<'image' | 'video' | 'document' | 'url'>('image');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Media picker modal states
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<string | null>(null);

  // Slide CRUD state
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HomeSlide | null>(null);
  
  // Editing slide fields
  const [slideImage, setSlideImage] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [slideDescription, setSlideDescription] = useState('');
  const [slideButtonText, setSlideButtonText] = useState('');
  const [slideButtonLink, setSlideButtonLink] = useState('');
  const [slideOrder, setSlideOrder] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Categories CRUD state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Coupons CRUD state
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'flat'>('percent');
  const [couponVal, setCouponVal] = useState(0);
  const [couponDesc, setCouponDesc] = useState('');
  const [couponStartDate, setCouponStartDate] = useState('');
  const [couponEndDate, setCouponEndDate] = useState('');
  const [couponGroup, setCouponGroup] = useState<'all' | 'new' | 'returning' | 'vip' | 'emails'>('all');
  const [couponEmails, setCouponEmails] = useState('');
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);


  // Form Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeOrderDetails, setActiveOrderDetails] = useState<Order | null>(null);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCats, setProdCats] = useState<string[]>([]);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImg, setProdImg] = useState('');
  const [prodGallery, setProdGallery] = useState<string[]>([]);
  const [prodAttrs, setProdAttrs] = useState<Attribute[]>([]);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editorTab, setEditorTab] = useState<'general' | 'attributes' | 'variations'>('general');
  const [prodIsFeatured, setProdIsFeatured] = useState<boolean>(false);

  // Inventory & Procurement State
  const [procurements, setProcurements] = useState<ProcurementLog[]>([]);
  const [inventorySubTab, setInventorySubTab] = useState<'status' | 'logs' | 'suppliers'>('status');
  const [selectedProcurementVariant, setSelectedProcurementVariant] = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [adjType, setAdjType] = useState<'restock' | 'correction'>('restock');
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjSupplier, setAdjSupplier] = useState<string>('');
  const [adjInvoice, setAdjInvoice] = useState<string>('');
  const [adjCost, setAdjCost] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState<string>('');

  // Suppliers Management State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Slide Video State
  const [slideMediaType, setSlideMediaType] = useState<'image' | 'video'>('image');
  const [slideVideoUrl, setSlideVideoUrl] = useState('');

  // Cloudinary Upload State
  const [uploadingImage, setUploadingImage] = useState(false);

  // Temp Attribute Editor
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');

  // Load Admin Data from Firestore
  const loadAdminData = async () => {
    setIsAdminLoading(true);
    setIsLoading(true);
    try {
      const [dbProds, dbOrders, dbSettings, dbSlides, dbMedia, dbUsers, dbProcurements, dbSuppliers] = await Promise.all([
        getProducts(),
        getOrders(),
        getSettings(),
        getHomeSlides(),
        getMediaFiles(),
        getAllUsers(),
        getProcurements(),
        getSuppliers()
      ]);
      setProducts(dbProds);
      setOrders(dbOrders);
      setLocalSettings(dbSettings);
      setSlides(dbSlides);
      setMediaFiles(dbMedia);
      setUsersList(dbUsers);
      setProcurements(dbProcurements);
      setSuppliers(dbSuppliers);
    } catch (e) {
      console.error("Error loading data from Firestore:", e);
    } finally {
      setIsLoading(false);
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData();
  }, [path]);

  // Helper to check permissions (RBAC)
  const hasPermission = (permission: string): boolean => {
    // Super Admin or admin role has all permissions!
    if (currentUserUid === superAdminUid || currentUserRole === 'admin') {
      return true;
    }

    if (!currentUserRole) return false;

    // Load custom configuration from settings if it exists
    if (localSettings.rolesConfig && localSettings.rolesConfig[currentUserRole]) {
      const perms = localSettings.rolesConfig[currentUserRole] as Record<string, boolean>;
      return perms[permission] === true;
    }

    // Default Fallbacks
    const defaultRolesConfig: Record<string, Record<string, boolean>> = {
      shop_manager: {
        manageProducts: true,
        manageOrders: true,
        manageSettings: false,
        manageUsers: false,
        viewReports: true
      },
      contributor: {
        manageProducts: true,
        manageOrders: false,
        manageSettings: false,
        manageUsers: false,
        viewReports: true
      },
      customer: {
        manageProducts: false,
        manageOrders: false,
        manageSettings: false,
        manageUsers: false,
        viewReports: false
      }
    };

    const rolePerms = defaultRolesConfig[currentUserRole];
    return rolePerms ? rolePerms[permission] === true : false;
  };

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

  // Centralized media library and slideshow actions
  const handleMediaLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);

    try {
      const cloudinaryCloudName = "dhvnbtkgw";
      const cloudinaryApiKey = "826498111838123";
      const cloudinaryApiSecret = "tZkjGNGSkZFKBckwfCh9wkxniy0";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const signatureString = `timestamp=${timestamp}${cloudinaryApiSecret}`;
      const signature = await generateSha1(signatureString);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", cloudinaryApiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      let uploadCategory = "auto";
      if (file.type.startsWith("video/")) {
        uploadCategory = "video";
      } else if (file.type.startsWith("image/")) {
        uploadCategory = "image";
      } else {
        uploadCategory = "raw";
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${uploadCategory}/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status: ${res.status}`);
      }

      const json = await res.json();
      const newUrl = json.secure_url;

      let type: 'image' | 'video' | 'document' | 'url' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      const newMedia: MediaFile = {
        id: `media-${Date.now()}`,
        name: file.name,
        url: newUrl,
        type,
        size: file.size,
        createdAt: new Date().toISOString()
      };

      await saveMediaFile(newMedia);
      
      const dbMedia = await getMediaFiles();
      setMediaFiles(dbMedia);
      setSelectedMedia(newMedia);
      alert("Asset uploaded to Media Library!");
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      alert("Failed to upload asset. Please try again.");
    } finally {
      setUploadingMedia(false);
      e.target.value = ""; // reset file input
    }
  };

  const handleAddMediaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim() || !newMediaName.trim()) {
      alert("Please enter a name and a valid URL.");
      return;
    }

    try {
      const newMedia: MediaFile = {
        id: `media-${Date.now()}`,
        name: newMediaName.trim(),
        url: newMediaUrl.trim(),
        type: mediaUploadType,
        createdAt: new Date().toISOString()
      };

      await saveMediaFile(newMedia);
      
      setNewMediaUrl('');
      setNewMediaName('');
      
      const dbMedia = await getMediaFiles();
      setMediaFiles(dbMedia);
      setSelectedMedia(newMedia);
      alert("URL asset added to Media Library!");
    } catch (err) {
      console.error("Error adding URL media:", err);
      alert("Failed to add URL asset.");
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this media asset?")) return;

    try {
      await deleteMediaFile(id);
      setSelectedMedia(null);
      const dbMedia = await getMediaFiles();
      setMediaFiles(dbMedia);
      alert("Media asset deleted successfully!");
    } catch (err) {
      console.error("Error deleting media:", err);
      alert("Failed to delete media asset.");
    }
  };

  // Helper to detect/embed video URLs
  const getVideoEmbedUrl = (url: string): string | null => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  };

  const isVideoUrl = (url: string): boolean => {
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) || /\.(mp4|webm|ogg)$/i.test(url);
  };

  const handleOpenAddSlide = () => {
    setEditingSlide(null);
    setSlideImage('');
    setSlideTitle('');
    setSlideDescription('');
    setSlideButtonText('');
    setSlideButtonLink('');
    setSlideOrder(slides.length + 1);
    setSlideMediaType('image');
    setSlideVideoUrl('');
    setSlideModalOpen(true);
  };

  const handleOpenEditSlide = (slide: HomeSlide) => {
    setEditingSlide(slide);
    setSlideImage(slide.image);
    setSlideTitle(slide.title);
    setSlideDescription(slide.description);
    setSlideButtonText(slide.buttonText);
    setSlideButtonLink(slide.buttonLink);
    setSlideOrder(slide.order);
    setSlideMediaType(slide.mediaType || 'image');
    setSlideVideoUrl(slide.videoUrl || '');
    setSlideModalOpen(true);
  };

  const handleSaveSlideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideImage.trim() || !slideTitle.trim()) {
      alert("Slide background image and title are required.");
      return;
    }

    try {
      const slideData: HomeSlide = {
        id: editingSlide ? editingSlide.id : `slide-${Date.now()}`,
        image: slideImage.trim(),
        title: slideTitle.trim(),
        description: slideDescription.trim(),
        buttonText: slideButtonText.trim(),
        buttonLink: slideButtonLink.trim() || '/shop',
        order: Number(slideOrder),
        mediaType: slideMediaType,
        videoUrl: slideMediaType === 'video' ? slideVideoUrl.trim() : undefined
      };

      await saveHomeSlide(slideData);
      setSlideModalOpen(false);
      setEditingSlide(null);
      
      const dbSlides = await getHomeSlides();
      setSlides(dbSlides);
      onRefreshSlides();
      alert("Hero slide saved successfully!");
    } catch (err) {
      console.error("Error saving slide:", err);
      alert("Failed to save hero slide.");
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this slide?")) return;

    try {
      await deleteHomeSlide(id);
      const dbSlides = await getHomeSlides();
      setSlides(dbSlides);
      onRefreshSlides();
      alert("Slide deleted successfully!");
    } catch (err) {
      console.error("Error deleting slide:", err);
      alert("Failed to delete slide.");
    }
  };

  const handleSelectMedia = (url: string) => {
    if (mediaModalTarget === 'product-main') {
      setProdImg(url);
    } else if (mediaModalTarget === 'product-gallery') {
      setProdGallery(prev => [...prev, url]);
    } else if (mediaModalTarget === 'slide-image') {
      setSlideImage(url);
    } else if (mediaModalTarget === 'slide-video') {
      setSlideVideoUrl(url);
    } else if (mediaModalTarget && mediaModalTarget.startsWith('variant-image-')) {
      const idx = parseInt(mediaModalTarget.replace('variant-image-', ''), 10);
      if (!isNaN(idx)) {
        handleVariantFieldChange(idx, 'image', url);
      }
    } else if (mediaModalTarget === 'settings-logo') {
      setLocalSettings(prev => ({ ...prev, logoUrl: url }));
    } else if (mediaModalTarget === 'settings-favicon') {
      setLocalSettings(prev => ({ ...prev, faviconUrl: url }));
    } else if (mediaModalTarget === 'settings-avatar') {
      setLocalSettings(prev => ({ ...prev, adminAvatarUrl: url }));
    }
    setMediaModalOpen(false);
    setMediaModalTarget(null);
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
    if (!prodName.trim() || prodCats.length === 0 || prodPrice <= 0) {
      alert("Please fill in Name, at least one Category, and Base Price.");
      return;
    }

    setIsLoading(true);

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodName.trim(),
      description: prodDesc.trim(),
      category: prodCats[0], // Primary category for backward compat
      categories: prodCats,
      image: prodImg.trim() || "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
      basePrice: Number(prodPrice),
      attributes: prodAttrs,
      variants: prodVariants,
      images: prodGallery,
      taxClassId: prodTaxClassId || undefined,
      tags: prodTags.length > 0 ? prodTags : undefined,
      isFeatured: prodIsFeatured,
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
    const validCats = (prod.categories || [prod.category]).filter(catName => 
      categories.some(c => c.name === catName)
    );
    setProdCats(validCats);
    setProdPrice(prod.basePrice);
    setProdImg(prod.image);
    setProdGallery(prod.images || []);
    setProdAttrs(prod.attributes || []);
    setProdVariants(prod.variants || []);
    setProdTaxClassId(prod.taxClassId || '');
    setProdTags(prod.tags || []);
    setProdIsFeatured(prod.isFeatured || false);
    setNewTagInput('');
    setEditorTab('general');
    setProductModalOpen(true);
  };

  const handleToggleFeatured = async (prod: Product) => {
    setIsLoading(true);
    try {
      const updatedProduct: Product = { ...prod, isFeatured: !prod.isFeatured };
      await saveProduct(updatedProduct);
      await loadAdminData();
      onRefreshProducts();
    } catch (err) {
      console.error("Failed to toggle featured status:", err);
      alert("Failed to toggle featured status.");
    } finally {
      setIsLoading(false);
    }
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
  // Save Stock Adjustment
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcurementVariant) return;

    const { product, variant } = selectedProcurementVariant;

    if (adjQty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    if (adjType === 'restock') {
      if (!adjSupplier.trim()) {
        alert("Supplier Name is required for restocks.");
        return;
      }
      if (!adjInvoice.trim()) {
        alert("Supplier Invoice/PO # is required for restocks.");
        return;
      }
      if (adjCost <= 0) {
        alert("Unit Cost is required for restocks and must be greater than 0.");
        return;
      }
    } else {
      if (!adjNotes.trim()) {
        alert("Notes are required for manual stock corrections.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const prevStock = variant.stock || 0;
      const quantityChange = adjType === 'restock' ? adjQty : -adjQty;
      const newStock = Math.max(0, prevStock + quantityChange);

      // Update variant stock in product
      const updatedVariants = (product.variants || []).map(v => {
        if (v.id === variant.id) {
          return { ...v, stock: newStock };
        }
        return v;
      });

      const updatedProduct: Product = {
        ...product,
        variants: updatedVariants
      };

      // Create procurement log
      const newLog: ProcurementLog = {
        id: `proc-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantSku: variant.sku || 'N/A',
        variantLabel: Object.entries(variant.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard',
        type: adjType,
        quantity: quantityChange,
        previousStock: prevStock,
        newStock: newStock,
        notes: adjNotes.trim(),
        date: new Date().toISOString(),
        actor: auth.currentUser?.email || 'Admin',
        ...(adjType === 'restock' ? {
          supplierName: adjSupplier.trim(),
          procurementInvoice: adjInvoice.trim(),
          unitCost: Number(adjCost)
        } : {})
      };

      await saveProduct(updatedProduct);
      await addProcurement(newLog);

      setSelectedProcurementVariant(null);
      setAdjQty(0);
      setAdjSupplier('');
      setAdjInvoice('');
      setAdjCost(0);
      setAdjNotes('');

      await loadAdminData();
      onRefreshProducts();
      alert("Stock adjusted successfully!");
    } catch (err) {
      console.error("Failed to save stock adjustment:", err);
      alert("Failed to adjust stock.");
    } finally {
      setIsLoading(false);
    }
  };
  // Save Supplier Action
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert("Supplier Name is required.");
      return;
    }

    setIsLoading(true);
    try {
      const supplierId = editingSupplier ? editingSupplier.id : `sup-${Date.now()}`;
      const newSupplier: Supplier = {
        id: supplierId,
        name: supName.trim(),
        contactPerson: supContact.trim() || undefined,
        email: supEmail.trim() || undefined,
        phone: supPhone.trim() || undefined,
        address: supAddress.trim() || undefined,
        createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString()
      };

      await saveSupplier(newSupplier);
      
      // Reset form states
      setEditingSupplier(null);
      setSupName('');
      setSupContact('');
      setSupEmail('');
      setSupPhone('');
      setSupAddress('');

      await loadAdminData();
      alert("Supplier saved successfully!");
    } catch (err) {
      console.error("Failed to save supplier:", err);
      alert("Failed to save supplier.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSupplierClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupName(supplier.name);
    setSupContact(supplier.contactPerson || '');
    setSupEmail(supplier.email || '');
    setSupPhone(supplier.phone || '');
    setSupAddress(supplier.address || '');
  };

  const handleDeleteSupplierClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      setIsLoading(true);
      try {
        await deleteSupplier(id);
        await loadAdminData();
        alert("Supplier deleted successfully!");
      } catch (err) {
        console.error("Failed to delete supplier:", err);
        alert("Failed to delete supplier.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Categories Save/Delete Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert("Category name is required.");
      return;
    }
    const catId = editingCategory ? editingCategory.id : `cat-${Date.now()}`;
    const newCategory: Category = {
      id: catId,
      name: catName.trim(),
      description: catDesc.trim() || undefined
    };
    setIsLoading(true);
    try {
      await saveCategory(newCategory);
      setCatName('');
      setCatDesc('');
      setEditingCategory(null);
      onRefreshCategories();
      alert("Category saved successfully!");
    } catch (err) {
      console.error("Error saving category:", err);
      alert("Failed to save category.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;
    setIsLoading(true);
    try {
      await deleteCategory(id);
      if (editingCategory?.id === id) {
        setEditingCategory(null);
        setCatName('');
        setCatDesc('');
      }
      onRefreshCategories();
      alert("Category deleted successfully!");
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category.");
    } finally {
      setIsLoading(false);
    }
  };

  // Coupons Save/Delete Actions
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = couponCode.trim().toUpperCase();
    if (!formattedCode) {
      alert("Promo code is required.");
      return;
    }
    if (couponVal <= 0) {
      alert("Discount value must be greater than 0.");
      return;
    }

    const newCoupon: Coupon = {
      code: formattedCode,
      discountPercent: couponType === 'percent' ? Number(couponVal) : 0,
      flatDiscount: couponType === 'flat' ? Number(couponVal) : undefined,
      description: couponDesc.trim() || undefined,
      startDate: couponStartDate || undefined,
      endDate: couponEndDate || undefined,
      customerGroup: couponGroup,
      allowedEmails: couponGroup === 'emails' ? couponEmails.trim() : undefined
    };
    setIsLoading(true);
    try {
      await saveCoupon(newCoupon);
      setCouponCode('');
      setCouponVal(0);
      setCouponDesc('');
      setCouponStartDate('');
      setCouponEndDate('');
      setCouponGroup('all');
      setCouponEmails('');
      setEditingCoupon(null);
      onRefreshCoupons();
      alert("Promo code saved successfully!");
    } catch (err) {
      console.error("Error saving coupon:", err);
      alert("Failed to save promo code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCoupon = (cp: Coupon) => {
    setEditingCoupon(cp);
    setCouponCode(cp.code);
    setCouponType(cp.discountPercent > 0 ? 'percent' : 'flat');
    setCouponVal(cp.discountPercent > 0 ? cp.discountPercent : (cp.flatDiscount || 0));
    setCouponDesc(cp.description || '');
    setCouponStartDate(cp.startDate || '');
    setCouponEndDate(cp.endDate || '');
    setCouponGroup(cp.customerGroup || 'all');
    setCouponEmails(cp.allowedEmails || '');
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete the promo code "${code}"?`)) return;
    setIsLoading(true);
    try {
      await deleteCoupon(code);
      if (editingCoupon?.code === code) {
        setEditingCoupon(null);
        setCouponCode('');
        setCouponVal(0);
        setCouponDesc('');
        setCouponStartDate('');
        setCouponEndDate('');
        setCouponGroup('all');
        setCouponEmails('');
      }
      onRefreshCoupons();
      alert("Promo code deleted successfully!");
    } catch (err) {
      console.error("Error deleting coupon:", err);
      alert("Failed to delete promo code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdCats([]);
    setProdPrice(10000);
    setProdImg('');
    setProdGallery([]);
    setProdAttrs([]);
    setProdVariants([]);
    setProdTaxClassId('');
    setProdTags([]);
    setProdIsFeatured(false);
    setNewTagInput('');
    setEditorTab('general');
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

  // User CRUD Handlers
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormUsername || !userFormEmail || !userFormPassword) {
      alert("Please fill in Username, Email, and Password.");
      return;
    }
    setIsLoading(true);
    try {
      // 1. Create the Auth account using a temporary secondary app
      const secAppName = `SecApp-${Date.now()}`;
      const secApp = initializeApp(firebaseConfig, secAppName);
      const secAuth = getAuth(secApp);
      const cred = await createUserWithEmailAndPassword(secAuth, userFormEmail.trim(), userFormPassword);
      const uid = cred.user.uid;
      
      // Sign out secondary auth
      await secAuth.signOut();
      await deleteApp(secApp);

      // 2. Save the user document in Firestore
      const newProfile: BuyerProfile = {
        uid,
        fullName: `${userFormFirstName} ${userFormLastName}`.trim() || userFormUsername,
        email: userFormEmail.trim().toLowerCase(),
        phone: userFormPhone.trim(),
        address: userFormAddress.trim(),
        username: userFormUsername.trim(),
        firstName: userFormFirstName.trim(),
        lastName: userFormLastName.trim(),
        role: userFormRole,
        tempPassword: userFormPassword, // Store the password in Firestore
        notifyEmail: true,
        notifySms: false,
        notifyPromos: true
      };

      await saveBuyerProfile(newProfile);
      await loadAdminData(); // Refresh list

      // Reset form fields
      setUserFormUsername('');
      setUserFormEmail('');
      setUserFormFirstName('');
      setUserFormLastName('');
      setUserFormPhone('');
      setUserFormAddress('');
      setUserFormRole('customer');
      setUserFormPassword('');
      setIsAddingUser(false);

      showToast("User created successfully!", "success");
    } catch (err) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      alert(`Failed to create user: ${firebaseError.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      const updatedProfile: BuyerProfile = {
        uid: selectedUser.uid,
        fullName: `${userFormFirstName} ${userFormLastName}`.trim() || userFormUsername,
        email: userFormEmail.trim().toLowerCase(),
        phone: userFormPhone.trim(),
        address: userFormAddress.trim(),
        username: userFormUsername.trim(),
        firstName: userFormFirstName.trim(),
        lastName: userFormLastName.trim(),
        role: userFormRole,
        tempPassword: userFormPassword ? userFormPassword : (selectedUser.tempPassword || ''),
        notifyEmail: selectedUser.notifyEmail !== false,
        notifySms: selectedUser.notifySms || false,
        notifyPromos: selectedUser.notifyPromos !== false
      };

      await saveBuyerProfile(updatedProfile);
      
      // If a new password was typed, show a notice
      if (userFormPassword) {
        showToast("Profile details updated. Password manual update saved to profile document.", "success");
      } else {
        showToast("User updated successfully!", "success");
      }

      // Reload
      await loadAdminData();
      
      // Close form
      setSelectedUser(null);
      setUserFormPassword('');
    } catch (err) {
      console.error(err);
      alert("Failed to update user profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!email) return;
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Password reset email sent to ${email} successfully!`, "success");
    } catch (err) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      alert(`Failed to send password reset: ${firebaseError.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === currentUserUid || uid === superAdminUid) {
      alert("You cannot delete the currently logged in administrator or super admin.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteBuyerProfile(uid);
      showToast("User deleted successfully.", "success");
      await loadAdminData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete user profile.");
    } finally {
      setIsLoading(false);
    }
  };

  // Shipping Zones CRUD Handlers
  const handleSaveShippingZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !zoneRegions.trim()) {
      alert("Please fill in Zone Name and Regions.");
      return;
    }
    setIsLoading(true);
    const newZone: ShippingZone = {
      id: editingZone ? editingZone.id : `zone-${Date.now()}`,
      name: zoneName.trim(),
      regions: zoneRegions.trim(),
      cost: Number(zoneCost)
    };
    try {
      await saveShippingZone(newZone);
      setZoneName('');
      setZoneRegions('');
      setZoneCost(0);
      setEditingZone(null);
      await onRefreshShippingZones();
      alert("Shipping zone saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save shipping zone.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShippingZoneClick = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete shipping zone "${name}"?`)) return;
    setIsLoading(true);
    try {
      await deleteShippingZone(id);
      await onRefreshShippingZones();
      alert("Shipping zone deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete shipping zone.");
    } finally {
      setIsLoading(false);
    }
  };

  // Tax Classes CRUD Handlers
  const handleSaveTaxClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxClassName.trim()) {
      alert("Please enter Tax Class Name.");
      return;
    }
    setIsLoading(true);
    const newTax: TaxClass = {
      id: editingTaxClass ? editingTaxClass.id : `tax-${Date.now()}`,
      name: taxClassName.trim(),
      rate: Number(taxClassRate)
    };
    try {
      await saveTaxClass(newTax);
      setTaxClassName('');
      setTaxClassRate(0);
      setEditingTaxClass(null);
      await onRefreshTaxClasses();
      alert("Tax class saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save tax class.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTaxClassClick = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete tax class "${name}"?`)) return;
    setIsLoading(true);
    try {
      await deleteTaxClass(id);
      await onRefreshTaxClasses();
      alert("Tax class deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete tax class.");
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
          
          {hasPermission('manageOrders') && (
            <button 
              type="button"
              className={`wp-admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard/orders')}
            >
              <ShoppingBag size={18} />
              <span>Orders ({orders.length})</span>
            </button>
          )}
          
          {hasPermission('manageProducts') && (
            <>
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
                className={`wp-admin-menu-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/inventory')}
              >
                <Boxes size={18} />
                <span>Inventory</span>
              </button>
            </>
          )}

          {hasPermission('manageUsers') && (
            <button 
              type="button"
              className={`wp-admin-menu-item ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard/customers')}
            >
              <Users size={18} />
              <span>Users ({usersList.length})</span>
            </button>
          )}

          {hasPermission('viewReports') && (
            <button 
              type="button"
              className={`wp-admin-menu-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard/reports')}
            >
              <FileText size={18} />
              <span>Reports</span>
            </button>
          )}

          {hasPermission('manageProducts') && (
            <>
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
                className={`wp-admin-menu-item ${activeTab === 'promos' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/promos')}
              >
                <Tag size={18} />
                <span>Promos</span>
              </button>
              
              <button 
                type="button"
                className={`wp-admin-menu-item ${activeTab === 'media' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/media')}
              >
                <ImageIcon size={18} />
                <span>Media Library</span>
              </button>

              <button 
                type="button"
                className={`wp-admin-menu-item ${activeTab === 'slides' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/slides')}
              >
                <Sliders size={18} />
                <span>Hero Slides</span>
              </button>
            </>
          )}

          {hasPermission('manageSettings') && (
            <button 
              type="button"
              className={`wp-admin-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard/settings')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          )}
        </aside>

        {/* Content Panel */}
        <main className="wp-admin-main-content">
          {((activeTab === 'orders' && !hasPermission('manageOrders')) ||
            (['products', 'categories', 'promos', 'media', 'slides'].includes(activeTab) && !hasPermission('manageProducts')) ||
            (activeTab === 'customers' && !hasPermission('manageUsers')) ||
            (activeTab === 'reports' && !hasPermission('viewReports')) ||
            (activeTab === 'settings' && !hasPermission('manageSettings'))) ? (
            <div style={{ padding: '24px', background: '#fff', border: '1px solid #d30005', marginTop: '20px' }}>
              <h1 style={{ fontSize: '20px', color: '#d30005', fontWeight: 600, margin: '0 0 10px' }}>Access Denied</h1>
              <p style={{ fontSize: '13px', margin: 0 }}>You do not have the required permissions to view this administrative page. Please contact your system administrator.</p>
            </div>
          ) : (
            <>
          
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
                  {isAdminLoading ? (
                    [1, 2, 3].map(n => (
                      <tr key={n}>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map(o => (
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
                    ))
                  )}
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
                    <th style={{ width: '80px', textAlign: 'center' }}>Featured</th>
                    <th style={{ width: '120px' }}>Price</th>
                    <th style={{ width: '150px' }}>Categories</th>
                    <th style={{ width: '180px' }}>Attributes</th>
                    <th style={{ width: '120px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdminLoading ? (
                    [1, 2, 3].map(n => (
                      <tr key={n}>
                        <td style={{ paddingLeft: '10px' }}><div className="skeleton-row-box skeleton-pulse" style={{ height: '20px', width: '20px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ width: '40px', height: '40px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '24px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '20px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '20px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '20px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '20px' }} /></td>
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map(p => (
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
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(p)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            title={p.isFeatured ? "Unfeature Product" : "Feature Product"}
                          >
                            {p.isFeatured ? (
                              <span style={{ color: '#dba617', fontSize: '20px', lineHeight: 1 }}>★</span>
                            ) : (
                              <span style={{ color: '#ccd0d4', fontSize: '20px', lineHeight: 1 }}>☆</span>
                            )}
                          </button>
                        </td>
                        <td style={{ fontWeight: 600 }}>KSh {p.basePrice.toLocaleString()}</td>
                        <td>
                          {(p.categories || [p.category]).join(', ')}
                          {p.tags && p.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                              {p.tags.map(t => (
                                <span key={t} style={{ fontSize: '10px', color: '#646970', background: '#f0f2f5', padding: '1px 5px', border: '1px solid #e0e0e0' }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Shop Settings */}
          {activeTab === 'settings' && (
            <div>
              <h1 className="wp-admin-page-title">Shop Settings</h1>
              <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: '30px', alignItems: 'start', marginTop: '20px' }}>
                
                {/* Vertical Tabs Sidebar */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', border: '1px solid #c3c4c7', padding: '10px', borderRadius: '0px' }}>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'general' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('general')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'general' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'general' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    General Settings
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('profile')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'profile' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'profile' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Profile Settings
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'smtp' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('smtp')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'smtp' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'smtp' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    SMTP Settings
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'payment' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('payment')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'payment' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'payment' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Payment Options
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'rbac' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('rbac')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'rbac' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'rbac' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Roles & Permissions
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('audit')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'audit' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'audit' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Audit Logs
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'shipping' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('shipping')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'shipping' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'shipping' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Shipping Zones
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'tax' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('tax')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'tax' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'tax' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Tax Details
                  </button>
                  <button
                    type="button"
                    className={`wp-admin-menu-item ${settingsSubTab === 'shoppage' ? 'active' : ''}`}
                    onClick={() => setSettingsSubTab('shoppage')}
                    style={{ textAlign: 'left', padding: '10px 15px', border: 'none', background: settingsSubTab === 'shoppage' ? '#f0f0f1' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'block', width: '100%', borderRadius: 0, borderLeft: settingsSubTab === 'shoppage' ? '4px solid #2271b1' : '4px solid transparent', color: 'var(--color-ink)' }}
                  >
                    Shop Page
                  </button>
                </aside>

                {/* Sub-panel Content Box */}
                <div className="wp-postbox" style={{ margin: 0 }}>
                  <div className="wp-postbox-inside" style={{ padding: '24px' }}>
                    
                    {/* SUB-TAB: General Settings */}
                    {settingsSubTab === 'general' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>General System Settings</h2>
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>App Name</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.shopName || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, shopName: e.target.value })}
                                  required
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>App Logo</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <input 
                                    type="text" 
                                    placeholder="Logo image URL"
                                    style={{ width: '250px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                    value={localSettings.logoUrl || ''}
                                    onChange={e => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    className="wp-button-secondary"
                                    onClick={() => {
                                      setMediaModalTarget('settings-logo');
                                      setSelectedMedia(null);
                                      setMediaModalOpen(true);
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '12px', minHeight: '30px' }}
                                  >
                                    Choose from Library
                                  </button>
                                  {localSettings.logoUrl && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #c3c4c7', padding: '4px', background: '#fafafa' }}>
                                      <img 
                                        src={localSettings.logoUrl} 
                                        alt="Logo Preview" 
                                        style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }}
                                      />
                                      <button
                                        type="button"
                                        style={{ border: 'none', background: 'none', color: '#d30005', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                        onClick={() => setLocalSettings({ ...localSettings, logoUrl: '' })}
                                        title="Remove Logo"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>App Favicon</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <input 
                                    type="text" 
                                    placeholder="Favicon icon URL"
                                    style={{ width: '250px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                    value={localSettings.faviconUrl || ''}
                                    onChange={e => setLocalSettings({ ...localSettings, faviconUrl: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    className="wp-button-secondary"
                                    onClick={() => {
                                      setMediaModalTarget('settings-favicon');
                                      setSelectedMedia(null);
                                      setMediaModalOpen(true);
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '12px', minHeight: '30px' }}
                                  >
                                    Choose from Library
                                  </button>
                                  {localSettings.faviconUrl && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #c3c4c7', padding: '4px', background: '#fafafa' }}>
                                      <img 
                                        src={localSettings.faviconUrl} 
                                        alt="Favicon Preview" 
                                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                      />
                                      <button
                                        type="button"
                                        style={{ border: 'none', background: 'none', color: '#d30005', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                        onClick={() => setLocalSettings({ ...localSettings, faviconUrl: '' })}
                                        title="Remove Favicon"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Allow User Signups</th>
                              <td style={{ padding: '10px 0' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={localSettings.allowSignup !== false}
                                    onChange={e => setLocalSettings({ ...localSettings, allowSignup: e.target.checked })}
                                  />
                                  <span>Enable buyer profile registration and customer accounts</span>
                                </label>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>App Description</th>
                              <td style={{ padding: '10px 0' }}>
                                <textarea 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                                  rows={3}
                                  value={localSettings.description || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, description: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SEO Title</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.seoTitle || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, seoTitle: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SEO Keywords</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  placeholder="comma, separated, tags"
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.seoKeywords || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, seoKeywords: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SEO Meta Description</th>
                              <td style={{ padding: '10px 0' }}>
                                <textarea 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                                  rows={2}
                                  value={localSettings.seoDescription || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, seoDescription: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Branding Primary Color</th>
                              <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                  type="color" 
                                  value={localSettings.brandingPrimaryColor || '#111111'}
                                  onChange={e => setLocalSettings({ ...localSettings, brandingPrimaryColor: e.target.value })}
                                  style={{ border: 'none', width: '40px', height: '32px', cursor: 'pointer', background: 'none' }}
                                />
                                <input 
                                  type="text" 
                                  style={{ width: '100px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.brandingPrimaryColor || '#111111'}
                                  onChange={e => setLocalSettings({ ...localSettings, brandingPrimaryColor: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Branding Secondary Color</th>
                              <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                  type="color" 
                                  value={localSettings.brandingSecondaryColor || '#d30005'}
                                  onChange={e => setLocalSettings({ ...localSettings, brandingSecondaryColor: e.target.value })}
                                  style={{ border: 'none', width: '40px', height: '32px', cursor: 'pointer', background: 'none' }}
                                />
                                <input 
                                  type="text" 
                                  style={{ width: '100px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.brandingSecondaryColor || '#d30005'}
                                  onChange={e => setLocalSettings({ ...localSettings, brandingSecondaryColor: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Admin Dashboard URL</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminUrl || '/dashboard/home'}
                                  onChange={e => setLocalSettings({ ...localSettings, adminUrl: e.target.value })}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <button type="submit" className="wp-button-primary">Save General Settings</button>
                      </form>
                    )}

                    {/* SUB-TAB: Profile Settings */}
                    {settingsSubTab === 'profile' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>Admin Profile Settings</h2>
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Username</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminUsername || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, adminUsername: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>First Name</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminFirstName || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, adminFirstName: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Last Name</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminLastName || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, adminLastName: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Admin Email</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="email" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminEmail || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, adminEmail: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Avatar (1:1 Ratio)</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <input 
                                    type="text" 
                                    placeholder="https://example.com/admin.jpg"
                                    style={{ width: '250px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                    value={localSettings.adminAvatarUrl || ''}
                                    onChange={e => setLocalSettings({ ...localSettings, adminAvatarUrl: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    className="wp-button-secondary"
                                    onClick={() => {
                                      setMediaModalTarget('settings-avatar');
                                      setSelectedMedia(null);
                                      setMediaModalOpen(true);
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '12px', minHeight: '30px' }}
                                  >
                                    Choose from Library
                                  </button>
                                  {localSettings.adminAvatarUrl && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #c3c4c7', padding: '4px', background: '#fafafa' }}>
                                      <img 
                                        src={localSettings.adminAvatarUrl} 
                                        alt="Admin Avatar Preview" 
                                        style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                      />
                                      <button
                                        type="button"
                                        style={{ border: 'none', background: 'none', color: '#d30005', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                        onClick={() => setLocalSettings({ ...localSettings, adminAvatarUrl: '' })}
                                        title="Remove Avatar"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Change Password</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="password" 
                                  placeholder="••••••••"
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.adminPassword || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, adminPassword: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Two-Factor Authentication</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <button
                                    type="button"
                                    onClick={handleToggle2FA}
                                    className={`wp-button-${is2FAEnabled ? 'secondary' : 'primary'}`}
                                    style={{
                                      minHeight: '32px',
                                      height: '32px',
                                      padding: '0 16px',
                                      fontSize: '12px',
                                      borderRadius: '4px',
                                      backgroundColor: is2FAEnabled ? '#d30005' : '#111',
                                      color: '#fff',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                                  </button>
                                  <span style={{ fontSize: '13px', color: '#646970' }}>
                                    {is2FAEnabled ? 'Active (TOTP Authenticator Protected)' : 'Inactive'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <button type="submit" className="wp-button-primary">Save Profile Settings</button>
                      </form>
                    )}

                    {/* SUB-TAB: SMTP Settings */}
                    {settingsSubTab === 'smtp' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>SMTP & Email Settings</h2>
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Email Provider</th>
                              <td style={{ padding: '10px 0', display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="emailProvider" 
                                    value="resend" 
                                    checked={localSettings.emailProvider === 'resend'}
                                    onChange={() => setLocalSettings({ ...localSettings, emailProvider: 'resend' })}
                                  />
                                  <span>Resend Service API</span>
                                </label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="emailProvider" 
                                    value="smtp" 
                                    checked={localSettings.emailProvider === 'smtp'}
                                    onChange={() => setLocalSettings({ ...localSettings, emailProvider: 'smtp' })}
                                  />
                                  <span>Custom SMTP Credentials</span>
                                </label>
                              </td>
                            </tr>

                            {localSettings.emailProvider === 'resend' ? (
                              <tr>
                                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Resend API Key</th>
                                <td style={{ padding: '10px 0' }}>
                                  <input 
                                    type="password" 
                                    placeholder="re_..."
                                    style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                    value={localSettings.resendApiKey || ''}
                                    onChange={e => setLocalSettings({ ...localSettings, resendApiKey: e.target.value })}
                                  />
                                </td>
                              </tr>
                            ) : (
                              <>
                                <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                                  <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SMTP Host</th>
                                  <td style={{ padding: '10px 0' }}>
                                    <input 
                                      type="text" 
                                      placeholder="smtp.mailgun.org"
                                      style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                      value={localSettings.smtpHost || ''}
                                      onChange={e => setLocalSettings({ ...localSettings, smtpHost: e.target.value })}
                                    />
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                                  <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SMTP Port</th>
                                  <td style={{ padding: '10px 0' }}>
                                    <input 
                                      type="number" 
                                      placeholder="587"
                                      style={{ width: '100px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                      value={localSettings.smtpPort || ''}
                                      onChange={e => setLocalSettings({ ...localSettings, smtpPort: Number(e.target.value) })}
                                    />
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                                  <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SMTP User / Email</th>
                                  <td style={{ padding: '10px 0' }}>
                                    <input 
                                      type="text" 
                                      placeholder="postmaster@domain.com"
                                      style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                      value={localSettings.smtpUser || ''}
                                      onChange={e => setLocalSettings({ ...localSettings, smtpUser: e.target.value })}
                                    />
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                                  <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>SMTP Password</th>
                                  <td style={{ padding: '10px 0' }}>
                                    <input 
                                      type="password" 
                                      placeholder="SMTP password"
                                      style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                      value={localSettings.smtpPassword || ''}
                                      onChange={e => setLocalSettings({ ...localSettings, smtpPassword: e.target.value })}
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Encryption Type</th>
                                  <td style={{ padding: '10px 0' }}>
                                    <select 
                                      style={{ width: '150px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                      value={localSettings.smtpEncryption || 'tls'}
                                      onChange={e => setLocalSettings({ ...localSettings, smtpEncryption: e.target.value as 'ssl' | 'tls' | 'none' })}
                                    >
                                      <option value="ssl">SSL (Port 465)</option>
                                      <option value="tls">TLS (Port 587)</option>
                                      <option value="none">None (Plaintext)</option>
                                    </select>
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <button type="submit" className="wp-button-primary">Save SMTP Settings</button>
                      </form>
                    )}

                    {/* SUB-TAB: Payment Options */}
                    {settingsSubTab === 'payment' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>Store Payment Gateways</h2>
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Cash on Delivery (COD)</th>
                              <td style={{ padding: '10px 0' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={localSettings.codActive !== false}
                                    onChange={e => setLocalSettings({ ...localSettings, codActive: e.target.checked })}
                                  />
                                  <span>Enable Cash on Delivery option for storefront checkouts</span>
                                </label>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Paystack Gateway</th>
                              <td style={{ padding: '10px 0' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={localSettings.paystackActive !== false}
                                    onChange={e => setLocalSettings({ ...localSettings, paystackActive: e.target.checked })}
                                  />
                                  <span>Enable secure online payments using Paystack (M-Pesa / Cards)</span>
                                </label>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Demo / Sandbox Mode</th>
                              <td style={{ padding: '10px 0' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={localSettings.demoMode}
                                    onChange={e => setLocalSettings({ ...localSettings, demoMode: e.target.checked })}
                                  />
                                  <span>Enable sandbox mock payments (Doesn't charge real money)</span>
                                </label>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Paystack Mode</th>
                              <td style={{ padding: '10px 0', display: 'flex', gap: '20px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="paystackMode" 
                                    value="test" 
                                    checked={localSettings.paystackMode === 'test' || !localSettings.paystackMode}
                                    onChange={() => setLocalSettings({ ...localSettings, paystackMode: 'test' })}
                                  />
                                  <span>Test Environment</span>
                                </label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="paystackMode" 
                                    value="live" 
                                    checked={localSettings.paystackMode === 'live'}
                                    onChange={() => setLocalSettings({ ...localSettings, paystackMode: 'live' })}
                                  />
                                  <span>Live Environment</span>
                                </label>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Paystack Public Key</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  placeholder="pk_test_..."
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.paystackPublicKey || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, paystackPublicKey: e.target.value })}
                                />
                              </td>
                            </tr>
                            <tr>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Paystack Secret Key</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="password" 
                                  placeholder="sk_test_..."
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={localSettings.paystackSecretKey || ''}
                                  onChange={e => setLocalSettings({ ...localSettings, paystackSecretKey: e.target.value })}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <button type="submit" className="wp-button-primary">Save Payment Settings</button>
                      </form>
                    )}

                    {/* SUB-TAB: Roles & Permissions (RBAC) */}
                    {settingsSubTab === 'rbac' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>Role-Based Access Control (RBAC)</h2>
                        <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 20px' }}>
                          Configure what each user role is permitted to manage inside the store management dashboard.
                        </p>
                        
                        <table className="wp-list-table" style={{ width: '100%', fontSize: '13px', border: '1px solid #c3c4c7' }}>
                          <thead>
                            <tr style={{ background: '#f6f7f7' }}>
                              <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>Manage Products</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>Manage Orders</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>Manage Users</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>Manage Settings</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>View Reports</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['shop_manager', 'contributor', 'customer'].map(role => {
                              // Retrieve permissions for this role or fall back to defaults
                              const getRolePerm = (perm: string): boolean => {
                                if (localSettings.rolesConfig?.[role]) {
                                  return localSettings.rolesConfig[role][perm] === true;
                                }
                                // Defaults
                                const defaults: Record<string, Record<string, boolean>> = {
                                  shop_manager: { manageProducts: true, manageOrders: true, manageUsers: false, manageSettings: false, viewReports: true },
                                  contributor: { manageProducts: true, manageOrders: false, manageUsers: false, manageSettings: false, viewReports: true },
                                  customer: { manageProducts: false, manageOrders: false, manageUsers: false, manageSettings: false, viewReports: false }
                                };
                                return defaults[role]?.[perm] === true;
                              };

                              const handleTogglePerm = (perm: string, checked: boolean) => {
                                const currentRolesConfig = localSettings.rolesConfig || {};
                                const currentRolePerms = currentRolesConfig[role] || {
                                  manageProducts: role === 'shop_manager' || role === 'contributor',
                                  manageOrders: role === 'shop_manager',
                                  manageUsers: false,
                                  manageSettings: false,
                                  viewReports: role === 'shop_manager' || role === 'contributor'
                                };
                                
                                const updatedRolesConfig = {
                                  ...currentRolesConfig,
                                  [role]: {
                                    ...currentRolePerms,
                                    [perm]: checked
                                  }
                                };
                                
                                setLocalSettings({
                                  ...localSettings,
                                  rolesConfig: updatedRolesConfig
                                });
                              };

                              const getRoleLabel = (r: string) => {
                                if (r === 'shop_manager') return 'Shop Manager';
                                if (r === 'contributor') return 'Contributor';
                                if (r === 'customer') return 'Customer (Subscriber)';
                                return r;
                              };

                              return (
                                <tr key={role} style={{ borderBottom: '1px solid #f0f1f1' }}>
                                  <td style={{ padding: '15px 10px', fontWeight: 600 }}>{getRoleLabel(role)}</td>
                                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={getRolePerm('manageProducts')} 
                                      onChange={e => handleTogglePerm('manageProducts', e.target.checked)}
                                    />
                                  </td>
                                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={getRolePerm('manageOrders')} 
                                      onChange={e => handleTogglePerm('manageOrders', e.target.checked)}
                                    />
                                  </td>
                                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={getRolePerm('manageUsers')} 
                                      onChange={e => handleTogglePerm('manageUsers', e.target.checked)}
                                    />
                                  </td>
                                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={getRolePerm('manageSettings')} 
                                      onChange={e => handleTogglePerm('manageSettings', e.target.checked)}
                                    />
                                  </td>
                                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={getRolePerm('viewReports')} 
                                      onChange={e => handleTogglePerm('viewReports', e.target.checked)}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        <div style={{ marginTop: '20px', padding: '12px', background: '#fafafa', borderLeft: '4px solid #72aee6', fontSize: '12px', color: '#50575e' }}>
                          <strong>Note:</strong> Super Administrators (`admin` role or user matching superAdminUid) always bypass access checks and have all capabilities enabled.
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <button type="submit" className="wp-button-primary">Save Permissions Settings</button>
                      </form>
                    )}

                    {/* SUB-TAB: Audit Logs */}
                    {settingsSubTab === 'audit' && (
                      <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>Security Audit History</h2>
                        <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 20px' }}>Below is a chronological log of all administrative and storefront write operations.</p>
                        
                        <table className="wp-list-table">
                          <thead>
                            <tr>
                              <th style={{ width: '180px' }}>Timestamp</th>
                              <th style={{ width: '120px' }}>Actor</th>
                              <th>Action Log</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#a7aaad' }}>No logs recorded yet.</td>
                              </tr>
                            ) : (
                              auditLogs.map(log => (
                                <tr key={log.id}>
                                  <td style={{ fontSize: '12px', color: '#646970' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                  <td style={{ fontWeight: 600 }}>{log.actor}</td>
                                  <td>
                                    <strong>{log.action}</strong>
                                    {log.details && <span style={{ display: 'block', fontSize: '12px', color: '#646970', marginTop: '3px' }}>{log.details}</span>}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SUB-TAB: Shipping Zones CRUD */}
                    {settingsSubTab === 'shipping' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '30px', alignItems: 'start' }}>
                        
                        {/* CRUD Add/Edit Form */}
                        <form onSubmit={handleSaveShippingZoneSubmit} style={{ border: '1px solid #c3c4c7', padding: '20px', background: '#fafafa' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 15px', textTransform: 'uppercase' }}>
                            {editingZone ? "Edit Shipping Zone" : "Add New Shipping Zone"}
                          </h3>
                          
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px', fontSize: '12px' }}>Zone Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Nairobi Metro"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', boxSizing: 'border-box' }}
                              value={zoneName}
                              onChange={e => setZoneName(e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px', fontSize: '12px' }}>Covered Regions (Comma-separated)</label>
                            <textarea 
                              placeholder="e.g. Nairobi, Kiambu, Kajiado, Machakos"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                              rows={3}
                              value={zoneRegions}
                              onChange={e => setZoneRegions(e.target.value)}
                              required
                            />
                            <p style={{ color: '#646970', margin: '4px 0 0', fontSize: '11px' }}>Any matching substring in the customer address will select this zone.</p>
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px', fontSize: '12px' }}>Shipping Cost (KSh)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 1500"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', boxSizing: 'border-box' }}
                              value={zoneCost}
                              onChange={e => setZoneCost(Number(e.target.value))}
                              required
                              min={0}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" className="wp-button-primary" style={{ padding: '8px 16px' }}>Save Zone</button>
                            {editingZone && (
                              <button 
                                type="button" 
                                className="wp-button-secondary" 
                                onClick={() => {
                                  setEditingZone(null);
                                  setZoneName('');
                                  setZoneRegions('');
                                  setZoneCost(0);
                                }}
                                style={{ padding: '8px 16px' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>

                        {/* List Zones Table */}
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 15px', textTransform: 'uppercase' }}>Configured Shipping Zones</h3>
                          <table className="wp-list-table">
                            <thead>
                              <tr>
                                <th>Zone Name</th>
                                <th>Regions</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Cost</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shippingZones.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#a7aaad' }}>No shipping zones defined. Flat fee applies.</td>
                                </tr>
                              ) : (
                                shippingZones.map(zone => (
                                  <tr key={zone.id}>
                                    <td style={{ fontWeight: 600 }}>{zone.name}</td>
                                    <td style={{ fontSize: '12px' }}>{zone.regions}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>KSh {zone.cost.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button 
                                        type="button" 
                                        className="wp-button-secondary"
                                        onClick={() => {
                                          setEditingZone(zone);
                                          setZoneName(zone.name);
                                          setZoneRegions(zone.regions);
                                          setZoneCost(zone.cost);
                                        }}
                                        style={{ padding: '2px 8px', fontSize: '11px', minHeight: 'auto', marginRight: '6px' }}
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        type="button" 
                                        className="wp-button-link-delete"
                                        onClick={() => handleDeleteShippingZoneClick(zone.id, zone.name)}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB: Tax Details CRUD */}
                    {settingsSubTab === 'tax' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '30px', alignItems: 'start' }}>
                        
                        {/* CRUD Add/Edit Form */}
                        <form onSubmit={handleSaveTaxClassSubmit} style={{ border: '1px solid #c3c4c7', padding: '20px', background: '#fafafa' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 15px', textTransform: 'uppercase' }}>
                            {editingTaxClass ? "Edit Tax Class" : "Add New Tax Class"}
                          </h3>
                          
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px', fontSize: '12px' }}>Tax Class Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Standard VAT (16%)"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', boxSizing: 'border-box' }}
                              value={taxClassName}
                              onChange={e => setTaxClassName(e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px', fontSize: '12px' }}>Tax Rate (%)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="e.g. 16"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', boxSizing: 'border-box' }}
                              value={taxClassRate}
                              onChange={e => setTaxClassRate(Number(e.target.value))}
                              required
                              min={0}
                              max={100}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" className="wp-button-primary" style={{ padding: '8px 16px' }}>Save Tax Class</button>
                            {editingTaxClass && (
                              <button 
                                type="button" 
                                className="wp-button-secondary" 
                                onClick={() => {
                                  setEditingTaxClass(null);
                                  setTaxClassName('');
                                  setTaxClassRate(0);
                                }}
                                style={{ padding: '8px 16px' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>

                        {/* List Tax Classes Table */}
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 15px', textTransform: 'uppercase' }}>Configured Tax Classes</h3>
                          <table className="wp-list-table">
                            <thead>
                              <tr>
                                <th>Tax Class Name</th>
                                <th style={{ width: '120px', textAlign: 'right' }}>Rate %</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {taxClasses.length === 0 ? (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#a7aaad' }}>No custom tax classes defined. Default flat rate applies.</td>
                                </tr>
                              ) : (
                                taxClasses.map(tc => (
                                  <tr key={tc.id}>
                                    <td style={{ fontWeight: 600 }}>{tc.name}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{tc.rate}%</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button 
                                        type="button" 
                                        className="wp-button-secondary"
                                        onClick={() => {
                                          setEditingTaxClass(tc);
                                          setTaxClassName(tc.name);
                                          setTaxClassRate(tc.rate);
                                        }}
                                        style={{ padding: '2px 8px', fontSize: '11px', minHeight: 'auto', marginRight: '6px' }}
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        type="button" 
                                        className="wp-button-link-delete"
                                        onClick={() => handleDeleteTaxClassClick(tc.id, tc.name)}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB: Shop Page Settings */}
                    {settingsSubTab === 'shoppage' && (
                      <form onSubmit={handleSaveSettingsSubmit}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Shop Page Settings</h2>
                        <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 24px' }}>Configure the default appearance and behavior of your storefront shop page.</p>
                        
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Default Product View</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input
                                      type="radio"
                                      name="shopPageDefaultView"
                                      value="grid"
                                      checked={(localSettings.shopPageDefaultView || 'grid') === 'grid'}
                                      onChange={() => setLocalSettings(prev => ({ ...prev, shopPageDefaultView: 'grid' }))}
                                    />
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                                      Grid View
                                    </span>
                                  </label>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                    <input
                                      type="radio"
                                      name="shopPageDefaultView"
                                      value="list"
                                      checked={(localSettings.shopPageDefaultView || 'grid') === 'list'}
                                      onChange={() => setLocalSettings(prev => ({ ...prev, shopPageDefaultView: 'list' }))}
                                    />
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                      List View
                                    </span>
                                  </label>
                                </div>
                                <p style={{ fontSize: '12px', color: '#646970', margin: '8px 0 0', lineHeight: 1.5 }}>Choose whether products on the shop page should initially display as a grid of cards or a vertical list. Customers can still toggle between views.</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f1f1' }}>
                          <button type="submit" className="wp-button-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Shop Page Settings'}
                          </button>
                        </div>
                      </form>
                    )}

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: Users & Customers Management */}
          {activeTab === 'customers' && (
            <div>
              {isAddingUser ? (
                // Add New User Form
                <div className="wp-postbox" style={{ margin: 0 }}>
                  <div className="wp-postbox-inside" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>Add New User</h2>
                    <form onSubmit={handleAddUserSubmit}>
                      <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Username <span style={{ color: '#d30005' }}>*</span></th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="text" 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormUsername}
                                onChange={e => setUserFormUsername(e.target.value)}
                                required
                              />
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Email Address <span style={{ color: '#d30005' }}>*</span></th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="email" 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormEmail}
                                onChange={e => setUserFormEmail(e.target.value)}
                                required
                              />
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Password <span style={{ color: '#d30005' }}>*</span></th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="password" 
                                placeholder="Min 6 characters"
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormPassword}
                                onChange={e => setUserFormPassword(e.target.value)}
                                required
                                minLength={6}
                              />
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Role</th>
                            <td style={{ padding: '10px 0' }}>
                              <select 
                                style={{ width: '200px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormRole}
                                onChange={e => setUserFormRole(e.target.value)}
                              >
                                <option value="customer">Customer (Subscriber)</option>
                                <option value="contributor">Contributor</option>
                                <option value="shop_manager">Shop Manager</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>First Name</th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="text" 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormFirstName}
                                onChange={e => setUserFormFirstName(e.target.value)}
                              />
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Last Name</th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="text" 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormLastName}
                                onChange={e => setUserFormLastName(e.target.value)}
                              />
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Phone</th>
                            <td style={{ padding: '10px 0' }}>
                              <input 
                                type="text" 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                value={userFormPhone}
                                onChange={e => setUserFormPhone(e.target.value)}
                              />
                            </td>
                          </tr>
                          <tr>
                            <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Address</th>
                            <td style={{ padding: '10px 0' }}>
                              <textarea 
                                style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                                rows={3}
                                value={userFormAddress}
                                onChange={e => setUserFormAddress(e.target.value)}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="wp-button-primary">Add New User</button>
                        <button 
                          type="button" 
                          className="wp-button-secondary" 
                          onClick={() => setIsAddingUser(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : selectedUser ? (
                // Edit User Form (WordPress style)
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1.2fr)', gap: '30px', alignItems: 'start' }}>
                  
                  {/* Left Column: Form details */}
                  <div className="wp-postbox" style={{ margin: 0 }}>
                    <div className="wp-postbox-inside" style={{ padding: '24px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px', textTransform: 'uppercase' }}>
                        Edit User Profile: {selectedUser.fullName || selectedUser.username}
                      </h2>
                      <form onSubmit={handleEditUserSubmit}>
                        <table className="form-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Username</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', background: '#f0f0f1' }}
                                  value={userFormUsername}
                                  onChange={e => setUserFormUsername(e.target.value)}
                                  readOnly={!selectedUser.isGuest} // Username read-only for auth users
                                  required
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Email Address</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="email" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', background: selectedUser.isGuest ? '#fff' : '#f0f0f1' }}
                                  value={userFormEmail}
                                  onChange={e => setUserFormEmail(e.target.value)}
                                  readOnly={!selectedUser.isGuest}
                                  required
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Role</th>
                              <td style={{ padding: '10px 0' }}>
                                <select 
                                  style={{ width: '200px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={userFormRole}
                                  onChange={e => setUserFormRole(e.target.value)}
                                >
                                  <option value="customer">Customer (Subscriber)</option>
                                  <option value="contributor">Contributor</option>
                                  <option value="shop_manager">Shop Manager</option>
                                  <option value="admin">Administrator</option>
                                </select>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>First Name</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={userFormFirstName}
                                  onChange={e => setUserFormFirstName(e.target.value)}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Last Name</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={userFormLastName}
                                  onChange={e => setUserFormLastName(e.target.value)}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Phone</th>
                              <td style={{ padding: '10px 0' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                  value={userFormPhone}
                                  onChange={e => setUserFormPhone(e.target.value)}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Address</th>
                              <td style={{ padding: '10px 0' }}>
                                <textarea 
                                  style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                                  rows={3}
                                  value={userFormAddress}
                                  onChange={e => setUserFormAddress(e.target.value)}
                                />
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f0f1f1' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>New Password</th>
                              <td style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <input 
                                    type="password" 
                                    placeholder="Type a new password to change manually"
                                    style={{ width: '350px', padding: '6px 8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                                    value={userFormPassword}
                                    onChange={e => setUserFormPassword(e.target.value)}
                                    minLength={6}
                                  />
                                  <p style={{ color: '#646970', margin: 0, fontSize: '11px', maxWidth: '350px' }}>
                                    <em>Note: Client security policies restrict direct modification of other users' Firebase Auth passwords. Typing a password here updates the user record profile document. Use standard resets for secure Auth credential updating.</em>
                                  </p>
                                </div>
                              </td>
                            </tr>
                            {!selectedUser.isGuest && (
                              <tr>
                                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', fontWeight: 600 }}>Security Tools</th>
                                <td style={{ padding: '10px 0' }}>
                                  <button
                                    type="button"
                                    className="wp-button-secondary"
                                    onClick={() => handleSendPasswordReset(selectedUser.email)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <Mail size={14} />
                                    <span>Send Password Reset Email</span>
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        <hr style={{ border: '0', borderTop: '1px solid #c3c4c7', margin: '20px 0' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="wp-button-primary">Save Profile Changes</button>
                          <button 
                            type="button" 
                            className="wp-button-secondary" 
                            onClick={() => setSelectedUser(null)}
                          >
                            Back to List
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Metaboxes & Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* User Action Metabox */}
                    <div className="wp-postbox" style={{ margin: 0 }}>
                      <h3 className="wp-postbox-title">Account Actions</h3>
                      <div className="wp-postbox-inside">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <strong>UID:</strong> <code style={{ fontSize: '10px', wordBreak: 'break-all' }}>{selectedUser.uid}</code>
                          </div>
                          <div>
                            <strong>Orders Count:</strong> {selectedUser.orderCount || 0}
                          </div>
                          <div>
                            <strong>Total Spent:</strong> KSh {(selectedUser.spent || 0).toLocaleString()}
                          </div>
                          <hr style={{ border: 0, borderTop: '1px solid #dcdcde', margin: '5px 0' }} />
                          <button
                            type="button"
                            className="wp-button-link-delete"
                            onClick={() => handleDeleteUser(selectedUser.uid, selectedUser.fullName || selectedUser.username || '')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%', padding: '6px 0', border: '1px solid #b32d2e', background: 'none' }}
                          >
                            <Trash2 size={14} />
                            <span>Delete User Account</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Order History Metabox (if Customer) */}
                    {selectedUser.orders && selectedUser.orders.length > 0 && (
                      <div className="wp-postbox" style={{ margin: 0 }}>
                        <h3 className="wp-postbox-title">Customer Order History</h3>
                        <div className="wp-postbox-inside" style={{ maxHeight: '400px', overflowY: 'auto', padding: '15px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedUser.orders.map(o => (
                              <div key={o.id} style={{ border: '1px solid #dcdcde', padding: '10px', fontSize: '12px', background: '#fafafa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                  <span>#{o.id.substring(6, 12)}</span>
                                  <span>KSh {o.totalAmount.toLocaleString()}</span>
                                </div>
                                <div style={{ color: '#646970', marginTop: '2px' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                                  <span className={`wp-badge-status ${o.orderStatus.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{o.orderStatus}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                // Users list table view (WordPress style)
                <div>
                  <h1 className="wp-admin-page-title">
                    Users 
                    <button 
                      className="wp-button-secondary" 
                      style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '11px', minHeight: 'auto' }} 
                      onClick={() => {
                        setUserFormUsername('');
                        setUserFormEmail('');
                        setUserFormFirstName('');
                        setUserFormLastName('');
                        setUserFormPhone('');
                        setUserFormAddress('');
                        setUserFormRole('customer');
                        setUserFormPassword('');
                        setIsAddingUser(true);
                      }}
                    >
                      Add New
                    </button>
                  </h1>
                  <p style={{ fontSize: '13px', color: '#646970', marginBottom: '16px' }}>
                    Manage store users, administrators, shop managers, and customer profiles. Click on a user's name to edit their details.
                  </p>

                  {/* Dynamic Aggregation & Combining */}
                  {(() => {
                    const allUsers: (BuyerProfile & { isGuest?: boolean })[] = [...usersList];
                    
                    orders.forEach(o => {
                      const email = o.buyerEmail?.trim().toLowerCase();
                      const phone = o.customerPhone?.trim();
                      if (!email && !phone) return;
                      
                      // Check if there is an existing user in usersList
                      const exists = usersList.some(u => 
                        (email && u.email.toLowerCase() === email) || 
                        (phone && u.phone === phone)
                      );
                      
                      if (!exists) {
                        const guestKey = email || phone || o.customerName;
                        // Prevent duplicates
                        const guestExists = allUsers.some(u => 
                          (email && u.email.toLowerCase() === email) || 
                          (phone && u.phone === phone)
                        );
                        
                        if (!guestExists) {
                          allUsers.push({
                            uid: `guest-${guestKey}`,
                            fullName: o.customerName,
                            email: o.buyerEmail || 'Guest Shopper',
                            phone: o.customerPhone || '',
                            address: o.customerAddress || '',
                            role: 'customer',
                            isGuest: true,
                            notifyEmail: false,
                            notifySms: false,
                            notifyPromos: false
                          });
                        }
                      }
                    });

                    // Filter users by selected role filter
                    const filteredUsers = allUsers.filter(u => {
                      if (userRoleFilter === 'all') return true;
                      return u.role === userRoleFilter;
                    });

                    const getRoleCount = (r: string) => {
                      if (r === 'all') return allUsers.length;
                      return allUsers.filter(u => u.role === r).length;
                    };

                    const getRoleDisplay = (r?: string) => {
                      if (!r) return 'Subscriber';
                      if (r === 'admin') return 'Administrator';
                      if (r === 'shop_manager') return 'Shop Manager';
                      if (r === 'contributor') return 'Contributor';
                      if (r === 'customer') return 'Customer';
                      return r;
                    };

                    return (
                      <>
                        {/* WP-like Role filters tabs */}
                        <div className="subsubsub" style={{ display: 'flex', gap: '8px', fontSize: '13px', margin: '0 0 16px 0', borderBottom: '1px solid #dcdcde', paddingBottom: '8px' }}>
                          <span style={{ color: '#646970' }}>
                            <a 
                              onClick={() => setUserRoleFilter('all')} 
                              style={{ color: userRoleFilter === 'all' ? '#000' : '#2271b1', fontWeight: userRoleFilter === 'all' ? '600' : 'normal', cursor: 'pointer' }}
                            >
                              All ({getRoleCount('all')})
                            </a> |
                          </span>
                          <span style={{ color: '#646970' }}>
                            <a 
                              onClick={() => setUserRoleFilter('admin')} 
                              style={{ color: userRoleFilter === 'admin' ? '#000' : '#2271b1', fontWeight: userRoleFilter === 'admin' ? '600' : 'normal', cursor: 'pointer' }}
                            >
                              Administrators ({getRoleCount('admin')})
                            </a> |
                          </span>
                          <span style={{ color: '#646970' }}>
                            <a 
                              onClick={() => setUserRoleFilter('shop_manager')} 
                              style={{ color: userRoleFilter === 'shop_manager' ? '#000' : '#2271b1', fontWeight: userRoleFilter === 'shop_manager' ? '600' : 'normal', cursor: 'pointer' }}
                            >
                              Shop Managers ({getRoleCount('shop_manager')})
                            </a> |
                          </span>
                          <span style={{ color: '#646970' }}>
                            <a 
                              onClick={() => setUserRoleFilter('contributor')} 
                              style={{ color: userRoleFilter === 'contributor' ? '#000' : '#2271b1', fontWeight: userRoleFilter === 'contributor' ? '600' : 'normal', cursor: 'pointer' }}
                            >
                              Contributors ({getRoleCount('contributor')})
                            </a> |
                          </span>
                          <span style={{ color: '#646970' }}>
                            <a 
                              onClick={() => setUserRoleFilter('customer')} 
                              style={{ color: userRoleFilter === 'customer' ? '#000' : '#2271b1', fontWeight: userRoleFilter === 'customer' ? '600' : 'normal', cursor: 'pointer' }}
                            >
                              Customers ({getRoleCount('customer')})
                            </a>
                          </span>
                        </div>

                        {/* List Users Grid Table */}
                        <table className="wp-list-table">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Phone</th>
                              <th style={{ textAlign: 'right', width: '100px' }}>Orders</th>
                              <th style={{ textAlign: 'right', width: '150px' }}>Total Spent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>No users found for this filter.</td>
                              </tr>
                            ) : (
                              filteredUsers.map((u) => {
                                const stats = getUserOrderStats(u);
                                return (
                                  <tr 
                                    key={u.uid} 
                                    className="wp-row-hover" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setSelectedUser({
                                        ...u,
                                        ...stats
                                      });
                                      setUserFormUsername(u.username || u.email.split('@')[0] || '');
                                      setUserFormEmail(u.email || '');
                                      setUserFormFirstName(u.firstName || '');
                                      setUserFormLastName(u.lastName || '');
                                      setUserFormPhone(u.phone || '');
                                      setUserFormAddress(u.address || '');
                                      setUserFormRole(u.role || 'customer');
                                      setUserFormPassword('');
                                    }}
                                  >
                                    <td style={{ fontWeight: 600, color: '#2271b1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: '28px', height: '28px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {u.avatarUrl ? (
                                          <img src={u.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <Users size={14} style={{ color: '#888' }} />
                                        )}
                                      </div>
                                      <span>{u.username || u.email.split('@')[0]}</span>
                                      {u.uid === 'avIScAH5NQMWN2zf6Z3YwEEQw302' && <span style={{ fontSize: '9px', background: '#e1f0fe', border: '1px solid #007cba', color: '#007cba', padding: '1px 6px', fontWeight: 'bold', textTransform: 'uppercase' }}>Super Admin</span>}
                                      {u.isGuest && <span style={{ fontSize: '9px', background: '#f0f0f1', padding: '1px 4px', color: '#646970', fontWeight: 'normal', textTransform: 'uppercase' }}>Guest</span>}
                                    </td>
                                    <td>{u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}</td>
                                    <td>{u.email}</td>
                                    <td style={{ fontWeight: 600 }}>{u.uid === 'avIScAH5NQMWN2zf6Z3YwEEQw302' ? 'Super Admin' : getRoleDisplay(u.role)}</td>
                                    <td>{u.phone || '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{stats.orderCount}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>KSh {stats.spent.toLocaleString()}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </>
                    );
                  })()}
                </div>
              )}
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
                          {isAdminLoading ? (
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '30px', width: '150px' }} />
                          ) : (
                            `KSh ${totalRevenue.toLocaleString()}`
                          )}
                        </div>
                      </div>
                      <div className="wp-postbox">
                        <h2 className="wp-postbox-title">Total Orders</h2>
                        <div className="wp-postbox-inside" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3338' }}>
                          {isAdminLoading ? (
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '30px', width: '50px' }} />
                          ) : (
                            orders.length
                          )}
                        </div>
                      </div>
                      <div className="wp-postbox">
                        <h2 className="wp-postbox-title">Average Order Value</h2>
                        <div className="wp-postbox-inside" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3338' }}>
                          {isAdminLoading ? (
                            <div className="skeleton-row-box skeleton-pulse" style={{ height: '30px', width: '150px' }} />
                          ) : (
                            `KSh ${averageOrder.toLocaleString()}`
                          )}
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
                            {isAdminLoading ? (
                              [1, 2, 3].map(n => (
                                <tr key={n}>
                                  <td><div className="skeleton-row-box skeleton-pulse" /></td>
                                  <td><div className="skeleton-row-box skeleton-pulse" style={{ textAlign: 'right' }} /></td>
                                  <td><div className="skeleton-row-box skeleton-pulse" style={{ textAlign: 'right' }} /></td>
                                </tr>
                              ))
                            ) : topSellers.length === 0 ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                {/* Left Panel: Form */}
                <div className="wp-postbox" style={{ margin: 0 }}>
                  <h2 className="wp-postbox-title">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <form onSubmit={handleSaveCategory} className="wp-postbox-inside" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Name</label>
                      <input 
                        type="text" 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px' }} 
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        placeholder="e.g. Mobility Support"
                        required
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#646970' }}>The name is how it appears on your site.</p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Description (Optional)</label>
                      <textarea 
                        rows={5}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical' }} 
                        value={catDesc}
                        onChange={e => setCatDesc(e.target.value)}
                        placeholder="Category description..."
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button type="submit" className="wp-button-primary" style={{ padding: '6px 12px' }}>
                        {editingCategory ? 'Update Category' : 'Add New Category'}
                      </button>
                      {editingCategory && (
                        <button 
                          type="button" 
                          className="wp-button-secondary" 
                          onClick={() => {
                            setEditingCategory(null);
                            setCatName('');
                            setCatDesc('');
                          }}
                          style={{ padding: '6px 12px' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Panel: Table */}
                <div>
                  <table className="wp-list-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Slug/ID</th>
                        <th style={{ textAlign: 'right', width: '80px' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isAdminLoading ? (
                        [1, 2, 3].map(n => (
                          <tr key={n}>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                          </tr>
                        ))
                      ) : categories.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No categories found.
                          </td>
                        </tr>
                      ) : (
                        categories.map(cat => {
                          const count = products.filter(p => (p.categories || [p.category]).includes(cat.name)).length;
                          return (
                            <tr key={cat.id} className="wp-row-hover">
                              <td>
                                <div style={{ fontWeight: 600, color: '#2271b1', fontSize: '14px' }}>{cat.name}</div>
                                <div className="wp-row-actions" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
                                  <button 
                                    type="button" 
                                    onClick={() => handleEditCategory(cat)}
                                    style={{ background: 'none', border: 'none', color: '#2271b1', cursor: 'pointer', padding: 0 }}
                                  >
                                    Edit
                                  </button>
                                  <span style={{ color: '#ddd' }}>|</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                    style={{ background: 'none', border: 'none', color: '#b32d2e', cursor: 'pointer', padding: 0 }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                              <td style={{ color: '#646970', fontSize: '13px' }}>{cat.description || '—'}</td>
                              <td style={{ fontStyle: 'italic', color: '#a7aaad', fontSize: '12px' }}>{cat.id}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{count}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Promos */}
          {activeTab === 'promos' && (
            <div>
              <h1 className="wp-admin-page-title">Promos</h1>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', alignItems: 'start' }}>
                {/* Left Panel: Form */}
                <div className="wp-postbox" style={{ margin: 0 }}>
                  <h2 className="wp-postbox-title">
                    {editingCoupon ? 'Edit Promo Code' : 'Add New Promo Code'}
                  </h2>
                  <form onSubmit={handleSaveCoupon} className="wp-postbox-inside" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Promo Code</label>
                      <input 
                        type="text" 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', textTransform: 'uppercase' }} 
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="e.g. GOLDENCARE"
                        required
                        disabled={!!editingCoupon}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#646970' }}>The code customer enters at checkout (alphanumeric, uppercase).</p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Discount Type</label>
                      <select 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', height: '32px' }}
                        value={couponType}
                        onChange={e => setCouponType(e.target.value as 'percent' | 'flat')}
                      >
                        <option value="percent">Percentage discount (%)</option>
                        <option value="flat">Fixed cart discount (KSh)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Discount Value</label>
                      <input 
                        type="number" 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px' }} 
                        value={couponVal || ''}
                        onChange={e => setCouponVal(Number(e.target.value))}
                        placeholder={couponType === 'percent' ? "e.g. 10" : "e.g. 500"}
                        required
                        min={1}
                      />
                    </div>

                    {/* Duration Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Start Date</label>
                        <input 
                          type="date" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', height: '32px' }} 
                          value={couponStartDate}
                          onChange={e => setCouponStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>End Date</label>
                        <input 
                          type="date" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', height: '32px' }} 
                          value={couponEndDate}
                          onChange={e => setCouponEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Customer Group targeting */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Target Customer Group</label>
                      <select 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', height: '32px' }}
                        value={couponGroup}
                        onChange={e => setCouponGroup(e.target.value as 'all' | 'new' | 'returning' | 'vip' | 'emails')}
                      >
                        <option value="all">All Customers</option>
                        <option value="new">New Customers (First order)</option>
                        <option value="returning">Returning Customers (1+ order)</option>
                        <option value="vip">VIP Customers (Spent KSh 50,000+)</option>
                        <option value="emails">Specific Customer Emails</option>
                      </select>
                    </div>

                    {couponGroup === 'emails' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Allowed Customer Emails</label>
                        <textarea 
                          rows={3}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical' }} 
                          value={couponEmails}
                          onChange={e => setCouponEmails(e.target.value)}
                          placeholder="customer1@gmail.com, customer2@yahoo.com"
                          required
                        />
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#646970' }}>Enter a comma-separated list of customer emails.</p>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Description (Optional)</label>
                      <textarea 
                        rows={3}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical' }} 
                        value={couponDesc}
                        onChange={e => setCouponDesc(e.target.value)}
                        placeholder="e.g. KSh 500 discount for new recovery equipment..."
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button type="submit" className="wp-button-primary" style={{ padding: '6px 12px' }}>
                        {editingCoupon ? 'Update Promo' : 'Save Promo'}
                      </button>
                      {editingCoupon && (
                        <button 
                          type="button" 
                          className="wp-button-secondary" 
                          onClick={() => {
                            setEditingCoupon(null);
                            setCouponCode('');
                            setCouponVal(0);
                            setCouponDesc('');
                            setCouponStartDate('');
                            setCouponEndDate('');
                            setCouponGroup('all');
                            setCouponEmails('');
                          }}
                          style={{ padding: '6px 12px' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Panel: Table */}
                <div>
                  <table className="wp-list-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Type / Discount</th>
                        <th>Targeting & Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isAdminLoading ? (
                        [1, 2, 3].map(n => (
                          <tr key={n}>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                            <td><div className="skeleton-row-box skeleton-pulse" /></td>
                          </tr>
                        ))
                      ) : coupons.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No promo codes found.
                          </td>
                        </tr>
                      ) : (
                        coupons.map(cp => {
                          const isPercent = cp.discountPercent > 0;
                          return (
                            <tr key={cp.code} className="wp-row-hover">
                              <td>
                                <div style={{ fontWeight: 600, color: '#2271b1', fontSize: '14px', letterSpacing: '0.5px' }}>{cp.code}</div>
                                <div className="wp-row-actions" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
                                  <button 
                                    type="button" 
                                    onClick={() => handleEditCoupon(cp)}
                                    style={{ background: 'none', border: 'none', color: '#2271b1', cursor: 'pointer', padding: 0 }}
                                  >
                                    Edit
                                  </button>
                                  <span style={{ color: '#ddd' }}>|</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteCoupon(cp.code)}
                                    style={{ background: 'none', border: 'none', color: '#b32d2e', cursor: 'pointer', padding: 0 }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                              <td style={{ color: '#646970', fontSize: '13px' }}>{cp.description || '—'}</td>
                              <td style={{ fontSize: '13px' }}>
                                <div style={{ fontWeight: 600 }}>
                                  {isPercent ? `${cp.discountPercent}%` : `KSh ${(cp.flatDiscount || 0).toLocaleString()}`}
                                </div>
                                <div style={{ fontSize: '11px', color: '#646970', marginTop: '2px' }}>
                                  {isPercent ? 'Percentage' : 'Fixed KSh'}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                  <strong>Group:</strong> <span style={{ textTransform: 'capitalize', color: cp.customerGroup && cp.customerGroup !== 'all' ? '#2271b1' : '#2c3338' }}>{cp.customerGroup || 'all'}</span>
                                  {cp.customerGroup === 'emails' && (
                                    <div style={{ fontSize: '11px', color: '#646970', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={cp.allowedEmails}>
                                      Emails: {cp.allowedEmails}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '4px', color: '#646970' }}>
                                  <strong>Start:</strong> {cp.startDate || 'Immediate'}<br />
                                  <strong>End:</strong> {cp.endDate || 'No expiration'}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Media Library */}
          {activeTab === 'media' && (
            <div>
              <h1 className="wp-admin-page-title">Media Library</h1>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Left panel: Upload & Media Grid */}
                <div>
                  {/* Upload box */}
                  <div className="wp-postbox" style={{ marginBottom: '20px' }}>
                    <h2 className="wp-postbox-title">Add New Media Asset</h2>
                    <div className="wp-postbox-inside" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Local File Upload */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#646970', marginBottom: '6px' }}>Upload local file:</label>
                        <input 
                          type="file" 
                          accept="image/*,video/*,application/pdf"
                          onChange={handleMediaLibraryUpload}
                          disabled={uploadingMedia}
                          style={{ fontSize: '12px' }}
                        />
                        {uploadingMedia && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-stone)', marginTop: '8px' }}>
                            <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={14} />
                            <span>Uploading to Cloudinary...</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#646970', fontWeight: 600 }}>
                        <span style={{ borderBottom: '1px solid #c3c4c7', flexGrow: 1 }} />
                        <span>OR ADD FROM URL</span>
                        <span style={{ borderBottom: '1px solid #c3c4c7', flexGrow: 1 }} />
                      </div>

                      {/* Add by URL */}
                      <form onSubmit={handleAddMediaUrl} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Asset Name</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="e.g. Walking cane side view" 
                              value={newMediaName}
                              onChange={e => setNewMediaName(e.target.value)}
                              style={{ borderRadius: 0, padding: '6px' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Asset Type</label>
                            <select 
                              className="form-input"
                              value={mediaUploadType}
                              onChange={e => setMediaUploadType(e.target.value as 'image' | 'video' | 'document' | 'url')}
                              style={{ borderRadius: 0, padding: '6px', height: '32px' }}
                            >
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="document">Document (PDF/etc)</option>
                              <option value="url">External Link/URL</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Asset Source URL</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="https://..." 
                            value={newMediaUrl}
                            onChange={e => setNewMediaUrl(e.target.value)}
                            style={{ borderRadius: 0, padding: '6px' }}
                          />
                        </div>

                        <button type="submit" className="wp-button-secondary" style={{ alignSelf: 'flex-start', minHeight: '30px' }}>
                          Add URL Asset
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Grid Container */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">All Media Assets ({mediaFiles.length})</h2>
                    <div className="wp-postbox-inside" style={{ minHeight: '300px' }}>
                      {isAdminLoading ? (
                        <div className="media-manager-grid">
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <div 
                              key={n} 
                              className="media-item-card skeleton-pulse" 
                              style={{ aspectRatio: '1/1', border: '1px solid #dcdcde' }} 
                            />
                          ))}
                        </div>
                      ) : mediaFiles.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '260px', color: '#a7aaad', fontStyle: 'italic' }}>
                          No assets in the media library yet.
                        </div>
                      ) : (
                        <div className="media-manager-grid">
                          {mediaFiles.map(file => {
                            const isSelected = selectedMedia?.id === file.id;
                            return (
                              <div 
                                key={file.id} 
                                className={`media-item-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedMedia(file)}
                              >
                                {file.type === 'image' ? (
                                  <img src={file.url} alt={file.name} className="media-item-thumbnail" />
                                ) : (
                                  <div className="media-item-icon-wrapper">
                                    {file.type === 'video' ? <Film size={32} /> : file.type === 'document' ? <FileText size={32} /> : <LinkIcon size={32} />}
                                    <span className="media-item-filename">{file.name}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right panel: Details Sidebar */}
                <div className="wp-postbox">
                  <h2 className="wp-postbox-title">Attachment Details</h2>
                  <div className="wp-postbox-inside">
                    {selectedMedia ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
                        <div style={{ width: '100%', aspectRatio: '4/3', border: '1px solid #c3c4c7', background: '#f0f0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {selectedMedia.type === 'image' ? (
                            <img src={selectedMedia.url} alt={selectedMedia.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#646970' }}>
                              {selectedMedia.type === 'video' ? <Film size={48} /> : selectedMedia.type === 'document' ? <FileText size={48} /> : <LinkIcon size={48} />}
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', wordBreak: 'break-all', marginBottom: '8px' }}>{selectedMedia.name}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px 8px', color: '#646970' }}>
                            <span>Type:</span><span style={{ textTransform: 'capitalize' }}>{selectedMedia.type}</span>
                            <span>Created:</span><span>{new Date(selectedMedia.createdAt).toLocaleDateString()}</span>
                            {selectedMedia.size && (
                              <>
                                <span>Size:</span>
                                <span>{(selectedMedia.size / 1024).toFixed(1)} KB</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontWeight: 600, color: '#646970' }}>Copy URL Link:</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input 
                              type="text" 
                              readOnly 
                              value={selectedMedia.url} 
                              style={{ flexGrow: 1, padding: '4px 6px', fontSize: '11px', border: '1px solid #c3c4c7', background: '#f6f7f7' }}
                              onClick={e => (e.target as HTMLInputElement).select()}
                            />
                            <button 
                              type="button" 
                              className="wp-button-secondary"
                              style={{ minHeight: '22px', fontSize: '11px', padding: '0 8px' }}
                              onClick={() => {
                                navigator.clipboard.writeText(selectedMedia.url);
                                setCopiedId(selectedMedia.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === selectedMedia.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>

                        <button 
                          type="button" 
                          className="wp-button-secondary"
                          style={{ color: '#b32d2e', borderColor: '#b32d2e', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => handleDeleteMedia(selectedMedia.id)}
                        >
                          <Trash2 size={14} />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: '#a7aaad', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
                        Select an asset to view its details.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: Slides Manager */}
          {activeTab === 'slides' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="wp-admin-page-title" style={{ margin: 0 }}>Homepage Slides</h1>
                <button 
                  type="button" 
                  className="wp-button-primary"
                  onClick={handleOpenAddSlide}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Add New Slide</span>
                </button>
              </div>

              <table className="wp-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Slide Image</th>
                    <th>Title & Description</th>
                    <th>Button Details</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Display Order</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdminLoading ? (
                    [1, 2].map(n => (
                      <tr key={n}>
                        <td><div className="skeleton-row-box skeleton-pulse" style={{ height: '40px', width: '80px' }} /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                        <td><div className="skeleton-row-box skeleton-pulse" /></td>
                      </tr>
                    ))
                  ) : slides.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                        No slides found. Click "Add New Slide" to create one.
                      </td>
                    </tr>
                  ) : (
                    slides.map(slide => (
                      <tr key={slide.id}>
                        <td>
                          <div style={{ width: '80px', aspectRatio: '16/9', border: '1px solid #c3c4c7', background: '#f0f0f1', overflow: 'hidden', position: 'relative' }}>
                            <img src={slide.image} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {slide.mediaType === 'video' && (
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                                <Film size={18} color="#fff" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{slide.title}</div>
                          <div style={{ fontSize: '11px', color: '#646970', marginTop: '2px', maxWidth: '400px' }}>{slide.description}</div>
                        </td>
                        <td>
                          {slide.buttonText ? (
                            <div style={{ fontSize: '12px' }}>
                              <strong>Label:</strong> {slide.buttonText} <br/>
                              <span style={{ fontSize: '11px', color: '#646970' }}><strong>Link:</strong> {slide.buttonLink}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#a7aaad', fontStyle: 'italic' }}>No action button</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{slide.order}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            type="button"
                            className="wp-button-secondary"
                            style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', marginRight: '6px' }}
                            onClick={() => handleOpenEditSlide(slide)}
                          >
                            Edit
                          </button>
                          <button 
                            type="button"
                            className="wp-button-secondary"
                            style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', color: '#b32d2e', borderColor: '#ffe3e3' }}
                            onClick={() => handleDeleteSlide(slide.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 12: Inventory & Procurement */}
          {activeTab === 'inventory' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h1 className="wp-admin-page-title" style={{ margin: 0 }}>Inventory Management</h1>
              </div>

              {/* Subsubsub links for Inventory */}
              <ul className="wp-subsubsub" style={{ marginBottom: '20px', display: 'flex', gap: '10px', listStyle: 'none', padding: 0 }}>
                <li>
                  <button 
                    type="button" 
                    onClick={() => setInventorySubTab('status')}
                    className={inventorySubTab === 'status' ? 'current' : ''}
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: inventorySubTab === 'status' ? '#000' : '#2271b1', fontWeight: inventorySubTab === 'status' ? '600' : 'normal', borderBottom: inventorySubTab === 'status' ? '2px solid #2271b1' : 'none', paddingBottom: '4px' }}
                  >
                    Stock Levels
                  </button>
                </li>
                <li style={{ color: '#c3c4c7' }}>|</li>
                <li>
                  <button 
                    type="button" 
                    onClick={() => setInventorySubTab('logs')}
                    className={inventorySubTab === 'logs' ? 'current' : ''}
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: inventorySubTab === 'logs' ? '#000' : '#2271b1', fontWeight: inventorySubTab === 'logs' ? '600' : 'normal', borderBottom: inventorySubTab === 'logs' ? '2px solid #2271b1' : 'none', paddingBottom: '4px' }}
                  >
                    Procurement &amp; Adjustment Logs
                  </button>
                </li>
                <li style={{ color: '#c3c4c7' }}>|</li>
                <li>
                  <button 
                    type="button" 
                    onClick={() => setInventorySubTab('suppliers')}
                    className={inventorySubTab === 'suppliers' ? 'current' : ''}
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: inventorySubTab === 'suppliers' ? '#000' : '#2271b1', fontWeight: inventorySubTab === 'suppliers' ? '600' : 'normal', borderBottom: inventorySubTab === 'suppliers' ? '2px solid #2271b1' : 'none', paddingBottom: '4px' }}
                  >
                    Suppliers
                  </button>
                </li>
              </ul>

              {inventorySubTab === 'status' && (
                <div className="wp-postbox" style={{ padding: '16px', background: '#fff' }}>
                  <table className="wp-list-table widefat fixed striped table-view-list posts" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '64px', padding: '10px' }}>Image</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Variant Options</th>
                        <th style={{ width: '150px', padding: '10px', textAlign: 'left' }}>SKU</th>
                        <th style={{ width: '100px', padding: '10px', textAlign: 'left' }}>Stock</th>
                        <th style={{ width: '120px', padding: '10px', textAlign: 'left' }}>Status</th>
                        <th style={{ width: '120px', padding: '10px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No products found in the database.
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const rows: React.ReactNode[] = [];
                          products.forEach(product => {
                            if (!product.variants || product.variants.length === 0) {
                              return;
                            }
                            product.variants.forEach(variant => {
                              rows.push(
                                <tr key={`${product.id}-${variant.id}`}>
                                  <td style={{ padding: '10px' }}>
                                    <img 
                                      src={variant.image || product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=80'} 
                                      alt={product.name} 
                                      style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid #c3c4c7', borderRadius: 0 }} 
                                    />
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{product.name}</div>
                                    <div style={{ fontSize: '11px', color: '#646970' }}>ID: {product.id}</div>
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px' }}>
                                    {Object.entries(variant.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard'}
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px', fontFamily: 'monospace' }}>
                                    {variant.sku || '—'}
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 600 }}>
                                    {variant.stock}
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                                    {variant.stock === 0 ? (
                                      <span style={{ display: 'inline-block', background: '#fcf0f1', border: '1px solid #d63638', color: '#d63638', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: 0 }}>Out of Stock</span>
                                    ) : variant.stock < 5 ? (
                                      <span style={{ display: 'inline-block', background: '#fdf7e7', border: '1px solid #dba617', color: '#dba617', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: 0 }}>Low Stock</span>
                                    ) : (
                                      <span style={{ display: 'inline-block', background: '#edfaef', border: '1px solid #00a32a', color: '#00a32a', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: 0 }}>In Stock</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', verticalAlign: 'middle', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      className="wp-button-secondary"
                                      style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', borderRadius: 0 }}
                                      onClick={() => {
                                        setSelectedProcurementVariant({ product, variant });
                                        setAdjType('restock');
                                        setAdjQty(0);
                                        setAdjSupplier('');
                                        setAdjInvoice('');
                                        setAdjCost(0);
                                        setAdjNotes('');
                                      }}
                                    >
                                      Adjust Stock
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          });
                          return rows.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                                No product variants found.
                              </td>
                            </tr>
                          ) : rows;
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {inventorySubTab === 'logs' && (
                <div className="wp-postbox" style={{ padding: '16px', background: '#fff' }}>
                  <table className="wp-list-table widefat fixed striped table-view-list posts" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', width: '140px' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Product / Variant</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>SKU</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '90px' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '80px' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>Supplier</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>Invoice/PO</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>Unit Cost</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>Total Cost</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>User</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '150px' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procurements.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                            No procurement or adjustment logs found.
                          </td>
                        </tr>
                      ) : (
                        procurements.map(log => (
                          <tr key={log.id}>
                            <td style={{ padding: '10px', fontSize: '12px', verticalAlign: 'middle' }}>
                              {new Date(log.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.productName}</div>
                              <div style={{ fontSize: '11px', color: '#646970' }}>{log.variantLabel}</div>
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '12px', fontFamily: 'monospace' }}>
                              {log.variantSku}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                              <span 
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  background: log.type === 'restock' ? '#edfaef' : '#fcf0f1',
                                  border: log.type === 'restock' ? '1px solid #00a32a' : '1px solid #d63638',
                                  color: log.type === 'restock' ? '#00a32a' : '#d63638',
                                  textTransform: 'uppercase',
                                  borderRadius: 0
                                }}
                              >
                                {log.type}
                              </span>
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontWeight: 'bold', color: log.quantity >= 0 ? '#00a32a' : '#d63638' }}>
                              {log.quantity >= 0 ? `+${log.quantity}` : log.quantity}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px' }}>
                              {log.supplierName || '—'}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px' }}>
                              {log.procurementInvoice || '—'}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px' }}>
                              {log.unitCost ? `KSh ${log.unitCost.toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 600 }}>
                              {log.unitCost && log.quantity > 0 ? `KSh ${(log.quantity * log.unitCost).toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '12px', color: '#646970' }}>
                              {log.actor.split('@')[0]}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'middle', fontSize: '12px', color: '#646970' }}>
                              {log.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* inventorySubTab === 'suppliers' view */}
              {inventorySubTab === 'suppliers' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                  {/* Left Panel: Form */}
                  <div className="wp-postbox" style={{ margin: 0 }}>
                    <h2 className="wp-postbox-title">
                      {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                    </h2>
                    <form onSubmit={handleSaveSupplier} className="wp-postbox-inside" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Supplier Name *</label>
                        <input 
                          type="text" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }} 
                          value={supName}
                          onChange={e => setSupName(e.target.value)}
                          placeholder="e.g. Acme MedSupply Ltd"
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Contact Person</label>
                        <input 
                          type="text" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }} 
                          value={supContact}
                          onChange={e => setSupContact(e.target.value)}
                          placeholder="e.g. John Doe"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Email</label>
                        <input 
                          type="email" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }} 
                          value={supEmail}
                          onChange={e => setSupEmail(e.target.value)}
                          placeholder="e.g. contact@acme.com"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Phone</label>
                        <input 
                          type="text" 
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }} 
                          value={supPhone}
                          onChange={e => setSupPhone(e.target.value)}
                          placeholder="e.g. +254 712 345678"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Address</label>
                        <textarea 
                          rows={3}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical', borderRadius: 0 }} 
                          value={supAddress}
                          onChange={e => setSupAddress(e.target.value)}
                          placeholder="Supplier street address or warehouse location..."
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button type="submit" className="wp-button-primary" style={{ padding: '6px 12px', borderRadius: 0 }} disabled={isLoading}>
                          {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                        </button>
                        {editingSupplier && (
                          <button 
                            type="button" 
                            className="wp-button-secondary" 
                            style={{ padding: '6px 12px', borderRadius: 0 }}
                            onClick={() => {
                              setEditingSupplier(null);
                              setSupName('');
                              setSupContact('');
                              setSupEmail('');
                              setSupPhone('');
                              setSupAddress('');
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right Panel: Suppliers Table */}
                  <div className="wp-postbox" style={{ margin: 0, padding: '16px', background: '#fff' }}>
                    <table className="wp-list-table widefat fixed striped table-view-list posts" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Supplier Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '220px' }}>Contact Details</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Address</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>Created</th>
                          <th style={{ padding: '10px', textAlign: 'right', width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#a7aaad' }}>
                              No suppliers added yet. Fill out the form on the left to add your first supplier.
                            </td>
                          </tr>
                        ) : (
                          suppliers.map(s => (
                            <tr key={s.id}>
                              <td style={{ padding: '10px', verticalAlign: 'top', fontWeight: 600, fontSize: '13px' }}>
                                {s.name}
                              </td>
                              <td style={{ padding: '10px', verticalAlign: 'top', fontSize: '12px', lineHeight: '1.5' }}>
                                {s.contactPerson && <div><strong>Person:</strong> {s.contactPerson}</div>}
                                {s.email && <div><strong>Email:</strong> {s.email}</div>}
                                {s.phone && <div><strong>Phone:</strong> {s.phone}</div>}
                                {!s.contactPerson && !s.email && !s.phone && <span style={{ color: '#a7aaad', fontStyle: 'italic' }}>No details provided</span>}
                              </td>
                              <td style={{ padding: '10px', verticalAlign: 'top', fontSize: '12px' }}>
                                {s.address || <span style={{ color: '#a7aaad', fontStyle: 'italic' }}>—</span>}
                              </td>
                              <td style={{ padding: '10px', verticalAlign: 'top', fontSize: '12px' }}>
                                {new Date(s.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '10px', verticalAlign: 'top', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="wp-button-secondary"
                                  style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', marginRight: '6px', borderRadius: 0 }}
                                  onClick={() => handleEditSupplierClick(s)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="wp-button-secondary"
                                  style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', color: '#b32d2e', borderColor: '#ffe3e3', borderRadius: 0 }}
                                  onClick={() => handleDeleteSupplierClick(s.id, s.name)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
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

      {/* MODAL: Stock Adjustment */}
      {selectedProcurementVariant && (
        <div className="modal-overlay" onClick={() => setSelectedProcurementVariant(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0, border: '1px solid #c3c4c7', borderRadius: 0 }}>
            <div style={{ borderBottom: '1px solid #c3c4c7', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f7f7' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Adjust Stock Level</h3>
              <button className="modal-close" onClick={() => setSelectedProcurementVariant(null)} style={{ position: 'static', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} style={{ padding: '20px' }}>
              {/* Product Variant Details */}
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f6f7f7', border: '1px solid #dcdcde' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{selectedProcurementVariant.product.name}</div>
                <div style={{ fontSize: '12px', color: '#646970' }}>
                  <strong>Options:</strong> {Object.entries(selectedProcurementVariant.variant.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard'}<br/>
                  <strong>SKU:</strong> {selectedProcurementVariant.variant.sku || 'N/A'} | <strong>Current Stock:</strong> {selectedProcurementVariant.variant.stock}
                </div>
              </div>

              {/* Adjustment Type */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '8px' }}>Adjustment Type</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="radio" 
                      name="adjType" 
                      value="restock"
                      checked={adjType === 'restock'}
                      onChange={() => setAdjType('restock')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Restock / Procurement (Addition)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="radio" 
                      name="adjType" 
                      value="correction"
                      checked={adjType === 'correction'}
                      onChange={() => setAdjType('correction')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Manual Correction (Deduction)</span>
                  </label>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Quantity</label>
                <input 
                  type="number"
                  min={1}
                  required
                  value={adjQty || ''}
                  onChange={e => setAdjQty(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }}
                  placeholder="e.g. 10"
                />
              </div>

              {/* Restock Specific Fields */}
              {adjType === 'restock' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Supplier Name</label>
                    {suppliers.length === 0 ? (
                      <div style={{ color: '#d63638', fontSize: '12px', marginTop: '4px', border: '1px solid #d63638', padding: '8px', background: '#fcf0f1' }}>
                        No suppliers found in the database. Please add a supplier under <strong>Inventory &gt; Suppliers</strong> first.
                      </div>
                    ) : (
                      <select
                        required
                        value={adjSupplier}
                        onChange={e => setAdjSupplier(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0, background: '#fff', height: '32px' }}
                      >
                        <option value="">-- Select a Supplier --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Supplier Invoice / PO #</label>
                    <input 
                      type="text"
                      required
                      value={adjInvoice}
                      onChange={e => setAdjInvoice(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }}
                      placeholder="e.g. PO-99882"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>Unit Cost (KSh)</label>
                    <input 
                      type="number"
                      min={0.01}
                      step="any"
                      required
                      value={adjCost || ''}
                      onChange={e => setAdjCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', borderRadius: 0 }}
                      placeholder="e.g. 4500"
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1d2327', marginBottom: '6px' }}>
                  {adjType === 'correction' ? 'Reason for Adjustment (Required)' : 'Notes / Remarks (Optional)'}
                </label>
                <textarea 
                  rows={3}
                  required={adjType === 'correction'}
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical', borderRadius: 0 }}
                  placeholder={adjType === 'correction' ? "Reason for correction (e.g. Damaged inventory, shipping discrepancy)..." : "Additional remarks..."}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #c3c4c7', paddingTop: '15px' }}>
                <button 
                  type="button" 
                  className="wp-button-secondary" 
                  onClick={() => setSelectedProcurementVariant(null)}
                  style={{ borderRadius: 0 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="wp-button-primary" 
                  disabled={isLoading}
                  style={{ borderRadius: 0 }}
                >
                  {isLoading ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
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
                    {prodAttrs.length > 0 && (
                      <button 
                        type="button" 
                        className={`wp-metabox-tab ${editorTab === 'variations' ? 'active' : ''}`}
                        onClick={() => setEditorTab('variations')}
                      >
                        Variations ({prodVariants.length})
                      </button>
                    )}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '15px' }}>
                          <label style={{ width: '160px', fontWeight: 600 }}>Tax Class:</label>
                          <select 
                            style={{ width: '200px', padding: '5px 8px', border: '1px solid #c3c4c7' }}
                            value={prodTaxClassId}
                            onChange={e => setProdTaxClassId(e.target.value)}
                          >
                            <option value="">Default Store Rate</option>
                            {taxClasses && taxClasses.map(tc => (
                              <option key={tc.id} value={tc.id}>{tc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '15px' }}>
                          <label style={{ width: '160px', fontWeight: 600 }}>Featured Product:</label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={prodIsFeatured}
                              onChange={e => setProdIsFeatured(e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>Highlight this product on homepage and top of shop page</span>
                          </label>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 1.2fr 1.5fr', gap: '10px', fontWeight: 600, borderBottom: '1px solid #c3c4c7', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span>Option Combination</span>
                              <span>Price (KSh)</span>
                              <span>Stock</span>
                              <span>SKU</span>
                              <span>Tax Class</span>
                              <span>Image (Optional)</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                              {prodVariants.map((v, idx) => {
                                const label = Object.values(v.options).join(' / ');
                                return (
                                  <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 1.2fr 1.5fr', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={label}>{label}</span>
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
                                    <select
                                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #c3c4c7', boxSizing: 'border-box' }}
                                      value={v.taxClassId || ''}
                                      onChange={e => handleVariantFieldChange(idx, 'taxClassId', e.target.value)}
                                    >
                                      <option value="">Default Store Rate</option>
                                      {taxClasses && taxClasses.map(tc => (
                                        <option key={tc.id} value={tc.id}>{tc.name}</option>
                                      ))}
                                    </select>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      <input 
                                        type="text" 
                                        placeholder="Image URL"
                                        style={{ flexGrow: 1, padding: '4px 6px', border: '1px solid #c3c4c7', fontSize: '11px', boxSizing: 'border-box' }}
                                        value={v.image || ''} 
                                        onChange={e => handleVariantFieldChange(idx, 'image', e.target.value)}
                                      />
                                      <button 
                                        type="button" 
                                        className="wp-button-secondary"
                                        onClick={() => {
                                          setMediaModalTarget(`variant-image-${idx}`);
                                          setSelectedMedia(null);
                                          setMediaModalOpen(true);
                                        }}
                                        style={{ padding: '4px 6px', fontSize: '11px', minHeight: 'auto', height: '24px', whiteSpace: 'nowrap' }}
                                      >
                                        Choose
                                      </button>
                                    </div>
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

                  {/* Categories Metabox (Multi-select Checkboxes) */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Categories</h2>
                    <div className="wp-postbox-inside">
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #c3c4c7', padding: '8px', marginBottom: '6px' }}>
                        {categories.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: '#a7aaad', fontStyle: 'italic' }}>No categories available.</p>
                        ) : (
                          categories.map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', fontSize: '13px', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={prodCats.includes(c.name)}
                                onChange={() => {
                                  if (prodCats.includes(c.name)) {
                                    setProdCats(prodCats.filter(cat => cat !== c.name));
                                  } else {
                                    setProdCats([...prodCats, c.name]);
                                  }
                                }}
                              />
                              {c.name}
                            </label>
                          ))
                        )}
                      </div>
                      {prodCats.length === 0 && (
                        <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#d63638' }}>Select at least one category.</p>
                      )}
                      <p style={{ margin: '0', fontSize: '11px', color: '#646970' }}>
                        Manage categories on the <a href="#" onClick={(e) => { e.preventDefault(); setProductModalOpen(false); navigate('/dashboard/categories'); }} style={{ color: '#2271b1', textDecoration: 'none' }}>Categories page</a>.
                      </p>
                    </div>
                  </div>

                  {/* Product Tags Metabox */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Tags</h2>
                    <div className="wp-postbox-inside">
                      {prodTags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {prodTags.map(tag => (
                            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '12px', background: '#f0f2f5', border: '1px solid #c3c4c7', fontWeight: 500 }}>
                              {tag}
                              <button 
                                type="button" 
                                onClick={() => setProdTags(prodTags.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b32d2e', fontWeight: 'bold', fontSize: '13px', padding: 0, lineHeight: 1 }}
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input 
                          type="text" 
                          placeholder="Add tags (comma-separated)"
                          style={{ flexGrow: 1, padding: '5px 8px', border: '1px solid #c3c4c7', boxSizing: 'border-box', fontSize: '12px' }}
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newTags = newTagInput.split(',').map(t => t.trim()).filter(t => t && !prodTags.includes(t));
                              if (newTags.length > 0) {
                                setProdTags([...prodTags, ...newTags]);
                                setNewTagInput('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button" 
                          className="wp-button-secondary"
                          style={{ minHeight: '26px', padding: '0 8px', fontSize: '12px' }}
                          onClick={() => {
                            const newTags = newTagInput.split(',').map(t => t.trim()).filter(t => t && !prodTags.includes(t));
                            if (newTags.length > 0) {
                              setProdTags([...prodTags, ...newTags]);
                              setNewTagInput('');
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#646970' }}>Separate tags with commas.</p>
                    </div>
                  </div>

                  {/* Main Product Image Metabox */}
                  <div className="wp-postbox">
                    <h2 className="wp-postbox-title">Product Image</h2>
                    <div className="wp-postbox-inside">
                      {prodImg ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '1px solid #c3c4c7', marginBottom: '10px', background: '#fafafa', overflow: 'hidden' }}>
                          {isVideoUrl(prodImg) ? (
                            getVideoEmbedUrl(prodImg) ? (
                              <iframe src={getVideoEmbedUrl(prodImg) || ''} style={{ width: '100%', height: '100%', border: 'none' }} title="product video" allow="autoplay" />
                            ) : (
                              <video src={prodImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                            )
                          ) : (
                            <img src={prodImg} alt="product main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
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
                      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          style={{ fontSize: '12px', cursor: 'pointer', maxWidth: '140px' }}
                        />
                        <button
                          type="button"
                          className="wp-button-secondary"
                          style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', flexShrink: 0 }}
                          onClick={() => {
                            setMediaModalTarget('product-main');
                            setMediaModalOpen(true);
                          }}
                        >
                          Choose from Library
                        </button>
                      </div>
                      
                      {/* Paste main image/video URL */}
                      <input 
                        type="text" 
                        placeholder="Or paste image/video URL"
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
                              {isVideoUrl(imgUrl) ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1d2327', color: '#fff' }}>
                                  <Film size={20} />
                                </div>
                              ) : (
                                <img src={imgUrl} alt={`gallery-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              <button 
                                type="button" 
                                onClick={() => setProdGallery(prev => prev.filter((_, i) => i !== index))}
                                style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(179, 45, 46, 0.9)', color: '#fff', border: 'none', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, fontSize: '9px', fontWeight: 'bold' }}
                                title="Remove"
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
                      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#646970', marginBottom: '4px' }}>Upload Gallery Images:</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            onChange={handleGalleryImagesUpload}
                            disabled={uploadingImage}
                            style={{ fontSize: '12px', cursor: 'pointer', maxWidth: '140px' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="wp-button-secondary"
                          style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px', flexShrink: 0, marginTop: '14px' }}
                          onClick={() => {
                            setMediaModalTarget('product-gallery');
                            setMediaModalOpen(true);
                          }}
                        >
                          Choose from Library
                        </button>
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

      {/* MODAL: Slide Editor */}
      {slideModalOpen && (
        <div className="modal-overlay" onClick={() => setSlideModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: 0, border: '1px solid #c3c4c7', borderRadius: '0' }}>
            <div style={{ borderBottom: '1px solid #c3c4c7', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f7f7' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                {editingSlide ? 'Edit Homepage Slide' : 'Add New Homepage Slide'}
              </h3>
              <button type="button" className="modal-close" onClick={() => setSlideModalOpen(false)} style={{ position: 'static', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSlideSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Media Type Toggle */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Media Type</label>
                  <div style={{ display: 'flex', gap: '0', marginTop: '6px' }}>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #c3c4c7', cursor: 'pointer', background: slideMediaType === 'image' ? '#2271b1' : '#f6f7f7', color: slideMediaType === 'image' ? '#fff' : '#1d2327' }}
                      onClick={() => setSlideMediaType('image')}
                    >
                      Image
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #c3c4c7', borderLeft: 'none', cursor: 'pointer', background: slideMediaType === 'video' ? '#2271b1' : '#f6f7f7', color: slideMediaType === 'video' ? '#fff' : '#1d2327' }}
                      onClick={() => setSlideMediaType('video')}
                    >
                      Video
                    </button>
                  </div>
                </div>

                {/* Image URL with Media Library picker */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Background Image URL {slideMediaType === 'video' ? '(Poster/Fallback)' : ''}</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="https://..." 
                      value={slideImage}
                      onChange={e => setSlideImage(e.target.value)}
                      required
                      style={{ flexGrow: 1, borderRadius: 0 }}
                    />
                    <button
                      type="button"
                      className="wp-button-secondary"
                      onClick={() => {
                        setMediaModalTarget('slide-image');
                        setMediaModalOpen(true);
                      }}
                      style={{ minHeight: '30px', flexShrink: 0 }}
                    >
                      Choose Media
                    </button>
                  </div>
                  {slideImage && slideMediaType === 'image' && (
                    <div style={{ marginTop: '8px', width: '100%', aspectRatio: '16/9', border: '1px solid #c3c4c7', overflow: 'hidden' }}>
                      <img src={slideImage} alt="slide preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                {/* Video URL (only when video type) */}
                {slideMediaType === 'video' && (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Video URL (YouTube / Vimeo / Direct)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." 
                        value={slideVideoUrl}
                        onChange={e => setSlideVideoUrl(e.target.value)}
                        required
                        style={{ flexGrow: 1, borderRadius: 0 }}
                      />
                      <button
                        type="button"
                        className="wp-button-secondary"
                        onClick={() => {
                          setMediaModalTarget('slide-video');
                          setMediaModalOpen(true);
                        }}
                        style={{ minHeight: '30px', flexShrink: 0 }}
                      >
                        Choose Media
                      </button>
                    </div>
                    {slideVideoUrl && (
                      <div style={{ marginTop: '8px', width: '100%', aspectRatio: '16/9', border: '1px solid #c3c4c7', overflow: 'hidden', background: '#000' }}>
                        {getVideoEmbedUrl(slideVideoUrl) ? (
                          <iframe src={getVideoEmbedUrl(slideVideoUrl) || ''} style={{ width: '100%', height: '100%', border: 'none' }} title="slide video preview" allow="autoplay" />
                        ) : (
                          <video src={slideVideoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Slide Title (Typography)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. WELLNESS REDEFINED." 
                    value={slideTitle}
                    onChange={e => setSlideTitle(e.target.value)}
                    required
                    style={{ borderRadius: 0, marginTop: '6px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Slide description text..." 
                    value={slideDescription}
                    onChange={e => setSlideDescription(e.target.value)}
                    style={{ borderRadius: 0, marginTop: '6px', height: '80px', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Button Label</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. SHOP MOBILITY" 
                      value={slideButtonText}
                      onChange={e => setSlideButtonText(e.target.value)}
                      style={{ borderRadius: 0, marginTop: '6px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Button Link URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. /shop" 
                      value={slideButtonLink}
                      onChange={e => setSlideButtonLink(e.target.value)}
                      style={{ borderRadius: 0, marginTop: '6px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Slide Sorting Order Index</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={slideOrder}
                    onChange={e => setSlideOrder(Number(e.target.value))}
                    required
                    style={{ borderRadius: 0, marginTop: '6px', width: '100px' }}
                  />
                </div>

              </div>

              <div style={{ padding: '15px 20px', borderTop: '1px solid #c3c4c7', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f6f7f7' }}>
                <button type="button" className="wp-button-secondary" onClick={() => setSlideModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="wp-button-primary">
                  Save Slide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Media Library Selector popup picker */}
      {mediaModalOpen && (
        <div className="modal-overlay" onClick={() => { setMediaModalOpen(false); setMediaModalTarget(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', height: '80vh', padding: 0, border: '1px solid #c3c4c7', borderRadius: '0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid #c3c4c7', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f7f7' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                Select Media Asset {mediaModalTarget === 'product-gallery' ? '(Gallery Selection)' : ''}
              </h3>
              <button type="button" className="modal-close" onClick={() => { setMediaModalOpen(false); setMediaModalTarget(null); }} style={{ position: 'static', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Tabs & Content split */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: mediaFiles.length > 0 ? '3fr 1.2fr' : '1fr', gap: '20px' }}>
              {/* Media gallery grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Upload inside modal shortcut */}
                <div style={{ background: '#f6f7f7', border: '1px solid #c3c4c7', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#646970', marginRight: '8px' }}>Upload new file:</label>
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      onChange={handleMediaLibraryUpload}
                      disabled={uploadingMedia}
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                  {uploadingMedia && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-stone)' }}>
                      <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={12} />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>

                {mediaFiles.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#a7aaad', fontStyle: 'italic' }}>
                    No media assets available. Upload one above first!
                  </div>
                ) : (
                  <div className="media-manager-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                    {mediaFiles.map(file => {
                      const isSelected = selectedMedia?.id === file.id;
                      return (
                        <div 
                          key={file.id} 
                          className={`media-item-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMedia(file)}
                          style={{ aspectRatio: '1/1' }}
                        >
                          {file.type === 'image' ? (
                            <img src={file.url} alt={file.name} className="media-item-thumbnail" />
                          ) : file.type === 'video' ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1d2327', color: '#fff', gap: '4px' }}>
                              <Film size={24} />
                              <span style={{ fontSize: '9px', textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>{file.name}</span>
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', color: '#646970', gap: '4px' }}>
                              <FileText size={24} />
                              <span style={{ fontSize: '9px', textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>{file.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar Detail (Only show if media selected) */}
              {mediaFiles.length > 0 && (
                <div style={{ borderLeft: '1px solid #c3c4c7', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px' }}>
                  <h4 style={{ margin: '0 0 6px 0', textTransform: 'uppercase', color: '#646970', letterSpacing: '0.5px' }}>Asset Details</h4>
                  {selectedMedia ? (
                    <>
                      <div style={{ width: '100%', aspectRatio: '4/3', border: '1px solid #c3c4c7', overflow: 'hidden', background: '#f0f0f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedMedia.type === 'video' ? (
                          isVideoUrl(selectedMedia.url) && getVideoEmbedUrl(selectedMedia.url) ? (
                            <iframe src={getVideoEmbedUrl(selectedMedia.url) || ''} style={{ width: '100%', height: '100%', border: 'none' }} title="preview" allow="autoplay" />
                          ) : (
                            <video src={selectedMedia.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
                          )
                        ) : selectedMedia.type === 'image' ? (
                          <img src={selectedMedia.url} alt="detail preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#646970' }}>
                            <FileText size={32} />
                            <span style={{ fontSize: '11px' }}>{selectedMedia.name}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{selectedMedia.name}</div>
                      <div>Type: {selectedMedia.type}</div>
                      <div>Created: {new Date(selectedMedia.createdAt).toLocaleDateString()}</div>
                    </>
                  ) : (
                    <div style={{ color: '#a7aaad', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>
                      Click on a media card to view details and select.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #c3c4c7', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f6f7f7' }}>
              <button 
                type="button" 
                className="wp-button-secondary" 
                onClick={() => { setMediaModalOpen(false); setMediaModalTarget(null); }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="wp-button-primary" 
                disabled={!selectedMedia}
                onClick={() => {
                  if (selectedMedia) {
                    handleSelectMedia(selectedMedia.url);
                  }
                }}
              >
                Insert Selected URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Enrollment Modal */}
      {mfaEnrollmentOpen && (
        <div className="modal-overlay" style={{ zIndex: 3500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', borderRadius: '4px', border: '1px solid #c3c4c7', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #c3c4c7', background: '#f6f7f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>
                Set up Two-Factor Authentication
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  if (mfaModalStep === 'recovery' && !downloadedCodes) {
                    alert("Please download or save your recovery codes first.");
                    return;
                  }
                  setMfaEnrollmentOpen(false);
                }} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#646970' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {mfaError && (
                <div style={{ backgroundColor: '#fcf0f1', borderLeft: '4px solid #d30005', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#d30005' }}>
                  {mfaError}
                </div>
              )}

              {/* STEP 0: Unverified Email Warning */}
              {mfaModalStep === 'unverified' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Your email address must be verified before you can enroll in Two-Factor Authentication. This is a security requirement to prevent lockout.
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 20px' }}>
                    Current Email: {auth.currentUser?.email}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button" 
                      className="wp-button-primary"
                      onClick={handleSendVerificationEmail}
                      disabled={mfaLoading}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {mfaLoading ? 'Sending...' : 'Send Verification Email'}
                    </button>
                    
                    <button 
                      type="button" 
                      className="wp-button-secondary"
                      onClick={handleCheckVerificationStatus}
                      disabled={mfaLoading}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Check Verification Status
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #c3c4c7' }}>
                    <button 
                      type="button" 
                      className="wp-button-secondary"
                      onClick={() => setMfaEnrollmentOpen(false)}
                      disabled={mfaLoading}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: Re-authenticate */}
              {mfaModalStep === 'password' && (
                <form onSubmit={handleVerifyPasswordStep}>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    To enable 2FA, please verify your identity by entering your administrator password.
                  </p>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
                      Password:
                    </label>
                    <input 
                      type="password" 
                      style={{ width: '100%', padding: '8px', border: '1px solid #c3c4c7', fontSize: '13px' }}
                      value={mfaPassword}
                      onChange={e => setMfaPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="wp-button-secondary"
                      onClick={() => setMfaEnrollmentOpen(false)}
                      disabled={mfaLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="wp-button-primary"
                      disabled={mfaLoading || !mfaPassword}
                    >
                      {mfaLoading ? 'Verifying...' : 'Next'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Scan QR */}
              {mfaModalStep === 'scan' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    Scan this QR code with your authenticator app (e.g. Google Authenticator or Microsoft Authenticator).
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', padding: '16px', background: '#fff', border: '1px solid #c3c4c7', borderRadius: '4px' }}>
                    {totpQrUrl && <QRCodeSVG value={totpQrUrl} size={200} />}
                  </div>
                  <div style={{ backgroundColor: '#f0f0f1', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '12px', wordBreak: 'break-all' }}>
                    <strong>Manual entry key:</strong> <code style={{ userSelect: 'all', display: 'block', marginTop: '4px', background: '#fff', padding: '4px 6px', border: '1px solid #c3c4c7' }}>{totpSecret?.secretKey}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="wp-button-primary"
                      onClick={() => setMfaModalStep('recovery')}
                    >
                      Next: Recovery Codes &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Recovery Codes */}
              {mfaModalStep === 'recovery' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    These recovery codes allow you to access your account if you lose your device. Each code can be used <strong>only once</strong>. Keep them safe.
                  </p>
                  <div style={{ 
                    maxHeight: '160px', 
                    overflowY: 'auto', 
                    border: '1px solid #c3c4c7', 
                    background: '#f6f7f7', 
                    padding: '12px', 
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px'
                  }}>
                    {generatedCodes.map((c, i) => (
                      <div key={c}>{i + 1}. <strong>{c}</strong></div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="wp-button-secondary"
                      onClick={handleDownloadRecoveryCodes}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      Download Codes (.txt)
                    </button>
                    {downloadedCodes ? (
                      <span style={{ fontSize: '12px', color: 'green', fontWeight: 600 }}>✓ Downloaded</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#d30005', fontWeight: 600 }}>⚠ Download required</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="wp-button-primary"
                      onClick={() => setMfaModalStep('verify')}
                      disabled={!downloadedCodes}
                    >
                      Next: Verify Authenticator &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Verify Code */}
              {mfaModalStep === 'verify' && (
                <form onSubmit={handleVerifyTotpStep}>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    Enter the 6-digit verification code from your authenticator app to complete the setup.
                  </p>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
                      Verification Code:
                    </label>
                    <input 
                      type="text" 
                      maxLength={6}
                      style={{ width: '100%', padding: '8px', border: '1px solid #c3c4c7', fontSize: '13px', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                      value={totpVerificationCode}
                      onChange={e => setTotpVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="wp-button-secondary"
                      onClick={() => setMfaModalStep('recovery')}
                      disabled={mfaLoading}
                    >
                      &larr; Back
                    </button>
                    <button 
                      type="submit" 
                      className="wp-button-primary"
                      disabled={mfaLoading || totpVerificationCode.length !== 6}
                    >
                      {mfaLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import UploadCSV from '@/components/UploadCSV';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon,
  Package,
  X,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_NAME_MAX_LENGTH = 15;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  
  // Search & Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('expiration');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    expirationDate: null,
    category: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('sortBy', sortBy);
      
      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, sortBy]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/products/dashboard');
      setAlerts(response.data.recentAlerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchAlerts();
  }, [fetchProducts, fetchCategories, fetchAlerts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
    setSearchParams(params);
  }, [search, statusFilter, categoryFilter, setSearchParams]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    const productName = formData.name.trim();
    
    if (!productName || !formData.expirationDate || !formData.category) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (productName.length > PRODUCT_NAME_MAX_LENGTH) {
      setFormError(`Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or less.`);
      return;
    }

    if (isExpiredExpirationDate(formData.expirationDate)) {
      setFormError('Your product is expired. Please select a future expiration date.');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/products', {
        ...formData,
        name: productName,
        expirationDate: format(formData.expirationDate, 'yyyy-MM-dd')
      });
      setIsAddModalOpen(false);
      setFormData({ name: '', quantity: 1, expirationDate: null, category: '' });
      fetchProducts();
      fetchCategories();
      fetchAlerts();
    } catch (error) {
      setFormError(error.response?.data?.error || error.response?.data?.detail || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    const productName = formData.name.trim();
    
    if (!productName || !formData.expirationDate || !formData.category) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (productName.length > PRODUCT_NAME_MAX_LENGTH) {
      setFormError(`Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or less.`);
      return;
    }

    if (isExpiredExpirationDate(formData.expirationDate)) {
      setFormError('Your product is expired. Please select a future expiration date.');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.patch(`/products/${selectedProduct._id}`, {
        ...formData,
        name: productName,
        expirationDate: format(formData.expirationDate, 'yyyy-MM-dd')
      });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchAlerts();
    } catch (error) {
      setFormError(error.response?.data?.error || error.response?.data?.detail || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/products/${selectedProduct._id}`);
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchAlerts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity,
      expirationDate: new Date(product.expirationDate),
      category: product.category
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Safe':
        return <Badge className="status-safe border">Safe</Badge>;
      case 'Near Expiry':
        return <Badge className="status-warning border">Near Expiry</Badge>;
      case 'Expired':
        return <Badge className="status-expired border">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isExpiredExpirationDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(date);
    expDate.setHours(0, 0, 0, 0);
    return expDate <= today;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSortBy('expiration');
  };

  const hasActiveFilters =
    search ||
    (statusFilter && statusFilter !== 'all') ||
    (categoryFilter && categoryFilter !== 'all');

  return (
    <Layout notifications={alerts}>
      <div className="space-y-6 animate-fade-in" data-testid="products-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your inventory and track expirations</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => { 
                setFormData({ name: '', quantity: 1, expirationDate: null, category: '' }); 
                setFormError(''); 
                setIsAddModalOpen(true); 
              }}
              data-testid="add-product-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>

            <UploadCSV 
              onSuccess={() => {
                alert('Products uploaded successfully!');
                fetchProducts();
              }}
              onError={(error) => {
                alert('Upload failed: ' + error);
              }}
            >
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                Upload CSV
              </Button>
            </UploadCSV>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="alerts">Alerts</SelectItem>
                  <SelectItem value="Safe">Safe</SelectItem>
                  <SelectItem value="Near Expiry">Near Expiry</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* Category filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-40" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-44" data-testid="sort-select">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiration">Expiration (Nearest)</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="lg:w-auto" data-testid="clear-filters">
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-muted-foreground mt-1">
                {hasActiveFilters 
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first product'}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setIsAddModalOpen(true)} data-testid="add-first-product">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product, index) => (
              <Card 
                key={product.id} 
                className="hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`product-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    {getStatusBadge(product.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{product.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <span className={cn(
                        "font-medium",
                        product.status === 'Expired' && 'text-red-600 dark:text-red-400',
                        product.status === 'Near Expiry' && 'text-amber-600 dark:text-amber-400'
                      )}>
                        {format(new Date(product.expirationDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {product.updatedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-xs">{format(new Date(product.updatedAt), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditModal(product)}
                      data-testid={`edit-product-${index}`}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteModal(product)}
                      data-testid={`delete-product-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Product Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Product</DialogTitle>
              <DialogDescription>Add a new product to track its expiration date.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={PRODUCT_NAME_MAX_LENGTH}
                  placeholder="e.g., Milk, Bread, Yogurt"
                  data-testid="product-name-input"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.name.length}/{PRODUCT_NAME_MAX_LENGTH}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    data-testid="product-quantity-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Dairy, Bakery"
                    list="categories"
                    data-testid="product-category-input"
                  />
                  <datalist id="categories">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expiration Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expirationDate && "text-muted-foreground"
                      )}
                      data-testid="expiration-date-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expirationDate ? format(formData.expirationDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.expirationDate}
                      onSelect={(date) => setFormData({ ...formData, expirationDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} data-testid="submit-add-product">
                  {submitting ? 'Adding...' : 'Add Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Edit Product</DialogTitle>
              <DialogDescription>Update the product details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProduct} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={PRODUCT_NAME_MAX_LENGTH}
                  data-testid="edit-product-name-input"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.name.length}/{PRODUCT_NAME_MAX_LENGTH}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity *</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    data-testid="edit-product-quantity-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Input
                    id="edit-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    list="edit-categories"
                    data-testid="edit-product-category-input"
                  />
                  <datalist id="edit-categories">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expiration Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="edit-expiration-date-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expirationDate ? format(formData.expirationDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.expirationDate}
                      onSelect={(date) => setFormData({ ...formData, expirationDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} data-testid="submit-edit-product">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProduct} 
                disabled={submitting}
                data-testid="confirm-delete-product"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProductsPage;

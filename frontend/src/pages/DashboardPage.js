import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/products/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilExpiry = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateString);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Layout notifications={[]}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Layout>
    );
  }

  const { summary, recentAlerts, lastUpdated } = dashboardData || { summary: {}, recentAlerts: [], lastUpdated: null };

  const summaryCards = [
    {
      title: 'Total Products',
      value: summary.total || 0,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Safe',
      value: summary.safe || 0,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Near Expiry',
      value: summary.nearExpiry || 0,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Expired',
      value: summary.expired || 0,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <Layout notifications={recentAlerts}>
      <div className="space-y-8 animate-fade-in" data-testid="dashboard">
        {/* Welcome section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              Welcome, {user?.username?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your inventory today.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Last updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((card, index) => (
            <Card 
              key={card.title} 
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
              data-testid={`summary-card-${card.title.toLowerCase().replace(' ', '-')}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-4xl font-heading font-bold mt-2 tabular-nums">{card.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", card.bgColor)}>
                    <card.icon className={cn("w-6 h-6", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading">Recent Alerts</CardTitle>
              <Link to="/products">
                <Button variant="ghost" size="sm" data-testid="view-all-alerts">
                  View all <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-muted-foreground">All products are safe!</p>
                  <p className="text-sm text-muted-foreground mt-1">No items need attention right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.slice(0, 5).map((product, index) => {
                    const daysUntil = getDaysUntilExpiry(product.expirationDate);
                    return (
                      <div 
                        key={product.id || index}
                        className="flex items-center justify-between p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                        data-testid={`alert-item-${index}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            product.status === 'Expired' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                          )}>
                            {product.status === 'Expired' ? (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.category} · Qty: {product.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(product.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {daysUntil < 0 
                              ? `${Math.abs(daysUntil)} days ago`
                              : daysUntil === 0 
                                ? 'Today'
                                : `${daysUntil} days left`
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-heading">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expiry Threshold</span>
                  <span className="font-semibold">{user?.settings?.expiryThreshold || 7} days</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Safe</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {summary.total > 0 ? Math.round((summary.safe / summary.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${summary.total > 0 ? (summary.safe / summary.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Near Expiry</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {summary.total > 0 ? Math.round((summary.nearExpiry / summary.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${summary.total > 0 ? (summary.nearExpiry / summary.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expired</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {summary.total > 0 ? Math.round((summary.expired / summary.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${summary.total > 0 ? (summary.expired / summary.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link to="/products">
                  <Button className="w-full" data-testid="manage-products-btn">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Manage Products
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

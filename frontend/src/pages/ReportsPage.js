import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { 
  FileText, 
  Download, 
  Calendar, 
  Package,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const ReportsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/report?month=${selectedMonth}&year=${selectedYear}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/products/dashboard');
      setAlerts(response.data.recentAlerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchAlerts();
  }, [fetchReport, fetchAlerts]);

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Expirex Monthly Report', 14, 22);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`${monthName} ${selectedYear}`, 14, 30);
    
    // Summary
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary', 14, 45);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Expired Items: ${reportData.totalExpired}`, 14, 55);
    doc.text(`Total Quantity Lost: ${reportData.totalQuantityLost}`, 14, 62);
    
    // Products table
    if (reportData.products.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Product Name', 'Category', 'Quantity', 'Expiration Date']],
        body: reportData.products.map(p => [
          p.name,
          p.category,
          p.quantity,
          format(new Date(p.expirationDate), 'MMM d, yyyy')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
      });
    }
    
    doc.save(`expirex-report-${monthName}-${selectedYear}.pdf`);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
    const headers = ['Product Name', 'Category', 'Quantity', 'Expiration Date'];
    
    const rows = reportData.products.map(p => [
      p.name,
      p.category,
      p.quantity,
      format(new Date(p.expirationDate), 'yyyy-MM-dd')
    ]);

    const csvContent = [
      `Expirex Monthly Report - ${monthName} ${selectedYear}`,
      '',
      `Total Expired Items: ${reportData.totalExpired}`,
      `Total Quantity Lost: ${reportData.totalQuantityLost}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expirex-report-${monthName}-${selectedYear}.csv`;
    link.click();
  };

  const categoryChartData = reportData?.categoryBreakdown 
    ? Object.entries(reportData.categoryBreakdown).map(([name, data]) => ({
        name,
        value: data.count
      }))
    : [];

  return (
    <Layout notifications={alerts}>
      <div className="space-y-6 animate-fade-in" data-testid="reports-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">Monthly Reports</h1>
            <p className="text-muted-foreground mt-1">View and export expiration reports</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="month-select">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="year-select">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToPDF} disabled={!reportData || reportData.products.length === 0} data-testid="export-pdf-btn">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={!reportData || reportData.products.length === 0} data-testid="export-csv-btn">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-xl lg:col-span-1" />
            <Skeleton className="h-32 rounded-xl lg:col-span-1" />
            <Skeleton className="h-32 rounded-xl lg:col-span-1" />
            <Skeleton className="h-96 rounded-xl lg:col-span-2" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card data-testid="total-expired-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Expired</p>
                      <p className="text-4xl font-heading font-bold mt-2 text-red-600 dark:text-red-400 tabular-nums">
                        {reportData.totalExpired}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">items this month</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                      <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="quantity-lost-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Quantity Lost</p>
                      <p className="text-4xl font-heading font-bold mt-2 text-amber-600 dark:text-amber-400 tabular-nums">
                        {reportData.totalQuantityLost}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">total units</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                      <TrendingDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="categories-affected-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Categories Affected</p>
                      <p className="text-4xl font-heading font-bold mt-2 tabular-nums">
                        {Object.keys(reportData.categoryBreakdown || {}).length}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">different categories</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <PieChart className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Expired Products Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Expired Products
                  </CardTitle>
                  <CardDescription>
                    {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.products.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-muted-foreground">No expired products this month!</p>
                      <p className="text-sm text-muted-foreground mt-1">Great job managing your inventory.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Exp. Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.products.map((product, idx) => (
                            <TableRow key={idx} data-testid={`report-product-${idx}`}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{product.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{product.quantity}</TableCell>
                              <TableCell className="text-right text-red-600 dark:text-red-400">
                                {format(new Date(product.expirationDate), 'MMM d, yyyy')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No data to display</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-4">
                        {Object.entries(reportData.categoryBreakdown || {}).map(([category, data], idx) => (
                          <div key={category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              <span>{category}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium">{data.count}</span>
                              <span className="text-muted-foreground ml-1">({data.quantity} units)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default ReportsPage;

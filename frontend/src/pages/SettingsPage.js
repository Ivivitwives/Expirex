import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sun, 
  Moon, 
  Bell, 
  Clock,
  Save,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const { user, updateSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const [expiryThreshold, setExpiryThreshold] = useState(String(user?.settings?.expiryThreshold || 7));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        expiryThreshold: parseInt(expiryThreshold),
        theme
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout notifications={[]}>
      <div className="space-y-6 animate-fade-in max-w-2xl" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your Expirex experience</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how Expirex looks on your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'light' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                  data-testid="theme-light-btn"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Light</p>
                    <p className="text-sm text-muted-foreground">Bright and clean</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'dark' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                  data-testid="theme-dark-btn"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Dark</p>
                    <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Expiry Threshold
            </CardTitle>
            <CardDescription>Configure when products should be marked as "Near Expiry"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Days before expiration</Label>
              <Select value={expiryThreshold} onValueChange={setExpiryThreshold}>
                <SelectTrigger className="w-full" data-testid="threshold-select">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Products expiring within {expiryThreshold} days will be marked as "Near Expiry"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button 
            onClick={handleSaveSettings} 
            disabled={saving}
            className="min-w-32"
            data-testid="save-settings-btn"
          >
            {saving ? (
              'Saving...'
            ) : saved ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;

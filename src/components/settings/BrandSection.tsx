// Brand Section Component - Brand Configuration (Admin Only)
import React, { useState, useEffect } from 'react';
import { Palette, Upload, Save, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { User as UserType, BrandSettings, Brand } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface BrandSectionProps {
  user: UserType;
}

const BrandSection: React.FC<BrandSectionProps> = ({ user }) => {
  const [brandSettings, setBrandSettings] = useState<BrandSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<{ [key: string]: boolean }>({});

  const defaultBrandColors = {
    academy: '#4d73ff',
    invest: '#2d50ef',
    fund: '#1032cf',
  };

  useEffect(() => {
    loadBrandSettings();
  }, []);

  const loadBrandSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_settings')
        .select('brand_key,label,primary_color,logo_url,updated_at,id,is_active,email_contact')
        .order('brand_key');

      if (error) throw error;
      setBrandSettings(data || []);
    } catch (error) {
      console.error('Error loading brand settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBrandSetting = async (brand: Brand, field: keyof BrandSettings, value: any) => {
    setSaving(brand);
    try {
      const { error } = await supabase
        .from('brand_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('brand_key', brand);

      if (error) throw error;

      setBrandSettings(prev => prev.map(setting => 
        setting.brand_key === brand ? { ...setting, [field]: value } : setting
      ));
      
      toast.success(`Brand ${brand} bijgewerkt!`);
    } catch (error) {
      console.error('Error updating brand setting:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van de brand instellingen.');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (brand: Brand, file: File) => {
    // For now, just create a preview URL
    // In a real implementation, you'd upload to Supabase Storage
    const previewUrl = URL.createObjectURL(file);
    await updateBrandSetting(brand, 'logo_url', previewUrl as any);
  };

  const resetToDefault = async (brand: Brand) => {
    await updateBrandSetting(brand, 'primary_color', defaultBrandColors[brand] as any);
  };

  const getBrandDisplayName = (brand: Brand, label?: string | null) => {
    if (label) return label;
    switch (brand) {
      case 'academy': return 'Archer Academy';
      case 'invest': return 'Archer Invest';
      case 'fund': return 'Archer Investment Fund';
      default: return brand;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-archer-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Brand Management</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Configureer kleuren en logo's per merk
            </p>
          </div>
          <button
            onClick={loadBrandSettings}
            className="flex items-center px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Verversen
          </button>
        </div>
      </div>

      {/* Brand Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['academy', 'invest', 'fund'] as Brand[]).map((brand) => {
          const settings = brandSettings.find(s => s.brand_key === brand);
          const currentColor = settings?.primary_color || defaultBrandColors[brand];
          
          return (
            <div key={brand} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              {/* Brand Header */}
              <div 
                className="p-6 text-white"
                style={{ backgroundColor: currentColor }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {getBrandDisplayName(brand, settings?.label)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewMode(prev => ({ ...prev, [brand]: !prev[brand] }))}
                      className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200"
                    >
                      {previewMode[brand] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Logo Preview */}
                <div className="flex items-center justify-center h-16 bg-white bg-opacity-10 rounded-lg p-2">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt={`${brand} logo`}
                      className="h-full max-w-full object-contain"
                    />
                  ) : (
                    <Palette className="w-8 h-8 text-white opacity-50" />
                  )}
                </div>
              </div>

              {/* Configuration Form */}
              <div className="p-6 space-y-6">
                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Merknaam
                  </label>
                  <input
                    type="text"
                    value={settings?.label || ''}
                    onChange={(e) => updateBrandSetting(brand, 'label' as keyof BrandSettings, e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                    placeholder={getBrandDisplayName(brand)}
                  />
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Accent Kleur
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => updateBrandSetting(brand, 'primary_color' as keyof BrandSettings, e.target.value)}
                        className="h-10 w-20 border border-neutral-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) => updateBrandSetting(brand, 'primary_color' as keyof BrandSettings, e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue font-mono text-sm"
                        placeholder="#4d73ff"
                      />
                    </div>
                    <button
                      onClick={() => resetToDefault(brand)}
                      className="px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors duration-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(brand, file);
                      }}
                      className="hidden"
                      id={`logo-upload-${brand}`}
                    />
                    <label
                      htmlFor={`logo-upload-${brand}`}
                      className="flex-1 flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors duration-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload logo
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    PNG, JPG of SVG. Aanbevolen: 200x200px.
                  </p>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Contact E-mail
                  </label>
                  <input
                    type="email"
                    value={settings?.email_contact || ''}
                    onChange={(e) => updateBrandSetting(brand, 'email_contact', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                    placeholder="events@archer.finance"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings?.is_active ?? true}
                      onChange={(e) => updateBrandSetting(brand, 'is_active', e.target.checked)}
                      className="w-4 h-4 text-archer-blue border-neutral-300 rounded focus:ring-archer-blue"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Merk actief
                    </span>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <div className="text-sm text-neutral-500">
                    Laatst bijgewerkt: {settings?.updated_at 
                      ? new Date(settings.updated_at).toLocaleDateString('nl-BE')
                      : 'Nooit'
                    }
                  </div>
                  <button
                    onClick={() => updateBrandSetting(brand, 'updated_at', new Date().toISOString())}
                    disabled={saving === brand}
                    className="flex items-center px-4 py-2 bg-archer-blue text-white rounded-lg hover:bg-archer-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {saving === brand ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Opslaan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Opslaan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">Live Preview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['academy', 'invest', 'fund'] as Brand[]).map((brand) => {
            const settings = brandSettings.find(s => s.brand_key === brand);
            const currentColor = settings?.primary_color || defaultBrandColors[brand];
            
            return (
              <div key={brand} className="text-center">
                <div 
                  className="rounded-lg p-4 text-white font-semibold mb-2"
                  style={{ backgroundColor: currentColor }}
                >
                  {getBrandDisplayName(brand, settings?.label)}
                </div>
                <div className="space-y-2 text-sm">
                  <div>Kleur: {currentColor}</div>
                  <div>Logo: {settings?.logo_url ? '✓' : '✗'}</div>
                  <div>Status: {settings?.is_active !== false ? 'Actief' : 'Inactief'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BrandSection;

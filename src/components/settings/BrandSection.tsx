import React, { useState, useEffect } from 'react';
import { Palette, Upload, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { User, BrandSettings, Brand } from '@/types';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCENT = '#4d73ff';

interface BrandSectionProps {
  user: User;
}

const BrandSection: React.FC<BrandSectionProps> = () => {
  const [brandSettings, setBrandSettings] = useState<BrandSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadBrandSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .order('brand');

      if (error) throw error;
      setBrandSettings(data || []);
    } catch (error) {
      console.error('Error loading brand settings:', error);
      toast.error('Kon brandinstellingen niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrandSettings();
  }, []);

  const updateBrandSetting = async (
    brand: Brand,
    field: keyof BrandSettings,
    value: string | boolean | null
  ) => {
    setSaving(brand);
    try {
      const { error } = await supabase
        .from('brand_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('brand', brand);

      if (error) throw error;
      setBrandSettings((prev) =>
        prev.map((s) => (s.brand === brand ? { ...s, [field]: value } : s))
      );
      toast.success('Brandinstelling opgeslagen.');
    } catch (error) {
      console.error('Error updating brand setting:', error);
      toast.error('Kon brandinstelling niet opslaan.');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (brand: Brand, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    await updateBrandSetting(brand, 'logo_url', previewUrl);
  };

  const displayName = (setting: BrandSettings) =>
    setting.brand_name || setting.brand || String(setting.brand);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-archer-blue" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Brand Management</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Configureer kleuren en logo&apos;s per merk
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {brandSettings.map((setting) => {
          const currentColor = setting.accent_color || DEFAULT_ACCENT;
          const brand = setting.brand;
          return (
            <div
              key={setting.id}
              className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
            >
              <div
                className="p-6 text-white"
                style={{ backgroundColor: currentColor }}
              >
                <h3 className="text-lg font-semibold mb-4">{displayName(setting)}</h3>
                <div className="flex items-center justify-center h-16 bg-white bg-opacity-10 rounded-lg p-2">
                  {setting.logo_url ? (
                    <img
                      src={setting.logo_url}
                      alt={`${displayName(setting)} logo`}
                      className="h-full max-w-full object-contain"
                    />
                  ) : (
                    <Palette className="w-8 h-8 text-white opacity-50" />
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Merknaam
                  </label>
                  <input
                    type="text"
                    value={setting.brand_name || ''}
                    onChange={(e) =>
                      updateBrandSetting(brand, 'brand_name', e.target.value || null)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                    placeholder={brand}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Accent Kleur
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) =>
                          updateBrandSetting(brand, 'accent_color', e.target.value)
                        }
                        className="h-10 w-20 border border-neutral-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) =>
                          updateBrandSetting(brand, 'accent_color', e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue font-mono text-sm"
                        placeholder="#4d73ff"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Logo
                  </label>
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
                    className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors duration-200 w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload logo
                  </label>
                  <p className="text-xs text-neutral-500 mt-1">PNG, JPG of SVG.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Contact E-mail
                  </label>
                  <input
                    type="email"
                    value={setting.email_contact || ''}
                    onChange={(e) =>
                      updateBrandSetting(brand, 'email_contact', e.target.value || null)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                    placeholder="events@archer.finance"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={setting.is_active ?? true}
                      onChange={(e) =>
                        updateBrandSetting(brand, 'is_active', e.target.checked)
                      }
                      className="w-4 h-4 text-archer-blue border-neutral-300 rounded focus:ring-archer-blue"
                    />
                    <span className="text-sm font-medium text-neutral-700">Merk actief</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-neutral-200 text-sm text-neutral-500">
                  Laatst bijgewerkt:{' '}
                  {setting.updated_at
                    ? new Date(setting.updated_at).toLocaleDateString('nl-BE')
                    : 'Nooit'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandSection;

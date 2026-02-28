// Profile Section Component - User Profile Management
import React, { useState, useEffect } from 'react';
import { User, Mail, Camera, Globe, Bell, Save } from 'lucide-react';
import { User as UserType, UserPreferences } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ProfileSectionProps {
  user: UserType;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ user }) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [preferences, setPreferences] = useState<UserPreferences>(user.preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFullName(user.full_name || '');
    setAvatarUrl(user.avatar_url || '');
    setPreferences(user.preferences);
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl || null,
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profiel succesvol bijgewerkt!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van je profiel.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just set a placeholder URL
    // In a real implementation, you'd upload to Supabase Storage
    setAvatarUrl(URL.createObjectURL(file));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Profiel Informatie</h2>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-archer-blue text-white rounded-lg hover:bg-archer-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Profielfoto</label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-neutral-400" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="flex items-center px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors duration-200"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Wijzig foto
                </label>
                <p className="text-xs text-neutral-500 mt-1">
                  JPG, PNG of GIF. Maximaal 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="full-name" className="block text-sm font-medium text-neutral-700">
              Volledige naam
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue transition-colors duration-200"
              placeholder="Jouw naam"
            />
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              E-mailadres
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="w-full px-3 py-2 pl-10 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500 cursor-not-allowed"
              />
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500">
              E-mailadres kan niet worden gewijzigd. Neem contact op met een administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Voorkeuren</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language */}
          <div className="space-y-2">
            <label htmlFor="language" className="block text-sm font-medium text-neutral-700">
              <Globe className="w-4 h-4 inline mr-2" />
              Taal
            </label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value as 'nl' | 'en' })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue transition-colors duration-200"
            >
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              <Bell className="w-4 h-4 inline mr-2" />
              Notificaties
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                  className="w-4 h-4 text-archer-blue border-neutral-300 rounded focus:ring-archer-blue"
                />
                <span className="ml-2 text-sm text-neutral-700">
                  E-mail notificaties ontvangen
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Account Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-neutral-50 rounded-lg">
            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
              user.is_active ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <p className="text-sm font-medium text-neutral-900">Status</p>
            <p className="text-xs text-neutral-600">
              {user.is_active ? 'Actief' : 'Inactief'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-900 mb-1">Rol</p>
            <p className="text-xs text-neutral-600 capitalize">
              {user.role === 'admin' ? 'Administrator' :
               user.role === 'operations' ? 'Operations' : 'Viewer'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-900 mb-1">Laatste login</p>
            <p className="text-xs text-neutral-600">
              {user.last_sign_in_at 
                ? new Date(user.last_sign_in_at).toLocaleDateString('nl-BE')
                : 'Nooit'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;

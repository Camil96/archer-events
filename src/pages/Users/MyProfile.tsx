import React, { useEffect, useState } from 'react';
import { KeyRound, LogOut, Save, ShieldCheck, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import ErrorBanner from '@/components/common/ErrorBanner';
import { mapProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface MyProfileProps {
  user: User;
  onUserUpdated?: (user: User) => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ user, onUserUpdated }) => {
  const [profile, setProfile] = useState<User>(user);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadProfile = async () => {
    setLoading(true);
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (data) {
        const mapped = mapProfile(data);
        setProfile(mapped);
        onUserUpdated?.(mapped);
      }
    } catch (err: any) {
      setError(err.message || 'Kon profiel niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProfile(user);
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          language_pref: profile.language_pref || 'nl',
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (updateError) throw updateError;
      toast.success('Profiel opgeslagen.');
      await reloadProfile();
    } catch (err: any) {
      setError(err.message || 'Profiel opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!password.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      toast.success('Wachtwoord aangepast.');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Wachtwoord wijzigen mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const storagePath = `${profile.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      setProfile((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      onUserUpdated?.({ ...profile, avatar_url: data.publicUrl });
      toast.success('Avatar bijgewerkt.');
    } catch (err: any) {
      setError(err.message || 'Avatar uploaden mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AppShell user={profile} hideNavExtras>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mijn profiel</h1>
          <p className="text-sm text-neutral-600">Beheer je accountgegevens en voorkeuren.</p>
        </div>

        {error && <ErrorBanner message={error} onRetry={reloadProfile} />}
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
        ) : (
          <>
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || profile.email} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-neutral-700">{(profile.full_name || profile.email || 'U')[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center px-3 py-2 border border-neutral-300 rounded-lg text-sm cursor-pointer hover:bg-neutral-50">
                    <Upload className="w-4 h-4 mr-2" />
                    Avatar uploaden
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
              <label className="block">
                <span className="text-sm text-neutral-700">Naam</span>
                <input
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-700">E-mail</span>
                <input
                  value={profile.email || ''}
                  readOnly
                  className="mt-1 w-full px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-lg text-neutral-500"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-neutral-700">Rol</span>
                  <div className="mt-1 px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm capitalize">
                    {profile.role}
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm text-neutral-700">Brand toegang</span>
                  <div className="mt-1 px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm">
                    {(profile.brand_access || []).join(', ') || '-'}
                  </div>
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-neutral-700">Verantwoordelijkheden</span>
                <textarea
                  value={profile.responsibilities || ''}
                  readOnly
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm text-neutral-600"
                />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-700">Taalvoorkeur</span>
                <select
                  value={profile.language_pref || 'nl'}
                  onChange={(e) => setProfile((prev) => ({ ...prev, language_pref: e.target.value as 'nl' | 'en' }))}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">English</option>
                </select>
              </label>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark disabled:opacity-60"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-archer-blue" />
                Beveiliging
              </h3>
              <label className="block">
                <span className="text-sm text-neutral-700">Nieuw wachtwoord</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full md:w-80 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                />
              </label>
              <button
                onClick={changePassword}
                disabled={saving || !password}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Wachtwoord wijzigen
              </button>
            </div>

            <div>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-red-300 text-red-700 text-sm hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default MyProfile;


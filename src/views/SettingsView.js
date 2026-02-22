// Settings View Controller - Main Settings Page
import { supabase } from "../supabaseClient.js";
import { renderSettingsLayout, initializeSettingsLayout } from "../components/settings/SettingsLayout.js";
import { showToast } from "../utils.js";

export async function renderSettings() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      showToast('Je moet ingelogd zijn om instellingen te bekijken.', 'error');
      return '<div class="error-state">Geen gebruiker gevonden</div>';
    }

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      showToast('Er is een fout opgetreden bij het laden van je profiel.', 'error');
      return '<div class="error-state">Profiel niet gevonden</div>';
    }

    // Merge auth user with profile data
    const fullUser = { ...user, ...profile };

    // Render settings layout
    return renderSettingsLayout(fullUser);
    
  } catch (error) {
    console.error('Error in renderSettings:', error);
    showToast('Er is een fout opgetreden bij het laden van instellingen.', 'error');
    return '<div class="error-state">Kon instellingen niet laden</div>';
  }
}

export async function initializeSettings() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      showToast('Je moet ingelogd zijn om instellingen te bekijken.', 'error');
      return;
    }

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      showToast('Er is een fout opgetreden bij het laden van je profiel.', 'error');
      return;
    }

    // Merge auth user with profile data
    const fullUser = { ...user, ...profile };

    // Initialize settings layout
    initializeSettingsLayout(fullUser);
    
  } catch (error) {
    console.error('Error initializing settings:', error);
    showToast('Er is een fout opgetreden bij het initialiseren van instellingen.', 'error');
  }
}

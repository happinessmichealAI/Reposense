import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Only initialize if credentials are provided
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] Client initialized');
} else {
  console.warn('[Supabase] Credentials not found - session logging disabled');
}

/**
 * Save IBM Bob session to Supabase
 * @param {string} repoName - Repository name
 * @param {object} bobOutput - Bob's analysis output
 * @param {boolean} fallbackUsed - Whether fallback was used
 */
export async function saveToSupabase(repoName, bobOutput, fallbackUsed = false) {
  if (!supabase) {
    console.warn('[Supabase] Skipping save - client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('bob_sessions')
      .insert([
        {
          repo_name: repoName,
          timestamp: new Date().toISOString(),
          bob_output: bobOutput,
          fallback_used: fallbackUsed,
        },
      ])
      .select();

    if (error) {
      console.error('[Supabase] Save error:', error);
      return null;
    }

    console.log('[Supabase] Session saved:', data[0].id);
    return data[0];
  } catch (error) {
    console.error('[Supabase] Save failed:', error.message);
    return null;
  }
}

/**
 * Export all Bob sessions for judge evidence
 * @returns {Promise<Array>} - All session records
 */
export async function exportBobSessions() {
  if (!supabase) {
    console.warn('[Supabase] Cannot export - client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('bob_sessions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[Supabase] Export error:', error);
      return [];
    }

    console.log(`[Supabase] Exported ${data.length} sessions`);
    return data;
  } catch (error) {
    console.error('[Supabase] Export failed:', error.message);
    return [];
  }
}

/**
 * Get session statistics
 * @returns {Promise<Object>} - Session stats
 */
export async function getSessionStats() {
  if (!supabase) {
    return { total: 0, bobSuccess: 0, fallbackUsed: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('bob_sessions')
      .select('fallback_used');

    if (error) {
      console.error('[Supabase] Stats error:', error);
      return { total: 0, bobSuccess: 0, fallbackUsed: 0 };
    }

    const total = data.length;
    const fallbackUsed = data.filter(s => s.fallback_used).length;
    const bobSuccess = total - fallbackUsed;

    return { total, bobSuccess, fallbackUsed };
  } catch (error) {
    console.error('[Supabase] Stats failed:', error.message);
    return { total: 0, bobSuccess: 0, fallbackUsed: 0 };
  }
}

// Made with Bob

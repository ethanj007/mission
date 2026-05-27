import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbeyybtewfcztxlzbmcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_oky_mcDUoUfPWiKBiYYugg_ib_Zv_yp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const CHANNEL_ID = 'shared_dudu_bubu_room';

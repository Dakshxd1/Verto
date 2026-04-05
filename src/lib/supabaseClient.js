import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://exykcukcvjdkrlbmxzdx.supabase.co",
  "sb_publishable_w3oXYlTqJVX09MiQGZN3Xw_gtk6R4R1"
);

window.supabase = supabase;

export default supabase;
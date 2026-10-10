/* Friends backend (Supabase). Leave blank to turn friends off.
   The anon key is meant to be public: every table is locked by row-level security,
   and the app can only call the functions in supabase/schema.sql. */
window.MQ_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current session, waiting briefly for the client to hydrate a
 * session that is still being restored (fresh tab, OAuth redirect return).
 */
export async function waitForSession(timeoutMs = 2500) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  return new Promise<Session | null>((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(session);
      }
    });
  });
}
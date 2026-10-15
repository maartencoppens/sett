import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

/** The set of switched-on modules for a group. Bump refreshKey to reload. */
export function useGroupModules(groupId: string | undefined, refreshKey = 0) {
  const [modules, setModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("group_modules")
      .select("module")
      .eq("group_id", groupId)
      .then(({ data }) =>
        setModules(new Set((data ?? []).map((m) => m.module))),
      );
  }, [groupId, refreshKey]);

  return modules;
}

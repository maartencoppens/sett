import type { ImageBucket } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

/** Turns a private storage path into a temporary URL (valid 1 hour). */
export function useSignedUrl(
  bucket: ImageBucket,
  path: string | null | undefined,
) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);

  return url;
}

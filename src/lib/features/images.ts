import { supabase } from "@/lib/supabase/client";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type ImageBucket = "avatars" | "group-logos";

/** Opens the photo library, lets the user crop a square, returns a small local JPEG. */
export async function pickSquareImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1], // Android; iOS always crops square
    quality: 1,
  });
  if (result.canceled) return null;

  const rendered = await ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: 512, height: null })
    .renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.8,
  });
  return saved.uri;
}

/** Uploads a local file to {bucket}/{folder}/{timestamp}.jpg and returns the storage path. */
export async function uploadImage(
  bucket: ImageBucket,
  folder: string,
  localUri: string,
) {
  const body = await fetch(localUri).then((response) => response.arrayBuffer());
  const path = `${folder}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

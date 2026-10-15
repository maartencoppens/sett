import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { ACCENT_KEYS, PALETTE, type AccentKey } from "@/constants/palette";
import { useActiveGroup } from "@/lib/active-group";
import { useSession } from "@/lib/auth-context";
import { pickSquareImage, uploadImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import type { QueryData } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";

const membersQuery = (groupId: string) =>
  supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name, instruments, avatar_path)")
    .eq("group_id", groupId)
    .order("joined_at");

type Members = QueryData<ReturnType<typeof membersQuery>>;

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { refresh } = useActiveGroup();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("");
  const [accent, setAccent] = useState<string>("indigo");
  const [members, setMembers] = useState<Members>([]);

  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("groups")
        .select("name, accent_color, logo_path")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          setName(data.name);
          setAccent(data.accent_color);
          setLogoPath(data.logo_path);
        });
      membersQuery(id).then(({ data, error }) => {
        if (error) console.warn(error.message);
        setMembers(data ?? []);
      });
    }, [id]),
  );

  const isAdmin = members.some(
    (m) => m.user_id === session?.user.id && m.role === "admin",
  );

  async function invite() {
    const { data: code, error } = await supabase.rpc("create_invite", {
      p_group_id: id,
    });
    if (error || !code)
      return Alert.alert("Could not create invite", error?.message);
    const url = Linking.createURL(`/join/${code}`);
    await Share.share({
      message: `Join ${name} on Sett!\nCode: ${code}\n${url}`,
    });
  }

  async function pickAccent(key: AccentKey) {
    const { error } = await supabase
      .from("groups")
      .update({ accent_color: key })
      .eq("id", id)
      .select("id")
      .single();
    if (error) return Alert.alert("Could not change colour", error.message);
    setAccent(key);
    refresh(); // the whole app re-themes
  }

  function leave() {
    Alert.alert("Leave group?", `You'll lose access to ${name}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("group_members")
            .delete()
            .eq("group_id", id)
            .eq("user_id", session!.user.id);
          if (error) return Alert.alert("Could not leave", error.message);
          await refresh(); // active group falls back to another group
          router.back();
        },
      },
    ]);
  }

  async function changeLogo() {
    try {
      const localUri = await pickSquareImage();
      if (!localUri) return;
      setUploadingLogo(true);

      const newPath = await uploadImage("group-logos", id, localUri);
      const { error } = await supabase
        .from("groups")
        .update({ logo_path: newPath })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;

      if (logoPath) supabase.storage.from("group-logos").remove([logoPath]);
      setLogoPath(newPath);
      refresh(); // Home shows the new logo
    } catch (e) {
      Alert.alert(
        "Could not upload logo",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || "Group" }} />
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar bucket="group-logos" path={logoPath} name={name} size={88} />
        {isAdmin && (
          <Pressable
            onPress={changeLogo}
            disabled={uploadingLogo}
            accessibilityRole="button"
          >
            {uploadingLogo ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <ThemedText style={{ color: colors.accent }}>
                {logoPath ? "Change logo" : "Add logo"}
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>
      <ThemedText muted style={styles.label}>
        Members
      </ThemedText>
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.member,
              { flexDirection: "row", alignItems: "center", gap: 12 },
            ]}
          >
            <Avatar
              bucket="avatars"
              path={item.profiles?.avatar_path}
              name={item.profiles?.display_name}
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.memberName}>
                {item.profiles?.display_name ?? "Unnamed"}
                {item.role === "admin" && (
                  <ThemedText muted> · admin</ThemedText>
                )}
              </ThemedText>
              {!!item.profiles?.instruments.length && (
                <ThemedText muted>
                  {item.profiles.instruments.join(", ")}
                </ThemedText>
              )}
            </View>
          </View>
        )}
        style={{ flexGrow: 0 }}
      />

      {isAdmin && (
        <>
          <ThemedText muted style={styles.label}>
            Group colour
          </ThemedText>
          <View style={styles.swatches}>
            {ACCENT_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => pickAccent(key)}
                accessibilityRole="radio"
                accessibilityLabel={PALETTE[key].label}
                accessibilityState={{ selected: accent === key }}
                style={[
                  styles.swatch,
                  { backgroundColor: PALETTE[key][scheme] },
                  accent === key && styles.swatchSelected,
                ]}
              />
            ))}
          </View>

          <Button title="Invite someone" onPress={invite} />
        </>
      )}

      <Button title="Leave group" variant="danger" onPress={leave} />
    </View>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, padding: 24, gap: 16 },
    label: { fontSize: 14, fontWeight: "600" },
    member: {
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    memberName: { fontSize: 17 },
    swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    swatch: { width: 40, height: 40, borderRadius: 20 },
    swatchSelected: { borderWidth: 3, borderColor: colors.text },
  });

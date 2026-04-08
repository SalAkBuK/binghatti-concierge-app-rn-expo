import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttachmentPicker } from '../../components/ui/AttachmentPicker';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { SideMenu } from '../../components/ui/SideMenu';
import { useAuth } from '../../lib/context/auth-context';
import { useOwnerUnauthorized } from '../../lib/hooks/owner/useOwnerUnauthorized';
import { useOwnerUnreadSummary } from '../../lib/hooks/owner/useOwnerUnreadSummary';
import { ownerPortalApi } from '../../lib/services/api/owner-portal';
import type {
  OwnerSelfServiceProfile,
  OwnerSelfServiceRuntime,
} from '../../lib/types';
import { showErrorAlert, showSuccessAlert } from '../../lib/utils/alertHelpers';
import { uploadFileToServer } from '../../lib/utils/fileUpload';
import { OWNER_PALETTE as P } from '../../lib/utils/owner-portal';

type AccountFormState = {
  name: string;
  phone: string;
};

type OwnerProfileFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const OWNER_PROFILE_RECORD_EDITING_ENABLED = false;

const initials = (name?: string | null) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'O';

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || 'Owner';

const isRemoteUri = (value?: string | null) =>
  typeof value === 'string' &&
  (value.startsWith('http://') || value.startsWith('https://'));

const toAccountForm = (runtime?: OwnerSelfServiceRuntime | null): AccountFormState => ({
  name: runtime?.user.name ?? '',
  phone: runtime?.user.phone ?? '',
});

const toOwnerProfileForm = (
  profile: OwnerSelfServiceProfile,
): OwnerProfileFormState => ({
  name: profile.name ?? '',
  email: profile.email ?? '',
  phone: profile.phone ?? '',
  address: profile.address ?? '',
});

const toOwnerFormMap = (
  runtime?: OwnerSelfServiceRuntime | null,
): Record<string, OwnerProfileFormState> =>
  Object.fromEntries(
    (runtime?.owners ?? []).map((profile) => [
      profile.ownerId,
      toOwnerProfileForm(profile),
    ]),
  );

const buildOwnerProfilePatch = (
  draft: OwnerProfileFormState,
  original?: OwnerSelfServiceProfile,
) => {
  if (!original) {
    return {};
  }

  return {
    ...(draft.name.trim() !== (original.name ?? '').trim()
      ? { name: draft.name.trim() }
      : {}),
    ...(draft.email.trim() !== (original.email ?? '').trim()
      ? { email: draft.email.trim() }
      : {}),
    ...(draft.phone.trim() !== (original.phone ?? '').trim()
      ? { phone: draft.phone.trim() }
      : {}),
    ...(draft.address.trim() !== (original.address ?? '').trim()
      ? { address: draft.address.trim() }
      : {}),
  };
};

export default function OwnerProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser, actions } = useAuth();
  const handleUnauthorized = useOwnerUnauthorized();
  const { conversationUnreadCount, notificationUnreadCount } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [runtime, setRuntime] = useState<OwnerSelfServiceRuntime | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: '',
    phone: '',
  });
  const [ownerForms, setOwnerForms] = useState<Record<string, OwnerProfileFormState>>({});
  const [avatarAttachments, setAvatarAttachments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [savingOwnerId, setSavingOwnerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentUserRef = useRef(currentUser);
  const updateUserRef = useRef(actions.updateUser);
  const handleUnauthorizedRef = useRef(handleUnauthorized);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    updateUserRef.current = actions.updateUser;
  }, [actions.updateUser]);

  useEffect(() => {
    handleUnauthorizedRef.current = handleUnauthorized;
  }, [handleUnauthorized]);

  const applyRuntime = useCallback(
    async (nextRuntime: OwnerSelfServiceRuntime) => {
      console.log('[OwnerProfile] applyRuntime', {
        ownerCount: nextRuntime.owners.length,
        orgIds: nextRuntime.owners.map((owner) => owner.orgId),
        userId: nextRuntime.user.id,
      });

      setRuntime(nextRuntime);
      setAccountForm(toAccountForm(nextRuntime));
      setOwnerForms(toOwnerFormMap(nextRuntime));
      setAvatarAttachments(nextRuntime.user.avatarUrl ? [nextRuntime.user.avatarUrl] : []);
      setErrorMessage(null);

      const activeUser = currentUserRef.current;
      if (!activeUser) {
        console.log('[OwnerProfile] applyRuntime skipped auth sync because no current user is set');
        return;
      }

      const mergedUser = {
        ...activeUser,
        name: nextRuntime.user.name || activeUser.name,
        phone: nextRuntime.user.phone ?? activeUser.phone,
        profile: {
          ...(activeUser.profile ?? {}),
          name: nextRuntime.user.name || activeUser.profile?.name,
          phone: nextRuntime.user.phone ?? activeUser.profile?.phone,
          ...(nextRuntime.user.avatarUrl
            ? {
                avatar: nextRuntime.user.avatarUrl,
                avatarUrl: nextRuntime.user.avatarUrl,
              }
            : {}),
        },
        profileCompleted: true,
      };

      await updateUserRef.current(activeUser.email, mergedUser);
      console.log('[OwnerProfile] auth user synced', {
        email: activeUser.email,
        ownerCount: nextRuntime.owners.length,
      });
    },
    [],
  );

  const load = useCallback(
    async (asRefresh = false) => {
      const loadId = ++loadAttemptRef.current;
      console.log('[OwnerProfile] load start', {
        loadId,
        asRefresh,
      });

      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await ownerPortalApi.getMe();
        console.log('[OwnerProfile] load success', {
          loadId,
          ownerCount: response.owners.length,
          orgIds: response.owners.map((owner) => owner.orgId),
          email: response.user.email,
        });
        await applyRuntime(response);
      } catch (error) {
        console.error('[OwnerProfile] load failed', {
          loadId,
          error,
        });

        if (await handleUnauthorizedRef.current(error)) {
          console.warn('[OwnerProfile] load ended with unauthorized response', {
            loadId,
          });
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your owner profile right now.',
        );
      } finally {
        console.log('[OwnerProfile] load complete', {
          loadId,
          asRefresh,
        });
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyRuntime],
  );

  useEffect(() => {
    void load();
  }, []);

  const orgCount = useMemo(
    () => new Set((runtime?.owners ?? []).map((owner) => owner.orgId)).size,
    [runtime],
  );

  const activeOwnerCount = useMemo(
    () => (runtime?.owners ?? []).filter((owner) => owner.isActive).length,
    [runtime],
  );

  const displayAvatarUri =
    avatarAttachments[0] ??
    runtime?.user.avatarUrl ??
    currentUser?.profile?.avatarUrl ??
    currentUser?.profile?.avatar ??
    null;

  const handleSaveAccount = useCallback(async () => {
    if (!runtime) {
      return;
    }

    try {
      setIsSavingAccount(true);
      console.log('[OwnerProfile] account save start', {
        userId: runtime.user.id,
        selectedAvatarCount: avatarAttachments.length,
      });

      let avatarUrl = runtime.user.avatarUrl ?? undefined;
      const selectedAvatar = avatarAttachments[0];
      if (selectedAvatar) {
        console.log('[OwnerProfile] avatar upload step start', {
          selectedAvatar,
          isRemoteAsset: isRemoteUri(selectedAvatar),
        });
        avatarUrl = isRemoteUri(selectedAvatar)
          ? selectedAvatar
          : await uploadFileToServer(selectedAvatar);
        console.log('[OwnerProfile] avatar upload step success', {
          avatarUrl,
        });
      }

      const payload = {
        ...(accountForm.name.trim() !== runtime.user.name.trim()
          ? { name: accountForm.name.trim() }
          : {}),
        ...(accountForm.phone.trim() !== (runtime.user.phone ?? '').trim()
          ? { phone: accountForm.phone.trim() }
          : {}),
        ...(avatarUrl && avatarUrl !== runtime.user.avatarUrl ? { avatarUrl } : {}),
      };

      console.log('[OwnerProfile] account save payload prepared', {
        payload,
      });

      if (Object.keys(payload).length === 0) {
        console.log('[OwnerProfile] account save skipped because there are no changes');
        showSuccessAlert('Your account profile is already up to date.');
        return;
      }

      const nextRuntime = await ownerPortalApi.updateMeProfile(payload);
      console.log('[OwnerProfile] account save api success', {
        ownerCount: nextRuntime.owners.length,
        email: nextRuntime.user.email,
      });
      await applyRuntime(nextRuntime);
      showSuccessAlert('Owner account profile updated.');
    } catch (error) {
      console.error('[OwnerProfile] account save failed', {
        error,
      });
      if (await handleUnauthorized(error)) {
        return;
      }

      showErrorAlert(error, 'Failed to update your owner account profile.');
    } finally {
      setIsSavingAccount(false);
    }
  }, [accountForm, applyRuntime, avatarAttachments, handleUnauthorized, runtime]);

  const handleOwnerFieldChange = useCallback(
    (ownerId: string, field: keyof OwnerProfileFormState, value: string) => {
      setOwnerForms((prev) => ({
        ...prev,
        [ownerId]: {
          ...(prev[ownerId] ?? {
            name: '',
            email: '',
            phone: '',
            address: '',
          }),
          [field]: value,
        },
      }));
    },
    [],
  );

  const handleSaveOwnerProfile = useCallback(
    async (ownerId: string) => {
      if (!OWNER_PROFILE_RECORD_EDITING_ENABLED) {
        console.log('[OwnerProfile] owner save blocked because per-organization editing is disabled', {
          ownerId,
        });
        return;
      }

      const original = runtime?.owners.find((owner) => owner.ownerId === ownerId);
      const draft = ownerForms[ownerId];

      if (!original || !draft) {
        return;
      }

      const payload = buildOwnerProfilePatch(draft, original);
      console.log('[OwnerProfile] owner save payload prepared', {
        ownerId,
        orgId: original.orgId,
        payload,
      });

      if (Object.keys(payload).length === 0) {
        console.log('[OwnerProfile] owner save skipped because there are no changes', {
          ownerId,
        });
        showSuccessAlert('This owner profile is already up to date.');
        return;
      }

      try {
        setSavingOwnerId(ownerId);
        console.log('[OwnerProfile] owner save start', {
          ownerId,
          orgId: original.orgId,
        });
        const updatedOwner = await ownerPortalApi.updateOwnerProfile(ownerId, payload);
        console.log('[OwnerProfile] owner save api success', {
          ownerId,
          orgId: updatedOwner.orgId,
          orgName: updatedOwner.orgName,
        });

        setRuntime((prev) =>
          prev
            ? {
                ...prev,
                owners: prev.owners.map((owner) =>
                  owner.ownerId === ownerId ? updatedOwner : owner,
                ),
              }
            : prev,
        );
        setOwnerForms((prev) => ({
          ...prev,
          [ownerId]: toOwnerProfileForm(updatedOwner),
        }));
        showSuccessAlert(`Saved ${updatedOwner.orgName} owner profile.`);
      } catch (error) {
        console.error('[OwnerProfile] owner save failed', {
          ownerId,
          orgId: original.orgId,
          error,
        });
        if (await handleUnauthorized(error)) {
          return;
        }

        showErrorAlert(error, 'Failed to update this owner profile.');
      } finally {
        setSavingOwnerId(null);
      }
    },
    [handleUnauthorized, ownerForms, runtime],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading owner settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 34 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <HeaderBar
              showTitle={false}
              hasUnreadNotifications={notificationUnreadCount > 0}
              messagingUnreadCount={conversationUnreadCount}
              showSideMenu={showSideMenu}
              onSideMenuToggle={setShowSideMenu}
              notificationRoute="/(modals)/owner-alerts"
              textColor={P.text}
              horizontalPadding={0}
              menuMargin={0}
              notificationMargin={0}
            />

            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                {displayAvatarUri ? (
                  <Image source={{ uri: displayAvatarUri }} style={styles.heroAvatarImage} />
                ) : (
                  <View style={styles.heroAvatarFallback}>
                    <Text style={styles.heroAvatarText}>
                      {initials(runtime?.user.name || currentUser?.name)}
                    </Text>
                  </View>
                )}

                <View style={styles.heroCopy}>
                  <Text style={styles.eyebrow}>Owner Settings</Text>
                  <Text style={styles.heroTitle}>
                    {runtime?.user.name || currentUser?.name || 'Owner Account'}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Manage your owner account details and the contact information
                    exposed for each org-specific owner profile.
                  </Text>
                </View>
              </View>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <Ionicons name="business-outline" size={15} color={P.primary} />
                  <Text style={styles.heroMetaPillText}>{orgCount} orgs</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Ionicons name="person-circle-outline" size={15} color={P.primary} />
                  <Text style={styles.heroMetaPillText}>
                    {activeOwnerCount}/{runtime?.owners.length ?? 0} active
                  </Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Ionicons name="mail-outline" size={15} color={P.primary} />
                  <Text style={styles.heroMetaPillText}>
                    {currentUser?.email || runtime?.user.email || 'No email'}
                  </Text>
                </View>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Account</Text>
                  <Text style={styles.sectionTitle}>Owner Login Profile</Text>
                </View>
                {isSavingAccount ? <ActivityIndicator size="small" color={P.primary} /> : null}
              </View>

              <AttachmentPicker
                attachments={avatarAttachments}
                onAttachmentsChange={setAvatarAttachments}
                maxAttachments={1}
                disabled={isSavingAccount}
              />

              <ProfileField
                label="Full Name"
                value={accountForm.name}
                onChangeText={(value) =>
                  setAccountForm((prev) => ({ ...prev, name: value }))
                }
                placeholder="Enter your full name"
              />

              <ProfileField
                label="Phone"
                value={accountForm.phone}
                onChangeText={(value) =>
                  setAccountForm((prev) => ({ ...prev, phone: value }))
                }
                placeholder="+971500000001"
                keyboardType="phone-pad"
              />

              <ProfileField
                label="Email"
                value={runtime?.user.email || currentUser?.email || ''}
                onChangeText={() => {}}
                placeholder="Email"
                editable={false}
                helperText="Email is read-only on the login profile."
              />

              <TouchableOpacity
                style={[styles.saveButton, isSavingAccount && styles.saveButtonDisabled]}
                onPress={() => void handleSaveAccount()}
                disabled={isSavingAccount}
              >
                {isSavingAccount ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Account Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Org Profiles</Text>
                  <Text style={styles.sectionTitle}>Per-Organization Owner Records</Text>
                </View>
              </View>

              <Text style={styles.sectionBody}>
                These records control the owner contact details shown inside each
                organization where you currently have owner access. Editing is
                temporarily disabled.
              </Text>

              {(runtime?.owners.length ?? 0) === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="business-outline" size={26} color={P.soft} />
                  <Text style={styles.emptyTitle}>No linked owner records</Text>
                  <Text style={styles.emptyBody}>
                    This login does not currently have any active owner profiles.
                  </Text>
                </View>
              ) : (
                runtime?.owners.map((owner) => {
                  const form = ownerForms[owner.ownerId] ?? toOwnerProfileForm(owner);
                  const isSaving = savingOwnerId === owner.ownerId;

                  return (
                    <View key={owner.ownerId} style={styles.ownerCard}>
                      {!OWNER_PROFILE_RECORD_EDITING_ENABLED ? (
                        <View style={styles.readOnlyNotice}>
                          <Ionicons name="information-circle-outline" size={16} color={P.primary} />
                          <Text style={styles.readOnlyNoticeText}>
                            Per-organization owner record updates are temporarily disabled.
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.ownerCardHeader}>
                        <View style={styles.ownerCardHeaderCopy}>
                          <Text style={styles.ownerCardTitle}>{owner.orgName}</Text>
                          <Text style={styles.ownerCardSubtitle}>
                            Owner ID {owner.ownerId}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            owner.isActive ? styles.statusPillActive : styles.statusPillInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              owner.isActive
                                ? styles.statusPillTextActive
                                : styles.statusPillTextInactive,
                            ]}
                          >
                            {owner.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <ProfileField
                        label="Owner Name"
                        value={form.name}
                        onChangeText={(value) =>
                          handleOwnerFieldChange(owner.ownerId, 'name', value)
                        }
                        placeholder="Enter owner profile name"
                        editable={OWNER_PROFILE_RECORD_EDITING_ENABLED}
                      />

                      <ProfileField
                        label="Email"
                        value={form.email}
                        onChangeText={(value) =>
                          handleOwnerFieldChange(owner.ownerId, 'email', value)
                        }
                        placeholder="owner@example.com"
                        keyboardType="email-address"
                        editable={OWNER_PROFILE_RECORD_EDITING_ENABLED}
                      />

                      <ProfileField
                        label="Phone"
                        value={form.phone}
                        onChangeText={(value) =>
                          handleOwnerFieldChange(owner.ownerId, 'phone', value)
                        }
                        placeholder="+971500000001"
                        keyboardType="phone-pad"
                        editable={OWNER_PROFILE_RECORD_EDITING_ENABLED}
                      />

                      <ProfileField
                        label="Address"
                        value={form.address}
                        onChangeText={(value) =>
                          handleOwnerFieldChange(owner.ownerId, 'address', value)
                        }
                        placeholder="Enter owner address"
                        multiline
                        editable={OWNER_PROFILE_RECORD_EDITING_ENABLED}
                      />

                      <TouchableOpacity
                        style={[styles.ownerSaveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={() => void handleSaveOwnerProfile(owner.ownerId)}
                        disabled={isSaving || !OWNER_PROFILE_RECORD_EDITING_ENABLED}
                      >
                        {isSaving ? (
                          <ActivityIndicator color={P.primary} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={18} color={P.primary} />
                            <Text style={styles.ownerSaveButtonText}>
                              {OWNER_PROFILE_RECORD_EDITING_ENABLED
                                ? `Save ${owner.orgName}`
                                : 'Updates Disabled'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      </SafeAreaView>
    </ScreenEntrance>
  );
}

function ProfileField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  editable = true,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  editable?: boolean;
  helperText?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={P.soft}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: P.muted,
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroAvatarImage: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: P.surfaceLow,
  },
  heroAvatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: P.text,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroMetaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.text,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.dangerBg,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: P.dangerText,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: P.text,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: P.text,
    backgroundColor: P.surfaceLow,
    minHeight: 54,
  },
  inputDisabled: {
    color: P.muted,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: P.soft,
  },
  saveButton: {
    marginTop: 4,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: P.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ownerSaveButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ownerSaveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.primary,
  },
  ownerCard: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 22,
    padding: 16,
    backgroundColor: P.surfaceLow,
    marginBottom: 14,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: P.bg,
    borderWidth: 1,
    borderColor: P.border,
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
    fontWeight: '600',
  },
  ownerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  ownerCardHeaderCopy: {
    flex: 1,
  },
  ownerCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
  },
  ownerCardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillActive: {
    backgroundColor: P.successBg,
  },
  statusPillInactive: {
    backgroundColor: P.dangerBg,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextActive: {
    color: P.successText,
  },
  statusPillTextInactive: {
    color: P.dangerText,
  },
  emptyCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: 'center',
  },
});

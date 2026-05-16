import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { WORRY_CATEGORIES, type WorryCategory } from '@midnight-radio/domain';
import { auth } from '../../firebase';
import { confirmAccountDeletionWithCleanup, confirmLogoutWithCleanup } from '../../services/userAccount/accountSession';
import { deleteMyAccountViaApi } from '../../services/userAccount/client';
import { updateMyInterestsViaApi } from '../../services/userProfile/apiClient';
import { validateEditableInterests } from '../../services/userProfile/profileInterests';
import { mapPwaInstallCapability } from '../../services/pwaInstall/policy';
import { loadPolicyDocumentViaApi } from '../../services/policyDocuments/apiClient';
import type { PolicyDocumentResult } from '../../services/policyDocuments/types';
import {
  backRouteForRoute,
  routeAfterAccountDeletion,
  routeToEditInterests,
  routeToMyAnswers,
  routeToMyWorries,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { MY_PAGE_SETTING_ITEMS, type MyPageSettingItem } from './contract';
import { EditInterestsScreen, MyPageScreen, PolicyScreen } from './MyPageScreen';
import { mapProfileToMyPageSummary, mapPushStatus } from './mapping';

type MyPageProfile = {
  readonly nickname?: string;
  readonly interests?: readonly string[];
  readonly age?: number;
  readonly helpedCount?: number;
};

export type MyPageContainerProps = {
  readonly route: AppRouteViewState;
  readonly user: User | null;
  readonly profile: MyPageProfile | null;
  readonly setView: (view: AppRouteViewState) => void;
  readonly setFilterAlert: (message: string) => void;
  readonly notificationPermission: NotificationPermission | 'unsupported';
  readonly pushRegistrationStatus: string;
  readonly requestNotificationPermission: () => void | Promise<void>;
  readonly resetPushRegistrationOnSignOut: () => Promise<void>;
  readonly onAccountDeleted: () => void;
};

export const ACCOUNT_DELETION_SUCCESS_ROUTE = routeAfterAccountDeletion();

export function MyPageContainer(props: MyPageContainerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<readonly WorryCategory[]>([]);
  const [interestsError, setInterestsError] = useState<string | undefined>();
  const [policyDocument, setPolicyDocument] = useState<PolicyDocumentResult | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const currentRoute = typeof props.route === 'string' ? props.route : props.route.route;

  useEffect(() => {
    setSelectedInterests((props.profile?.interests ?? []) as readonly WorryCategory[]);
    setInterestsError(undefined);
  }, [props.profile?.interests]);

  useEffect(() => {
    if (currentRoute !== 'privacy_policy' && currentRoute !== 'operation_policy') {
      setPolicyDocument(null);
      return;
    }

    let cancelled = false;
    setPolicyDocument(null);
    void loadPolicyDocumentViaApi(currentRoute).then(result => {
      if (!cancelled) setPolicyDocument(result);
    });

    return () => {
      cancelled = true;
    };
  }, [currentRoute]);

  const closeConfirmation = () => props.setView(backRouteForRoute(currentRoute));
  const signOutWithCleanup = async () => {
    setIsProcessing(true);
    try {
      const result = await confirmLogoutWithCleanup({
        cleanupLocalPushState: props.resetPushRegistrationOnSignOut,
        signOut: () => signOut(auth),
      });
      if (result.status === 'failed') {
        props.setFilterAlert(result.reason);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  const saveInterests = async () => {
    if (!props.user) return;

    const validation = validateEditableInterests(selectedInterests);
    if (validation.valid === false) {
      setInterestsError(validation.message);
      return;
    }

    setIsProcessing(true);
    setInterestsError(undefined);
    try {
      const result = await updateMyInterestsViaApi({
        user: props.user,
        interests: validation.interests,
      });
      if (result.status !== 'updated') {
        setInterestsError(result.message);
        return;
      }
      props.setView(backRouteForRoute('edit_interests'));
    } catch (error) {
      console.error('Interests update failed:', error);
      setInterestsError('관심 분야 저장 중 문제가 발생했어요.');
    } finally {
      setIsProcessing(false);
    }
  };
  const deleteAccount = async () => {
    if (!props.user) return;

    setIsProcessing(true);
    try {
      const result = await confirmAccountDeletionWithCleanup({
        deleteAccount: async () => {
          const deleteResult = await deleteMyAccountViaApi({ user: props.user as User });
          return deleteResult.status === 'deleted'
            ? { status: 'deleted' as const }
            : { status: 'failed' as const, reason: deleteResult.reason };
        },
        cleanupLocalPushState: props.resetPushRegistrationOnSignOut,
        signOut: () => signOut(auth),
      });
      if (result.status === 'failed') {
        props.setFilterAlert(result.reason);
        return;
      }
      if (result.status === 'completed_with_local_warning') {
        console.warn('Account deletion completed with local cleanup warning:', result.reason);
      }

      props.onAccountDeleted();
    } catch (error) {
      console.error('Account deletion failed:', error);
      props.setFilterAlert('계정 삭제 처리 중 문제가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentRoute === 'privacy_policy' || currentRoute === 'operation_policy') {
    return (
      <PolicyScreen
        policy={currentRoute}
        title={currentRoute === 'privacy_policy' ? '개인정보처리방침' : '운영정책'}
        body={policyDocument?.status === 'ready' ? policyDocument.body : undefined}
        state={policyDocument === null
          ? { status: 'loading', label: '정책 본문을 불러오는 중입니다.' }
          : policyDocument.status === 'ready'
            ? { status: 'ready' }
            : { status: 'empty', message: policyDocument.message }}
        onBack={() => props.setView(backRouteForRoute(props.route))}
      />
    );
  }

  if (currentRoute === 'edit_interests') {
    return (
      <EditInterestsScreen
        categoryOptions={WORRY_CATEGORIES}
        selectedInterests={selectedInterests}
        validationMessages={interestsError ? { interests: interestsError } : {}}
        isProcessing={isProcessing}
        onBack={() => props.setView(backRouteForRoute('edit_interests'))}
        onInterestToggle={(value) => {
          setInterestsError(undefined);
          setSelectedInterests(current => current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value]);
        }}
        onSubmit={saveInterests}
      />
    );
  }

  const pushStatus = mapPushStatus({
    permission: props.notificationPermission,
    registrationStatus: props.pushRegistrationStatus,
  });
  const installCapability = mapPwaInstallCapability({
    hasBeforeInstallPrompt: isInstallable,
    canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    canWriteClipboard: typeof navigator !== 'undefined' && Boolean(navigator.clipboard),
    isIosSafari: typeof navigator !== 'undefined'
      && /iP(hone|ad|od)/.test(navigator.userAgent)
      && /Safari/.test(navigator.userAgent),
  });

  return (
    <MyPageScreen
      profile={mapProfileToMyPageSummary(props.profile)}
      settings={MY_PAGE_SETTING_ITEMS}
      pushSettings={{
        ...pushStatus,
        onOpenSettings: props.requestNotificationPermission,
      }}
      appInstall={{
        canInstall: installCapability.canInstall,
        canShare: installCapability.canShare,
        platformGuidance: installCapability.platformGuidance,
        onInstall: async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice.outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
          }
        },
        onShare: async () => {
          const url = window.location.origin;
          if (navigator.share) {
            await navigator.share({ title: 'Qling', text: '익명으로 고민을 나누고 답장을 주고받는 앱', url });
            return;
          }
          await navigator.clipboard.writeText(url);
          props.setFilterAlert('링크가 복사되었습니다.');
        },
      }}
      logoutConfirmation={{
        isOpen: currentRoute === 'logout_confirmation',
        isProcessing,
        onCancel: closeConfirmation,
        onConfirm: signOutWithCleanup,
      }}
      accountDeletionConfirmation={{
        isOpen: currentRoute === 'account_deletion_confirmation',
        isProcessing,
        onCancel: closeConfirmation,
        onConfirm: deleteAccount,
      }}
      onSettingSelect={(item: MyPageSettingItem) => {
        if (item === 'edit_interests') props.setView(routeToEditInterests());
        if (item === 'my_answers') props.setView(routeToMyAnswers());
        if (item === 'my_worries') props.setView(routeToMyWorries());
        if (item === 'privacy_policy') props.setView('privacy_policy');
        if (item === 'operation_policy') props.setView('operation_policy');
        if (item === 'push_notification_settings') props.setView('notification_settings');
        if (item === 'app_install_guide') props.setView('app_install_guide');
        if (item === 'logout') props.setView('logout_confirmation');
        if (item === 'delete_account') props.setView('account_deletion_confirmation');
      }}
    />
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

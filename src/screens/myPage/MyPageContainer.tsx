import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { deleteMyAccountViaApi } from '../../services/userAccount/client';
import {
  backRouteForRoute,
  routeToEditInterests,
  routeToMyAnswers,
  routeToMyWorries,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { MY_PAGE_SETTING_ITEMS, type MyPageSettingItem } from './contract';
import { EditInterestsStubScreen, MyPageScreen, PolicyScreen } from './MyPageScreen';
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
};

export function MyPageContainer(props: MyPageContainerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
  const closeConfirmation = () => props.setView(backRouteForRoute(currentRoute));
  const signOutWithCleanup = async () => {
    setIsProcessing(true);
    try {
      await props.resetPushRegistrationOnSignOut();
      await signOut(auth);
    } finally {
      setIsProcessing(false);
    }
  };
  const deleteAccount = async () => {
    if (!props.user) return;

    setIsProcessing(true);
    try {
      const result = await deleteMyAccountViaApi({ user: props.user });
      if (result.status === 'failed') {
        props.setFilterAlert(result.reason);
        return;
      }

      props.setView(backRouteForRoute('account_deletion_confirmation'));
      try {
        await props.resetPushRegistrationOnSignOut();
      } catch (cleanupError) {
        console.error('Local push cleanup after account deletion failed:', cleanupError);
      }
      await signOut(auth);
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
        state={{ status: 'empty', message: '정책 본문 준비 중입니다.' }}
        onBack={() => props.setView(backRouteForRoute(props.route))}
      />
    );
  }

  if (currentRoute === 'edit_interests') {
    return (
      <EditInterestsStubScreen
        interests={props.profile?.interests ?? []}
        onBack={() => props.setView(backRouteForRoute('edit_interests'))}
      />
    );
  }

  const pushStatus = mapPushStatus({
    permission: props.notificationPermission,
    registrationStatus: props.pushRegistrationStatus,
  });
  const installGuidance = isInstallable
    ? 'android-install'
    : typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      ? 'share-url-or-qr'
      : 'ios-share-to-home';

  return (
    <MyPageScreen
      profile={mapProfileToMyPageSummary(props.profile)}
      settings={MY_PAGE_SETTING_ITEMS}
      pushSettings={{
        ...pushStatus,
        onOpenSettings: props.requestNotificationPermission,
      }}
      appInstall={{
        canInstall: isInstallable,
        canShare: typeof navigator !== 'undefined' && (typeof navigator.share === 'function' || Boolean(navigator.clipboard)),
        platformGuidance: installGuidance,
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

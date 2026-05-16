import type { WorryCategory } from '@midnight-radio/domain';
import type { FieldValidationMessages, ScreenAsyncState } from '../shared/contract';

export const HELPED_COUNT_LABEL = '받은 하트' as const;

export type MyPageProfileSummaryProps = {
  readonly nickname: string;
  readonly interests: readonly WorryCategory[];
  readonly ageLabel?: string;
  readonly helpedCount: number;
  readonly helpedCountLabel: typeof HELPED_COUNT_LABEL;
  readonly profileMotif: {
    readonly kind: 'visual-only';
    readonly label: string;
  };
};

export const MY_PAGE_POLICY_SETTING_ITEMS = ['privacy_policy', 'operation_policy'] as const;

export const MY_PAGE_SETTING_ITEMS = [
  'edit_interests',
  'my_answers',
  'my_worries',
  'privacy_policy',
  'operation_policy',
  'app_install_guide',
  'push_notification_settings',
  'logout',
  'delete_account',
] as const;

export type MyPageSettingItem = (typeof MY_PAGE_SETTING_ITEMS)[number];
export type MyPagePolicySettingItem = (typeof MY_PAGE_POLICY_SETTING_ITEMS)[number];

export const PUSH_PERMISSION_STATUSES = [
  'default',
  'granted',
  'denied',
  'unsupported',
  'registered',
  'error',
] as const;

export type PushPermissionStatus = (typeof PUSH_PERMISSION_STATUSES)[number];

export type PushSettingsAccessProps = {
  readonly status: PushPermissionStatus;
  readonly message?: string;
  readonly onOpenSettings: () => void;
};

export type AppInstallAccessProps = {
  readonly canInstall: boolean;
  readonly canShare: boolean;
  readonly platformGuidance: 'android-install' | 'ios-share-to-home' | 'share-url-or-qr' | 'unsupported';
  readonly onInstall?: () => void;
  readonly onShare?: () => void;
};

export type ConfirmationProps = {
  readonly isOpen: boolean;
  readonly isProcessing: boolean;
  readonly errorMessage?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export type PolicyScreenProps = {
  readonly policy: MyPagePolicySettingItem;
  readonly title: string;
  readonly body?: string;
  readonly state: ScreenAsyncState;
};

export type EditInterestsProps = {
  readonly selectedInterests: readonly WorryCategory[];
  readonly validationMessages: FieldValidationMessages<'interests'>;
  readonly isProcessing: boolean;
  readonly onInterestToggle: (value: WorryCategory) => void;
  readonly onSubmit: () => void;
};

export type MyPageScreenProps = {
  readonly profile: MyPageProfileSummaryProps;
  readonly settings: readonly MyPageSettingItem[];
  readonly pushSettings: PushSettingsAccessProps;
  readonly appInstall: AppInstallAccessProps;
  readonly logoutConfirmation: ConfirmationProps;
  readonly accountDeletionConfirmation: ConfirmationProps;
  readonly onSettingSelect: (item: MyPageSettingItem) => void;
};

export type MyAnswerListItemProps = {
  readonly replyId: string;
  readonly deliveryId?: string;
  readonly worryId?: string;
  readonly previewText: string;
  readonly feedbackLabel?: string;
};

export type MyAnswersScreenProps = {
  readonly state: ScreenAsyncState;
  readonly items: readonly MyAnswerListItemProps[];
  readonly onBack: () => void;
  readonly onSelect: (item: MyAnswerListItemProps) => void;
};

export type MyWorryListItemProps = {
  readonly worryId: string;
  readonly contentPreview: string;
  readonly categoryLabel: string;
  readonly replyCount: number;
  readonly hasUnreadReplies: boolean;
  readonly isSelected: boolean;
};

export type ReceivedReplyListItemProps = {
  readonly replyId: string;
  readonly worryId?: string;
  readonly previewText: string;
  readonly hasUnread: boolean;
};

export type MyWorriesScreenProps = {
  readonly state: ScreenAsyncState;
  readonly items: readonly MyWorryListItemProps[];
  readonly selectedWorry?: {
    readonly worryId: string;
    readonly content: string;
    readonly repliesState: ScreenAsyncState;
    readonly replies: readonly ReceivedReplyListItemProps[];
  };
  readonly onWriteWorry: () => void;
  readonly onSelectWorry: (item: MyWorryListItemProps) => void;
  readonly onSelectReply: (item: ReceivedReplyListItemProps) => void;
};

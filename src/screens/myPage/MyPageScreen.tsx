import type { ReactNode } from 'react';
import { ArrowLeft, Bell, Heart, QrCode, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CategoryChip,
  ContentSheet,
  LoadingState,
  OrangeHeaderBand,
  PolicyTextContainer,
  PrimaryCTA,
  ProfileMotif,
  QlingCard,
  QlingDialog,
  SecondaryCTA,
  SettingsRow,
} from '../shared/ui';
import type {
  AppInstallAccessProps,
  ConfirmationProps,
  EditInterestsProps,
  MyPageScreenProps,
  MyPageSettingItem,
  PolicyScreenProps,
  PushPermissionStatus,
} from './contract';

const settingLabels: Record<MyPageSettingItem, string> = {
  edit_interests: '관심 분야 수정',
  my_answers: '내가 쓴 답변',
  my_worries: '나의 고민',
  privacy_policy: '개인정보처리방침',
  operation_policy: '운영정책',
  app_install_guide: '앱처럼 사용하기',
  push_notification_settings: '푸시 알림 설정',
  logout: '로그아웃',
  delete_account: '계정 삭제',
};

const settingDescriptions: Partial<Record<MyPageSettingItem, string>> = {
  edit_interests: '답변하고 싶은 주제를 다시 선택합니다.',
  my_answers: '내가 작성한 답변을 확인합니다.',
  my_worries: '내가 작성한 고민과 받은 답장을 확인합니다.',
  privacy_policy: '개인정보 처리 기준을 확인합니다.',
  operation_policy: '서비스 운영 기준을 확인합니다.',
  app_install_guide: '설치, 공유, QR로 Qling을 다시 엽니다.',
  push_notification_settings: '알림 권한과 등록 상태를 확인합니다.',
  logout: '현재 기기에서 로그아웃합니다.',
  delete_account: '계정과 연결된 데이터를 삭제합니다.',
};

const pushStatusLabels: Record<PushPermissionStatus, string> = {
  default: '알림 권한 설정이 필요합니다.',
  granted: '알림 권한이 허용되었습니다.',
  denied: '알림 권한이 거부되었습니다.',
  unsupported: '이 브라우저는 알림을 지원하지 않습니다.',
  registered: '알림 등록이 완료되었습니다.',
  error: '알림 등록에 실패했습니다.',
};

const platformGuidanceLabels: Record<AppInstallAccessProps['platformGuidance'], string> = {
  'android-install': 'Android/Chrome에서는 설치 버튼으로 홈 화면에 추가할 수 있습니다.',
  'ios-share-to-home': 'iOS Safari에서는 공유 버튼에서 홈 화면에 추가를 선택하세요.',
  'share-url-or-qr': '현재 URL 공유 또는 QR로 다시 접속할 수 있습니다.',
  unsupported: '이 브라우저에서는 설치가 제한되어 URL 공유를 사용할 수 있습니다.',
};

export function MyPageScreen(props: MyPageScreenProps) {
  return (
    <div className="space-y-6">
      <OrangeHeaderBand className="space-y-2">
        <p className="text-sm font-bold opacity-85">마이페이지</p>
        <h1 className="text-2xl font-extrabold">내 프로필과 계정</h1>
      </OrangeHeaderBand>

      <QlingCard className="flex items-start gap-4">
        <ProfileMotif label={props.profile.profileMotif.label} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-[var(--qling-color-text)]">{props.profile.nickname}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[var(--qling-color-muted)]">
                <Heart className="h-4 w-4 fill-[var(--qling-color-danger)] text-[var(--qling-color-danger)]" aria-hidden="true" />
                <span className="text-[var(--qling-color-danger)]">{props.profile.helpedCount}</span>
                <span>{props.profile.helpedCountLabel}</span>
              </p>
            </div>
            <SecondaryCTA
              onClick={() => props.onSettingSelect('edit_interests')}
              accessibilityLabel="관심 분야 수정으로 이동"
            >
              관심 분야 수정
            </SecondaryCTA>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="내 관심 분야">
            {props.profile.interests.length === 0 ? (
              <span className="text-xs font-semibold text-[var(--qling-color-muted)]">관심 분야가 아직 없습니다.</span>
            ) : props.profile.interests.map(interest => (
              <span key={interest} className="rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-cream-soft)] px-3 py-1 text-xs font-bold text-[var(--qling-color-primary-orange)]">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </QlingCard>

      <ContentSheet className="space-y-4">
        <SectionTitle icon={<Bell className="h-5 w-5" aria-hidden="true" />} title="푸시 알림 설정" />
        <p className="text-sm font-semibold text-[var(--qling-color-text)]">{pushStatusLabels[props.pushSettings.status]}</p>
        {props.pushSettings.message && (
          <p className="text-sm leading-6 text-[var(--qling-color-muted)]">{props.pushSettings.message}</p>
        )}
        <PrimaryCTA onClick={props.pushSettings.onOpenSettings} accessibilityLabel="푸시 알림 설정 열기">
          알림 설정 열기
        </PrimaryCTA>
      </ContentSheet>

      <ContentSheet className="space-y-4">
        <SectionTitle icon={<QrCode className="h-5 w-5" aria-hidden="true" />} title="앱처럼 사용하기" />
        <p className="text-sm leading-6 text-[var(--qling-color-muted)]">
          {platformGuidanceLabels[props.appInstall.platformGuidance]}
        </p>
        {props.appInstall.shareUrl && (
          <div className="mx-auto w-fit rounded-[var(--qling-radius-card)] bg-white p-4 shadow-[var(--qling-shadow-card)]" aria-label="Qling 공유 QR">
            <QRCodeSVG value={props.appInstall.shareUrl} size={112} level="H" />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {props.appInstall.onInstall && (
            <PrimaryCTA
              onClick={props.appInstall.onInstall}
              disabled={!props.appInstall.canInstall}
              accessibilityLabel="Qling 앱 설치"
            >
              설치하기
            </PrimaryCTA>
          )}
          {props.appInstall.onShare && (
            <SecondaryCTA
              onClick={props.appInstall.onShare}
              disabled={!props.appInstall.canShare}
              accessibilityLabel="Qling 링크 공유"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              공유하기
            </SecondaryCTA>
          )}
        </div>
      </ContentSheet>

      <ContentSheet>
        <h2 className="mb-1 text-base font-extrabold text-[var(--qling-color-text)]">더보기</h2>
        <div>
          {props.settings.map(item => (
            <SettingsRow
              key={item}
              label={settingLabels[item]}
              description={settingDescriptions[item]}
              danger={item === 'delete_account'}
              accessibilityLabel={`${settingLabels[item]}으로 이동`}
              onSelect={() => props.onSettingSelect(item)}
            />
          ))}
        </div>
      </ContentSheet>

      <ConfirmationDialog title="로그아웃할까요?" description="이 기기에서 Qling 계정 연결을 해제합니다." confirmLabel="로그아웃" confirmation={props.logoutConfirmation} />
      <ConfirmationDialog title="계정을 삭제할까요?" description="계정 삭제는 되돌릴 수 없습니다. 작성한 고민과 답변 접근도 함께 중단됩니다." confirmLabel="계정 삭제" confirmation={props.accountDeletionConfirmation} destructive />
    </div>
  );
}

export function PolicyScreen(props: PolicyScreenProps & { readonly onBack: () => void }) {
  const policyBody = props.body?.trim();

  return (
    <div className="space-y-5">
      <BackButton onBack={props.onBack} label="마이페이지로" />
      {props.state.status === 'loading' ? (
        <LoadingState title={props.title} message={props.state.label} />
      ) : props.state.status === 'error' ? (
        <PolicyTextContainer state="error" title={props.title} message={props.state.message} />
      ) : policyBody ? (
        <PolicyTextContainer state="body" title={props.title} body={policyBody} />
      ) : (
        <PolicyTextContainer
          state="empty"
          title={props.title}
          message={props.state.status === 'empty' ? props.state.message : '정책 본문을 준비 중입니다.'}
        />
      )}
    </div>
  );
}

export function EditInterestsScreen(props: EditInterestsProps) {
  const hasValidationError = Boolean(props.validationMessages.interests);

  return (
    <div className="space-y-5">
      <BackButton onBack={props.onBack} label="마이페이지로" />
      <OrangeHeaderBand className="space-y-2">
        <p className="text-sm font-bold opacity-85">관심 분야 수정</p>
        <h1 className="text-2xl font-extrabold">주요 관심사는 무엇인가요?</h1>
      </OrangeHeaderBand>
      <ContentSheet className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--qling-color-text)]">최소 1개 선택, 복수 선택 가능</p>
          <p className="text-xs leading-5 text-[var(--qling-color-muted)]">변경사항은 저장하기를 눌러야 반영돼요.</p>
        </div>
        <div className="grid grid-cols-3 gap-2" aria-label="관심 분야 선택">
          {props.categoryOptions.map(interest => (
            <CategoryChip
              key={interest}
              label={interest}
              selected={props.selectedInterests.includes(interest)}
              disabled={props.isProcessing}
              onSelect={() => props.onInterestToggle(interest)}
              className="min-h-11 w-full justify-center px-2"
            />
          ))}
        </div>
        {hasValidationError && (
          <p className="text-sm font-semibold text-[var(--qling-color-danger)]" role="alert">
            {props.validationMessages.interests}
          </p>
        )}
        <PrimaryCTA
          onClick={props.onSubmit}
          disabled={props.isProcessing}
          processing={props.isProcessing}
          accessibilityLabel="관심 분야 저장"
        >
          {props.isProcessing ? '저장 중' : '저장하기'}
        </PrimaryCTA>
      </ContentSheet>
    </div>
  );
}

function ConfirmationDialog(props: {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly confirmation: ConfirmationProps;
  readonly destructive?: boolean;
}) {
  return (
    <QlingDialog
      isOpen={props.confirmation.isOpen}
      title={props.title}
      description={props.description}
      cancelLabel="취소"
      confirmLabel={props.confirmation.isProcessing ? '처리 중' : props.confirmLabel}
      destructive={props.destructive}
      processing={props.confirmation.isProcessing}
      errorMessage={props.confirmation.errorMessage}
      onCancel={props.confirmation.onCancel}
      onConfirm={props.confirmation.onConfirm}
    />
  );
}

function BackButton({ onBack, label }: { readonly onBack: () => void; readonly label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-[var(--qling-radius-small-button)] px-2 py-1 text-sm font-bold text-[var(--qling-color-muted)] transition-colors hover:text-[var(--qling-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SectionTitle({ icon, title }: { readonly icon: ReactNode; readonly title: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--qling-color-text)]">
      <span className="text-[var(--qling-color-primary-orange)]">{icon}</span>
      <h2 className="text-base font-extrabold">{title}</h2>
    </div>
  );
}

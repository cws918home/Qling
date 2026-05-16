import { ArrowLeft, Bell, Heart, QrCode, Send, Share2, Shield, Sparkles, Trash2, UserRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type {
  ConfirmationProps,
  MyPageScreenProps,
  MyPageSettingItem,
  PolicyScreenProps,
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

export function MyPageScreen(props: MyPageScreenProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-bold">마이페이지</h2>
        <p className="text-[#8B8B6B] text-sm">내 프로필과 계정 설정을 확인합니다.</p>
      </div>

      <section className="flex items-center gap-4 bg-[#FAEDCD]/50 p-6 rounded-2xl border border-[#FAEDCD]">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#E07A5F] shadow-sm" aria-label={props.profile.profileMotif.label}>
          <Heart className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#5A5A40]">{props.profile.nickname}</h2>
          <p className="text-[#8B8B6B] text-sm">
            {props.profile.helpedCountLabel} <strong className="text-[#E07A5F]">{props.profile.helpedCount}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {props.profile.interests.length === 0 ? (
              <span className="text-xs text-[#8B8B6B]">관심 분야 없음</span>
            ) : props.profile.interests.map(interest => (
              <span key={interest} className="px-2 py-1 rounded-full bg-white text-xs font-bold text-[#5A5A40]">{interest}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#D4A373]" />
            <div>
              <h3 className="font-bold text-[#5A5A40]">푸시 알림 설정</h3>
              <p className="text-xs text-[#8B8B6B]">{props.pushSettings.message ?? props.pushSettings.status}</p>
            </div>
          </div>
          <button onClick={props.pushSettings.onOpenSettings} className="px-3 py-2 rounded-xl bg-[#E07A5F] text-white text-xs font-bold">
            설정
          </button>
        </div>
      </section>

      <section className="bg-[#5A5A40] p-6 rounded-2xl text-white space-y-5">
        <div className="flex items-center gap-3">
          <QrCode className="w-5 h-5 text-[#FAEDCD]" />
          <div>
            <h3 className="font-bold">앱처럼 사용하기</h3>
            <p className="text-xs text-[#FAEDCD]/80">{props.appInstall.platformGuidance}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl w-fit mx-auto">
          <QRCodeSVG value={window.location.origin} size={120} level="H" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {props.appInstall.onInstall && (
            <button onClick={props.appInstall.onInstall} disabled={!props.appInstall.canInstall} className="py-3 bg-[#E07A5F] text-white rounded-xl text-sm font-bold disabled:opacity-50">
              설치하기
            </button>
          )}
          {props.appInstall.onShare && (
            <button onClick={props.appInstall.onShare} disabled={!props.appInstall.canShare} className="py-3 bg-white/10 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" /> 공유하기
            </button>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-3">
        <h3 className="font-bold text-[#5A5A40]">더보기</h3>
        <div className="grid gap-2">
          {props.settings.map(item => (
            <button
              key={item}
              onClick={() => props.onSettingSelect(item)}
              className={`w-full p-4 rounded-xl text-left flex items-center gap-3 border ${item === 'delete_account' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-[#FDFCF8] border-[#E9EDC9] text-[#5A5A40]'}`}
            >
              {iconForSetting(item)}
              <span className="font-bold text-sm">{settingLabels[item]}</span>
            </button>
          ))}
        </div>
      </section>

      <ConfirmationDialog title="로그아웃할까요?" description="이 기기에서 Qling 계정 연결을 해제합니다." confirmLabel="로그아웃" confirmation={props.logoutConfirmation} />
      <ConfirmationDialog title="계정을 삭제할까요?" description="삭제 후에는 이 계정으로 고민 쓰기, 답장, 패스, 피드백을 사용할 수 없습니다." confirmLabel="삭제" confirmation={props.accountDeletionConfirmation} destructive />
    </div>
  );
}

export function PolicyScreen(props: PolicyScreenProps & { readonly onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button onClick={props.onBack} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
        <ArrowLeft className="w-4 h-4" /> 마이페이지로
      </button>
      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-bold">{props.title}</h2>
        <p className="text-[#8B8B6B] text-sm">{props.state.status === 'empty' || props.state.status === 'error' ? props.state.message : '정책 본문 준비 중입니다.'}</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] text-sm text-[#8B8B6B] leading-relaxed whitespace-pre-wrap">
        {props.body || '정책 본문 준비 중입니다.'}
      </div>
    </div>
  );
}

export function EditInterestsStubScreen(props: { readonly interests: readonly string[]; readonly onBack: () => void }) {
  return (
    <div className="space-y-8">
      <button onClick={props.onBack} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
        <ArrowLeft className="w-4 h-4" /> 마이페이지로
      </button>
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-serif font-bold text-[#5A5A40]">관심 분야 수정</h1>
        <p className="text-[#8B8B6B]">관심 분야 수정 기능은 다음 단계에서 실제 저장 흐름과 연결됩니다.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-4">
        <div className="text-xs font-bold text-[#D4A373]">현재 관심 분야</div>
        <div className="flex flex-wrap gap-2">
          {props.interests.map(interest => (
            <span key={interest} className="px-3 py-1 rounded-full bg-[#FAEDCD] text-xs font-bold text-[#5A5A40]">{interest}</span>
          ))}
        </div>
      </div>
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
  if (!props.confirmation.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="font-bold text-lg text-gray-800">{props.title}</p>
          <p className="text-sm text-[#8B8B6B] leading-relaxed">{props.description}</p>
          {props.confirmation.errorMessage && <p className="text-sm text-red-500">{props.confirmation.errorMessage}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={props.confirmation.onCancel} disabled={props.confirmation.isProcessing} className="py-3 bg-[#FDFCF8] border border-[#E9EDC9] text-[#5A5A40] rounded-xl font-bold disabled:opacity-50">
            취소
          </button>
          <button onClick={props.confirmation.onConfirm} disabled={props.confirmation.isProcessing} className={`py-3 text-white rounded-xl font-bold disabled:opacity-50 ${props.destructive ? 'bg-red-500' : 'bg-[#5A5A40]'}`}>
            {props.confirmation.isProcessing ? '처리 중...' : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function iconForSetting(item: MyPageSettingItem) {
  if (item === 'edit_interests') return <Sparkles className="w-5 h-5 text-[#A3B18A]" />;
  if (item === 'my_answers') return <Send className="w-5 h-5 text-[#A3B18A]" />;
  if (item === 'my_worries') return <UserRound className="w-5 h-5 text-[#A3B18A]" />;
  if (item === 'privacy_policy' || item === 'operation_policy') return <Shield className="w-5 h-5 text-[#A3B18A]" />;
  if (item === 'delete_account') return <Trash2 className="w-5 h-5 text-red-500" />;
  if (item === 'logout') return <ArrowLeft className="w-5 h-5 text-[#8B8B6B]" />;
  if (item === 'push_notification_settings') return <Bell className="w-5 h-5 text-[#A3B18A]" />;
  return <QrCode className="w-5 h-5 text-[#A3B18A]" />;
}

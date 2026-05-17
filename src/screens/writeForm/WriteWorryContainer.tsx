import { useState, type Dispatch, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { publishWorryViaApi } from '../../services/worryPublication/apiClient';
import {
  backRouteFromWriteWorry,
  resolveAppRouteState,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import {
  clearStoredDraft,
  getStoredDraft,
  setStoredDraft,
  WRITE_WORRY_DRAFT_KEY,
} from '../../services/drafts/contentDrafts';
import { CONTENT_MAX_LENGTH, validateDraftContent } from '../../services/validation/content';
import type { ScreenModerationState } from '../shared/contract';
import { resolveWorryPublicationResult } from './containerPolicy';
import { buildWriteDraftContract } from './mapping';
import { WriteFormScreen } from './WriteFormScreen';

export type WriteWorryContainerProps = {
  readonly user: User | null;
  readonly profile: { readonly uid: string } | null;
  readonly setView: Dispatch<SetStateAction<AppRouteViewState>>;
  readonly clearSelectedMyWorry: () => void;
  readonly setFilterAlert: (message: string) => void;
};

export function WriteWorryContainer(props: WriteWorryContainerProps) {
  const [draft, setDraft] = useState(() => getStoredDraft(WRITE_WORRY_DRAFT_KEY));
  const [isProcessing, setIsProcessing] = useState(false);
  const [moderation, setModeration] = useState<ScreenModerationState>({ status: 'idle' });
  const validation = validateDraftContent(draft, 'worry');

  const publish = async () => {
    if (isProcessing) return;
    const currentValidation = validateDraftContent(draft, 'worry');
    if (currentValidation.status !== 'valid') {
      setModeration({ status: 'failed', message: currentValidation.message });
      return;
    }
    if (!props.user || !props.profile) {
      props.setFilterAlert('로그인 정보가 없습니다.');
      setModeration({ status: 'failed', message: '로그인 정보가 없습니다.' });
      return;
    }

    setIsProcessing(true);
    setModeration({ status: 'checking' });
    try {
      const result = await publishWorryViaApi({
        user: props.user,
        content: currentValidation.content,
      });
      const policy = resolveWorryPublicationResult(result);

      setModeration(policy.moderation);
      if (policy.alertMessage) props.setFilterAlert(policy.alertMessage);
      if (!policy.clearDraft || !policy.route) {
        return;
      }

      if (result.status === 'published' && result.warnings.length > 0) {
        console.warn('Worry publication completed with warnings:', result.warnings);
      }

      setDraft('');
      clearStoredDraft(WRITE_WORRY_DRAFT_KEY);
      props.clearSelectedMyWorry();
      props.setView(prev => resolveAppRouteState(prev, policy.route));
      window.scrollTo(0, 0);
    } catch (e) {
      const message = `전송 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`;
      console.error('Publication Error:', e);
      setModeration({ status: 'failed', message });
      props.setFilterAlert(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative h-[852px] w-[393px] overflow-hidden bg-[#fff1d1] font-sans text-[#2a2a2a]">
      <ReferenceStatusBar />
      <button
        type="button"
        onClick={() => props.setView(backRouteFromWriteWorry())}
        className="absolute left-[22px] top-[56px] z-10 h-[32px] w-[18px] text-[32px] font-semibold leading-none text-[#2a2a2a] transition-colors hover:text-[#ff8b3d] focus:outline-none focus:ring-2 focus:ring-[#ff8b3d]"
        aria-label="나의 고민으로 돌아가기"
      >
        <span aria-hidden="true">‹</span>
        <ArrowLeft className="sr-only" aria-hidden="true" />
      </button>
      <header>
        <h2 className="absolute left-[163.5px] top-[69px] text-[17px] font-extrabold leading-none tracking-[-0.34px] text-[#2a2a2a]">질문 작성</h2>
      </header>

      <WriteFormScreen
        kind="write-worry"
        draft={buildWriteDraftContract({
          value: draft,
          maxLength: CONTENT_MAX_LENGTH,
          validation,
          moderation,
          isProcessing,
        })}
        onDraftChange={value => {
          setDraft(value);
          setStoredDraft(WRITE_WORRY_DRAFT_KEY, value);
          setModeration({ status: 'idle' });
        }}
        onPublish={publish}
      />
    </div>
  );
}

function ReferenceStatusBar() {
  return (
    <>
      <p className="absolute left-[30px] top-[18px] text-[16px] font-semibold leading-none text-[#25272b]">10:46</p>
      <div className="absolute left-[295px] top-[28px] h-[4px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
      <div className="absolute left-[300px] top-[26px] h-[6px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
      <div className="absolute left-[305px] top-[24px] h-[8px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
      <div className="absolute left-[310px] top-[22px] h-[10px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
      <div className="absolute left-[350px] top-[22px] h-[12px] w-[26px] rounded-[3px] border-[1.5px] border-[#1a1a1a]" />
      <div className="absolute left-[377px] top-[25px] h-[6px] w-[2px] rounded-[1px] border border-[#1a1a1a] bg-white" />
      <div className="absolute left-[352px] top-[24.5px] h-[7px] w-[16px] rounded-[1px] border border-[#1a1a1a] bg-[#1a1a1a]" />
    </>
  );
}

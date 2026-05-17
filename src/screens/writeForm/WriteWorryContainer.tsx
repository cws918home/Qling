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
    <div className="space-y-5 pb-4">
      <button
        onClick={() => props.setView(backRouteFromWriteWorry())}
        className="flex items-center gap-2 text-sm font-bold text-[var(--qling-color-muted)] transition-colors hover:text-[var(--qling-color-text)]"
        aria-label="나의 고민으로 돌아가기"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> 돌아가기
      </button>
      <header className="text-center">
        <h2 className="text-lg font-extrabold text-[var(--qling-color-text)]">질문 작성</h2>
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

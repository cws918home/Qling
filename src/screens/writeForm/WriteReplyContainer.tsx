import { useState, type Dispatch, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { publishReplyViaApi } from '../../services/replyPublication/apiClient';
import {
  backRouteFromWriteReply,
  resolveAppRouteState,
  routeAfterReplyPublish,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { clearDraft, getDraft, setDraft, type DraftMap } from '../../services/drafts/contentDrafts';
import { CONTENT_MAX_LENGTH, validateDraftContent } from '../../services/validation/content';
import type { SelectedReceivedWorry } from '../receivedWorries/ReceivedWorriesContainer';
import type { ScreenModerationState } from '../shared/contract';
import { buildWriteDraftContract, mapSelectedWorryToOriginalWorrySummary } from './mapping';
import { WriteFormScreen } from './WriteFormScreen';

export type WriteReplyContainerProps = {
  readonly user: User | null;
  readonly selectedWorry: SelectedReceivedWorry;
  readonly setView: Dispatch<SetStateAction<AppRouteViewState>>;
  readonly clearSelectedWorry: () => void;
  readonly clearSelectedReply: () => void;
  readonly setFilterAlert: (message: string) => void;
};

export function WriteReplyContainer(props: WriteReplyContainerProps) {
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [moderation, setModeration] = useState<ScreenModerationState>({ status: 'idle' });
  const originalWorry = mapSelectedWorryToOriginalWorrySummary(props.selectedWorry);
  const draft = getDraft(drafts, props.selectedWorry.deliveryId);
  const validation = validateDraftContent(draft, 'reply');

  if (!originalWorry) {
    return (
      <div>
        <button
          onClick={() => props.setView(backRouteFromWriteReply())}
          className="mb-6 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 돌아가기
        </button>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm text-red-700">
          이전 형식의 고민에는 새 답장을 보낼 수 없습니다.
        </div>
      </div>
    );
  }

  const publish = async (target: { readonly deliveryId: string; readonly worryId: string }) => {
    const currentDraft = getDraft(drafts, target.deliveryId);
    const currentValidation = validateDraftContent(currentDraft, 'reply');
    if (currentValidation.status !== 'valid') {
      setModeration({ status: 'failed', message: currentValidation.message });
      return;
    }
    if (!props.user) return;
    if (!target.deliveryId) {
      const message = '이전 형식의 고민에는 새 답장을 보낼 수 없습니다.';
      setModeration({ status: 'failed', message });
      props.setFilterAlert(message);
      return;
    }

    setIsProcessing(true);
    setModeration({ status: 'checking' });
    try {
      const result = await publishReplyViaApi({
        user: props.user,
        deliveryId: target.deliveryId,
        content: currentValidation.content,
      });

      if (result.status === 'rejected') {
        const message = result.userMessage ?? result.reason ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        setModeration({ status: 'rejected', reason: message, helpMessage: result.helpMessage });
        props.setFilterAlert(result.helpMessage ? `${message}\n\n${result.helpMessage}` : message);
        return;
      }

      if (result.status === 'failed') {
        const message = result.reason || '답장 전송 실패';
        setModeration({ status: 'failed', message });
        props.setFilterAlert(message);
        return;
      }

      props.setView(prev => resolveAppRouteState(prev, routeAfterReplyPublish({
        replyId: result.replyId,
        deliveryId: target.deliveryId,
        worryId: target.worryId,
      })));
      setDrafts(prev => clearDraft(prev, target.deliveryId));
      setModeration({ status: 'approved' });
      props.clearSelectedWorry();
      props.clearSelectedReply();
    } catch (e) {
      console.error(e);
      setModeration({ status: 'failed', message: '답장 전송 실패' });
      props.setFilterAlert('답장 전송 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => props.setView(backRouteFromWriteReply())}
        className="mb-6 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 돌아가기
      </button>
      <h2 className="text-2xl font-serif font-bold mb-2">위로를 건네주세요</h2>

      <WriteFormScreen
        kind="write-reply"
        originalWorry={originalWorry}
        draft={buildWriteDraftContract({
          value: draft,
          maxLength: CONTENT_MAX_LENGTH,
          validation,
          moderation,
          isProcessing,
        })}
        onDraftChange={value => {
          setDrafts(prev => setDraft(prev, originalWorry.deliveryId, value));
          setModeration({ status: 'idle' });
        }}
        onPublish={publish}
      />
    </div>
  );
}

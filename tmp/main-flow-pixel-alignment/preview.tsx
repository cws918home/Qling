import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { ReceivedWorriesScreen } from '../../src/screens/receivedWorries/ReceivedWorriesScreen';
import { WriteFormScreen } from '../../src/screens/writeForm/WriteFormScreen';
import { ReplyDetailScreen } from '../../src/screens/replyDetail/ReplyDetailScreen';
import { BottomNavigation, MobileAppShell } from '../../src/screens/shared/ui';
import {
  CENTRAL_BOTTOM_NAVIGATION_ACTION,
  PRD_APP_TABS,
  type PrdAppTab,
} from '../../src/services/appShell/prdNavigationPolicy';
import type { ReceivedWorryFeedItem } from '../../src/screens/receivedWorries/contract';
import type { WriteDraftContract } from '../../src/screens/writeForm/contract';
import type { ReplyDetailScreenProps } from '../../src/screens/replyDetail/contract';

const receivedItems: readonly ReceivedWorryFeedItem[] = [
  {
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
    category: '학업',
    receivedAt: { label: '3분 전', isoValue: '2026-05-18T01:43:00.000Z' },
    previewText: '시험이 얼마 안 남았는데 2일 동안 밤새면 A+ 받을 수 있을까요?',
    isUnread: true,
  },
  {
    deliveryId: 'delivery-2',
    worryId: 'worry-2',
    category: '소득',
    receivedAt: { label: '8분 전', isoValue: '2026-05-18T01:38:00.000Z' },
    previewText: 'SOXS 숏으로 700만원 날렸습니다. 앞으로 인생 어떡하나요?',
    isUnread: false,
  },
  {
    deliveryId: 'delivery-3',
    worryId: 'worry-3',
    category: '불안',
    receivedAt: { label: '2시간 전', isoValue: '2026-05-17T23:46:00.000Z' },
    previewText: '오늘도 잠 안온다... 자려고 누우면 오늘 했던 말실수부터 내일 스케줄까지 오만가지 생각이 드는데 대...',
    isUnread: false,
  },
  {
    deliveryId: 'delivery-4',
    worryId: 'worry-4',
    category: '잡담',
    receivedAt: { label: '3시간 전', isoValue: '2026-05-17T22:46:00.000Z' },
    previewText: '야구 팀 하나 정해서 응원하려고 하는데 무슨 팀으로 할까요 추천 부탁드립니다',
    isUnread: false,
  },
];

const writeDraft: WriteDraftContract = {
  value: '',
  characterCount: 0,
  maxLength: 1000,
  validation: { status: 'valid' },
  moderation: { status: 'idle' },
  isProcessing: false,
  submitDisabledReason: 'empty',
};

const replyDetailProps: ReplyDetailScreenProps = {
  variant: 'received-answer-detail',
  state: { status: 'ready' },
  originalWorry: {
    worryId: 'worry-5',
    category: '외모',
    summaryText: '꾸미고 싶긴 한데 안 꾸며봐서 어떻게 꾸며야 할 지 잘 모르겠어요, 뭐부터 하는게 좋을까요',
    bodyText: '꾸미고 싶긴 한데 안 꾸며봐서 어떻게 꾸며야 할 지 잘 모르겠어요, 뭐부터 하는게 좋을까요',
    date: { label: '2026.05.02', isoValue: '2026-05-02T00:00:00.000Z' },
    isUnread: false,
  },
  reply: {
    replyId: 'reply-1',
    bodyText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    date: { label: '2026.05.04', isoValue: '2026-05-04T00:00:00.000Z' },
    replierDisplay: 'anonymous',
  },
  existingFeedback: { status: 'none' },
  selectedFeedback: undefined,
  commentDraft: '',
  commentMaxLength: 300,
  commentValidation: { status: 'valid' },
  commentModeration: { status: 'idle' },
  isFeedbackProcessing: false,
  isCommentProcessing: false,
  onBack: () => window.dispatchEvent(new CustomEvent('preview-action', { detail: 'back' })),
  onFeedbackChange: value => window.dispatchEvent(new CustomEvent('preview-action', { detail: `feedback:${value}` })),
  onFeedbackSubmit: () => window.dispatchEvent(new CustomEvent('preview-action', { detail: 'feedback-submit' })),
  onCommentChange: value => window.dispatchEvent(new CustomEvent('preview-action', { detail: `comment:${value}` })),
  onCommentSubmit: () => window.dispatchEvent(new CustomEvent('preview-action', { detail: 'comment-submit' })),
};

function PreviewApp() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen') ?? '06';
  const [draftValue, setDraftValue] = useState('');
  const activeTab: PrdAppTab = screen === '06' ? '답변하기' : '나의 고민';
  const draft = useMemo<WriteDraftContract>(() => ({
    ...writeDraft,
    value: draftValue,
    characterCount: draftValue.length,
    submitDisabledReason: draftValue.length === 0 ? 'empty' : undefined,
  }), [draftValue]);

  return (
    <MobileAppShell
      frameMode="pixel-aligned"
      hasBottomNavigation={false}
      bottomNavigation={(
        <BottomNavigation
          tabs={PRD_APP_TABS.map(tab => ({ tab, label: tab }))}
          activeTab={activeTab}
          centralAction={CENTRAL_BOTTOM_NAVIGATION_ACTION}
          onSelectTab={tab => window.dispatchEvent(new CustomEvent('preview-action', { detail: `tab:${tab}` }))}
          onCentralAction={() => window.dispatchEvent(new CustomEvent('preview-action', { detail: 'central-write-worry' }))}
          presentationMode="pixel-aligned"
        />
      )}
    >
      {screen === '06' && (
        <ReceivedWorriesScreen
          state={{ status: 'ready' }}
          items={receivedItems}
          passingDeliveryIds={[]}
          onPass={deliveryId => window.dispatchEvent(new CustomEvent('preview-action', { detail: `pass:${deliveryId}` }))}
          onOpen={item => window.dispatchEvent(new CustomEvent('preview-action', { detail: `open:${item.deliveryId}:${item.worryId}` }))}
          onReply={item => window.dispatchEvent(new CustomEvent('preview-action', { detail: `reply:${item.deliveryId}:${item.worryId}` }))}
        />
      )}
      {screen === '07' && (
        <div className="relative h-[852px] w-[393px] overflow-hidden bg-[#fff1d1]">
          <p className="absolute left-[30px] top-[18px] text-[16px] font-semibold leading-none text-[#25272b]">10:46</p>
          <div className="absolute left-[295px] top-[28px] h-[4px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
          <div className="absolute left-[300px] top-[26px] h-[6px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
          <div className="absolute left-[305px] top-[24px] h-[8px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
          <div className="absolute left-[310px] top-[22px] h-[10px] w-[3px] rounded-[0.5px] bg-[#1a1a1a]" />
          <div className="absolute left-[350px] top-[22px] h-[12px] w-[26px] rounded-[3px] border-[1.5px] border-[#1a1a1a]" />
          <div className="absolute left-[377px] top-[25px] h-[6px] w-[2px] rounded-[1px] border border-[#1a1a1a] bg-white" />
          <div className="absolute left-[352px] top-[24.5px] h-[7px] w-[16px] rounded-[1px] border border-[#1a1a1a] bg-[#1a1a1a]" />
          <button type="button" className="absolute left-[22px] top-[56px] h-[32px] w-[18px] text-[32px] font-semibold leading-none text-[#2a2a2a]" aria-label="나의 고민으로 돌아가기">‹</button>
          <h2 className="absolute left-[163.5px] top-[69px] text-[17px] font-extrabold leading-none tracking-[-0.34px] text-[#2a2a2a]">질문 작성</h2>
          <WriteFormScreen
            kind="write-worry"
            draft={draft}
            onDraftChange={value => {
              setDraftValue(value);
              window.dispatchEvent(new CustomEvent('preview-action', { detail: `draft:${value}` }));
            }}
            onPublish={() => window.dispatchEvent(new CustomEvent('preview-action', { detail: 'publish' }))}
          />
        </div>
      )}
      {screen === '08' && <ReplyDetailScreen {...replyDetailProps} />}
    </MobileAppShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
);

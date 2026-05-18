import { ArrowLeft, CheckCircle2, Heart, Loader2, MessageCircle, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryCTA,
  QlingCard,
  QlingTextArea,
  SecondaryCTA,
  SuccessBadge,
} from '../shared/ui';
import type { ReplyDetailScreenProps } from './contract';

export function ReplyDetailScreen(props: ReplyDetailScreenProps) {
  if (props.state.status === 'loading') {
    return (
      <DetailFrame title={props.variant === 'my-answer-detail' ? '내 답변' : '답변 확인'} onBack={props.onBack}>
        <LoadingState title={props.state.label} />
      </DetailFrame>
    );
  }

  if (props.state.status === 'error') {
    return (
      <DetailFrame title={props.variant === 'my-answer-detail' ? '내 답변' : '답변 확인'} onBack={props.onBack}>
        <ErrorState title="답장을 불러오지 못했어요." message={props.state.message} />
      </DetailFrame>
    );
  }

  if (props.state.status === 'empty') {
    return (
      <DetailFrame title={props.variant === 'my-answer-detail' ? '내 답변' : '답변 확인'} onBack={props.onBack}>
        <EmptyState title="답장을 찾을 수 없어요." message={props.state.message ?? '답장 상세 준비 중입니다.'} />
      </DetailFrame>
    );
  }

  if (props.variant === 'received-answer-detail') {
    return <ReceivedAnswerDetailFrame {...props} />;
  }

  return (
    <DetailFrame title="내 답변" onBack={props.onBack}>
      {props.originalWorry && <OriginalWorryCard {...props} />}
      {props.reply && <ReplyCard {...props} />}
      <MyAnswerFeedbackPanel {...props} />
    </DetailFrame>
  );
}

function ReceivedAnswerDetailFrame(props: ReplyDetailScreenProps) {
  const originalText = props.originalWorry?.bodyText ?? props.originalWorry?.summaryText ?? '';
  const replyText = props.reply?.bodyText ?? '';
  const canShowFeedbackButtons = props.existingFeedback.status !== 'submitted';
  const shouldShowComment = props.existingFeedback.status === 'submitted'
    && props.existingFeedback.value === 'like'
    && !props.existingFeedback.comment;

  return (
    <div className="relative h-[852px] w-[393px] overflow-hidden bg-[#fff1d1] font-sans text-[#2a2a2a]">
      <ReferenceStatusBar />
      <button
        type="button"
        onClick={props.onBack}
        aria-label="목록으로 돌아가기"
        className="absolute left-[22px] top-[56px] z-10 h-[32px] w-[18px] text-[32px] font-semibold leading-none text-[#2a2a2a] transition-colors hover:text-[#ff8b3d] focus:outline-none focus:ring-2 focus:ring-[#ff8b3d]"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <h1 className="absolute left-[163.5px] top-[69px] text-[17px] font-extrabold leading-none tracking-[-0.34px] text-[#2a2a2a]">답변 확인</h1>

      {props.originalWorry && (
        <article className="absolute left-[16px] top-[127px] h-[300px] w-[361px] overflow-hidden rounded-[18px] bg-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <span className="absolute left-[18px] top-[11px] rounded-full bg-[#ffe4cc] px-[12px] py-[5px] text-center text-[11px] font-bold leading-none text-[#ff8b3d]">
            {props.originalWorry.category}
          </span>
          {props.originalWorry.date.label && (
            <span className="absolute left-[80px] top-[17px] text-[12px] font-semibold leading-none tracking-[-0.36px] text-[#b8b8b8]">
              {props.originalWorry.date.label}
            </span>
          )}
          <p className="absolute left-[19px] top-[44px] w-[325px] whitespace-pre-wrap break-words text-[16px] font-extrabold leading-[24px] tracking-[-0.48px] text-[#2a2a2a]">
            {originalText}
          </p>
          <div className="absolute left-[15px] top-[99px] h-[0.7px] w-[332px] rounded-[3px] bg-[#c2c4c8]" />
          <p className="absolute left-[19px] top-[112px] w-[325px] whitespace-pre-wrap break-words text-[12px] font-bold leading-[24px] tracking-[-0.36px] text-[#2a2a2a]">
            {originalText}
          </p>
        </article>
      )}

      {props.reply && (
        <article className="absolute left-[16px] top-[449px] h-[213px] w-[361px] overflow-hidden rounded-[18px] bg-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          {props.reply.date.label && (
            <span className="absolute left-[19px] top-[17px] text-[12px] font-semibold leading-none tracking-[-0.36px] text-[#b8b8b8]">
              {props.reply.date.label}
            </span>
          )}
          <p className="absolute left-[19px] top-[43px] w-[325px] whitespace-pre-wrap break-words text-[12px] font-bold leading-[24px] tracking-[-0.36px] text-[#2a2a2a]">
            {replyText}
          </p>
          {canShowFeedbackButtons && (
            <div className="absolute left-[254px] top-[183px] flex h-[22px] w-[98px] items-center gap-[5px]">
              <CompactFeedbackButton
                value="like"
                selected={props.selectedFeedback === 'like'}
                processing={props.isFeedbackProcessing}
                onSelect={props.onFeedbackChange}
                onSubmit={props.onFeedbackSubmit}
              />
              <CompactFeedbackButton
                value="dislike"
                selected={props.selectedFeedback === 'dislike'}
                processing={props.isFeedbackProcessing}
                onSelect={props.onFeedbackChange}
                onSubmit={props.onFeedbackSubmit}
              />
            </div>
          )}
          {props.existingFeedback.status === 'submitted' && (
            <div className="absolute left-[254px] top-[183px] flex h-[22px] items-center gap-1 rounded-full bg-[#fff1d1] px-2 text-[10px] font-bold text-[#ff8b3d]">
              <CheckCircle2 className="h-[12px] w-[12px]" aria-hidden="true" />
              완료
            </div>
          )}
        </article>
      )}

      {shouldShowComment && (
        <div className="absolute left-[16px] top-[681px] w-[361px]">
          <CommentBox {...props} />
        </div>
      )}
      {props.existingFeedback.status === 'submitted' && props.existingFeedback.comment && (
        <article className="absolute left-[16px] top-[681px] h-[120px] w-[361px] overflow-hidden rounded-[18px] bg-white p-[19px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <div className="mb-2 text-[12px] font-bold text-[#b8b8b8]">내가 남긴 코멘트</div>
          <p className="whitespace-pre-wrap text-[12px] leading-[20px] text-[#2a2a2a]">{props.existingFeedback.comment}</p>
        </article>
      )}
    </div>
  );
}

function CompactFeedbackButton({
  value,
  selected,
  processing,
  onSelect,
  onSubmit,
}: {
  readonly value: 'like' | 'dislike';
  readonly selected: boolean;
  readonly processing: boolean;
  readonly onSelect: (value: 'like' | 'dislike') => void;
  readonly onSubmit: () => void;
}) {
  const isLike = value === 'like';
  return (
    <button
      type="button"
      aria-label={isLike ? '이 답변이 위로가 되었어요 선택 후 제출' : '이 답변이 그냥 그랬어요 선택 후 제출'}
      aria-pressed={selected}
      disabled={processing}
      onClick={() => {
        onSelect(value);
        onSubmit();
      }}
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[#ff8b3d] disabled:cursor-not-allowed disabled:opacity-55',
        selected ? 'border-[#ff8b3d] bg-[#ffe4cc]' : 'border-transparent bg-transparent',
      )}
    >
      {processing ? (
        <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden="true" />
      ) : isLike ? (
        <ThumbsUp className="h-[14px] w-[14px]" aria-hidden="true" />
      ) : (
        <ThumbsDown className="h-[14px] w-[14px]" aria-hidden="true" />
      )}
    </button>
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

function DetailFrame({
  title,
  onBack,
  children,
}: {
  readonly title: string;
  readonly onBack: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-6">
      <div className="sticky top-16 z-20 -mx-[var(--qling-space-shell-x)] bg-[var(--qling-color-cream)]/95 px-[var(--qling-space-shell-x)] py-3 backdrop-blur-md">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="목록으로 돌아가기"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--qling-color-text)] transition-colors hover:bg-[var(--qling-color-cream-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-center text-lg font-extrabold text-[var(--qling-color-text)]">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

function OriginalWorryCard(props: ReplyDetailScreenProps) {
  const worry = props.originalWorry;
  if (!worry) return null;

  return (
    <QlingCard className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-cream-soft)] px-3 py-1 text-xs font-bold text-[var(--qling-color-primary-orange)]">
          {worry.category}
        </span>
        {worry.date.label && <span className="text-xs font-semibold text-[var(--qling-color-muted)]">{worry.date.label}</span>}
        {worry.isUnread && <SuccessBadge label="새 답변" />}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--qling-color-muted)]">
          {props.variant === 'my-answer-detail' ? '전달받았던 고민' : '내가 보낸 고민'}
        </p>
        <p className="whitespace-pre-wrap break-words text-base font-extrabold leading-7 text-[var(--qling-color-text)]">
          {worry.bodyText ?? worry.summaryText}
        </p>
      </div>
    </QlingCard>
  );
}

function ReplyCard(props: ReplyDetailScreenProps) {
  const reply = props.reply;
  if (!reply) return null;

  return (
    <QlingCard className="space-y-4 border-[var(--qling-color-secondary-orange)] bg-[var(--qling-color-cream-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {props.variant === 'my-answer-detail' ? (
            <Send className="h-5 w-5 shrink-0 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
          ) : (
            <Heart className="h-5 w-5 shrink-0 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
          )}
          <span className="text-sm font-extrabold text-[var(--qling-color-primary-orange)]">
            {props.variant === 'my-answer-detail' ? '내가 쓴 답변' : '도착한 답변'}
          </span>
        </div>
        {reply.date.label && <span className="text-right text-xs font-semibold text-[var(--qling-color-muted)]">{reply.date.label}</span>}
      </div>
      <p className="whitespace-pre-wrap break-words text-base font-semibold leading-8 text-[var(--qling-color-text)]">
        {reply.bodyText}
      </p>
    </QlingCard>
  );
}

function FeedbackPanel(props: ReplyDetailScreenProps) {
  return (
    <QlingCard className="space-y-5">
      {props.existingFeedback.status === 'submitted' ? (
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-cream-soft)] px-4 py-2 text-sm font-bold text-[var(--qling-color-text)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--qling-color-success)]" aria-hidden="true" />
            {props.existingFeedback.value === 'like' ? '위로가 되었다고 마음을 전했어요.' : '확인을 완료했어요.'}
          </div>
          {props.existingFeedback.value === 'like' && !props.existingFeedback.comment && (
            <CommentBox {...props} />
          )}
          {props.existingFeedback.comment && (
            <div className="rounded-[var(--qling-radius-card)] border border-[var(--qling-color-border)] bg-[var(--qling-color-cream)] p-4">
              <div className="mb-2 text-xs font-bold text-[var(--qling-color-muted)]">내가 남긴 코멘트</div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--qling-color-text)]">{props.existingFeedback.comment}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-extrabold text-[var(--qling-color-text)]">이 답변이 도움이 되었나요?</h2>
            <p className="text-sm leading-6 text-[var(--qling-color-muted)]">하나만 선택할 수 있어요.</p>
          </div>
          {props.commentModeration.status === 'rejected' && <p className="text-sm font-semibold whitespace-pre-wrap text-[var(--qling-color-danger)]">{props.commentModeration.reason}</p>}
          {props.commentValidation.status === 'invalid' && <p className="text-sm font-semibold text-[var(--qling-color-danger)]">{props.commentValidation.message}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <FeedbackButton
              value="like"
              selected={props.selectedFeedback === 'like'}
              processing={props.isFeedbackProcessing}
              onSelect={props.onFeedbackChange}
              onSubmit={props.onFeedbackSubmit}
            />
            <FeedbackButton
              value="dislike"
              selected={props.selectedFeedback === 'dislike'}
              processing={props.isFeedbackProcessing}
              onSelect={props.onFeedbackChange}
              onSubmit={props.onFeedbackSubmit}
            />
          </div>
        </>
      )}
    </QlingCard>
  );
}

function FeedbackButton({
  value,
  selected,
  processing,
  onSelect,
  onSubmit,
}: {
  readonly value: 'like' | 'dislike';
  readonly selected: boolean;
  readonly processing: boolean;
  readonly onSelect: (value: 'like' | 'dislike') => void;
  readonly onSubmit: () => void;
}) {
  const isLike = value === 'like';

  return (
    <button
      type="button"
      aria-label={isLike ? '이 답변이 위로가 되었어요 선택 후 제출' : '이 답변이 그냥 그랬어요 선택 후 제출'}
      aria-pressed={selected}
      disabled={processing}
      onClick={() => {
        onSelect(value);
        onSubmit();
      }}
      className={cn(
        'flex min-h-16 w-full items-center justify-center gap-2 rounded-[var(--qling-radius-cta)] border px-4 py-3 text-sm font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
        isLike
          ? 'border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-primary-orange)] text-[var(--qling-color-text)]'
          : 'border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] text-[var(--qling-color-muted)]',
        selected && !isLike && 'border-[var(--qling-color-primary-orange)] text-[var(--qling-color-primary-orange)]',
      )}
    >
      {processing ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : isLike ? (
        <ThumbsUp className="h-5 w-5" aria-hidden="true" />
      ) : (
        <ThumbsDown className="h-5 w-5" aria-hidden="true" />
      )}
      {isLike ? '위로가 되었어요' : '그냥 그랬어요'}
    </button>
  );
}

function MyAnswerFeedbackPanel(props: ReplyDetailScreenProps) {
  return (
    <div className="space-y-4">
      {props.existingFeedback.status === 'submitted' && props.existingFeedback.value === 'like' && (
        <QlingCard className="flex items-center justify-center gap-2 text-center text-sm font-bold text-[var(--qling-color-text)]">
          <Heart className="h-5 w-5 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
          작성자에게 위로가 되었다는 답신이 왔어요.
        </QlingCard>
      )}
      {props.existingFeedback.status === 'submitted' && props.existingFeedback.comment && (
        <QlingCard className="space-y-3 border-[var(--qling-color-secondary-orange)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--qling-color-primary-orange)]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            작성자가 남긴 코멘트
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--qling-color-text)]">{props.existingFeedback.comment}</p>
        </QlingCard>
      )}
    </div>
  );
}

function CommentBox(props: ReplyDetailScreenProps) {
  return (
    <div className="space-y-4 text-left">
      <QlingTextArea
        value={props.commentDraft}
        onChange={props.onCommentChange}
        maxLength={props.commentMaxLength}
        label="코멘트 남기기"
        placeholder="따뜻한 코멘트를 남겨주세요."
        errorMessage={props.commentValidation.status === 'invalid' ? props.commentValidation.message : undefined}
        processing={props.isCommentProcessing}
      />
      {props.commentModeration.status === 'rejected' && <p className="text-sm font-semibold whitespace-pre-wrap text-[var(--qling-color-danger)]">{props.commentModeration.reason}</p>}
      <PrimaryCTA
        onClick={props.onCommentSubmit}
        processing={props.isCommentProcessing}
        disabled={props.commentValidation.status === 'invalid'}
        accessibilityLabel="코멘트 검토 후 제출"
      >
        코멘트 남기기
      </PrimaryCTA>
      <SecondaryCTA onClick={props.onBack} disabled={props.isCommentProcessing} accessibilityLabel="코멘트 없이 목록으로 돌아가기">
        나중에 남기기
      </SecondaryCTA>
    </div>
  );
}

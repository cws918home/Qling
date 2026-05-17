import { FileText, Headphones, Send, Signal } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CategoryChip,
  ContentSheet,
  EmptyState,
  ErrorState,
  LoadingState,
  QlingCard,
  SecondaryCTA,
} from '../shared/ui';
import type { MyWorriesScreenProps } from './contract';

export function MyWorriesScreen(props: MyWorriesScreenProps) {
  return (
    <div className="space-y-5 pb-4">
      <ContentSheet className="bg-[var(--qling-color-primary-orange)] text-white shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex h-11 w-14 items-center justify-center rounded-full bg-[var(--qling-color-cream-soft)] text-[var(--qling-color-primary-orange)]">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-normal">나의 고민</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/85">내가 작성한 고민과 도착한 답장을 확인합니다.</p>
          </div>
          <div className="w-32 shrink-0">
            <SecondaryCTA onClick={props.onWriteWorry} accessibilityLabel="고민 작성 화면으로 이동">
              <Send className="h-4 w-4" aria-hidden="true" />
              고민 쓰기
            </SecondaryCTA>
          </div>
        </div>
      </ContentSheet>

      {props.state.status === 'loading' ? (
        <LoadingState title="나의 고민을 불러오는 중" message={props.state.label} />
      ) : props.state.status === 'error' ? (
        <ErrorState title="나의 고민을 불러오지 못했어요" message={props.state.message} />
      ) : props.state.status === 'empty' ? (
        <EmptyState title="아직 작성한 고민이 없어요" message={props.state.message} actionLabel="고민 쓰기" onAction={props.onWriteWorry} />
      ) : (
        <div className="grid gap-4">
          {props.items.map(worry => (
            <button
              key={worry.worryId}
              type="button"
              aria-label={worry.accessibilityLabel}
              aria-current={worry.isSelected ? 'true' : undefined}
              onClick={() => props.onSelectWorry(worry)}
              className={cn(
                'w-full rounded-[var(--qling-radius-card)] text-left transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-offset-2',
                worry.isSelected ? 'scale-[1.01]' : 'hover:-translate-y-0.5',
              )}
            >
              <QlingCard className={cn(
                'space-y-5 border-transparent',
                worry.isSelected && 'border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-cream-soft)]',
                worry.hasUnreadReplies && !worry.isSelected && 'border-[var(--qling-color-primary-orange)] bg-[rgb(255_245_235/0.86)]',
              )}>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryChip label={worry.categoryLabel} selected disabled className="pointer-events-none px-3 py-1 text-[11px] disabled:opacity-100" />
                  {worry.hasUnreadReplies && (
                    <span className="rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-primary-orange)] px-2.5 py-1 text-[11px] font-extrabold text-white">
                      새 답장
                    </span>
                  )}
                  {worry.isSelected && (
                    <span className="rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-text)] px-2.5 py-1 text-[11px] font-extrabold text-white">
                      선택됨
                    </span>
                  )}
                </div>
                <p className="line-clamp-3 text-base font-extrabold leading-7 text-[var(--qling-color-text)]">
                  {worry.contentPreview}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--qling-color-muted)]">
                  <Signal className="h-4 w-4 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
                  <span>{worry.replyCount}명이 답변했어요</span>
                </div>
              </QlingCard>
            </button>
          ))}
        </div>
      )}

      {props.selectedWorry && (
        <div className="grid gap-4">
          <ContentSheet className="space-y-3 bg-[var(--qling-color-cream-soft)] shadow-none">
            <div className="text-xs font-extrabold text-[var(--qling-color-primary-orange)]">선택한 고민</div>
            <p className="line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--qling-color-text)]">{props.selectedWorry.content}</p>
          </ContentSheet>
          <div className="text-sm font-extrabold text-[var(--qling-color-text)]">도착한 답장 ({props.selectedWorry.replies.length})</div>
          {props.selectedWorry.repliesState.status === 'loading' ? (
            <LoadingState title="답장을 불러오는 중" message={props.selectedWorry.repliesState.label} />
          ) : props.selectedWorry.repliesState.status === 'error' ? (
            <ErrorState title="답장을 불러오지 못했어요" message={props.selectedWorry.repliesState.message} />
          ) : props.selectedWorry.repliesState.status === 'empty' ? (
            <EmptyState title="아직 도착한 답장이 없어요" message={props.selectedWorry.repliesState.message} />
          ) : props.selectedWorry.replies.map(reply => (
            <button
              key={reply.replyId}
              type="button"
              aria-label={reply.accessibilityLabel}
              onClick={() => props.onSelectReply(reply)}
              className="w-full rounded-[var(--qling-radius-card)] text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-offset-2"
            >
              <QlingCard className={cn(
                'space-y-3',
                reply.hasUnread && 'border-[var(--qling-color-primary-orange)] bg-[rgb(255_245_235/0.86)]',
              )}>
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
                  <span className="text-xs font-bold text-[var(--qling-color-muted)]">누군가의 따뜻한 답장</span>
                  {reply.hasUnread && (
                    <span className="ml-auto rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-primary-orange)] px-2.5 py-1 text-[11px] font-extrabold text-white">
                      새 답장
                    </span>
                  )}
                </div>
                <p className="line-clamp-3 text-sm font-semibold leading-6 text-[var(--qling-color-text)]">{reply.previewText}</p>
              </QlingCard>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

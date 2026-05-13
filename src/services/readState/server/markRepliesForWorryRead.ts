import type {
  ReadStateRepository,
  ServerMarkRepliesForWorryReadResult,
} from './types';

function parseReplyIds(value: unknown): string[] | undefined | 'invalid' {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return 'invalid';
  return value.every(item => typeof item === 'string')
    ? value
    : 'invalid';
}

export async function markRepliesForWorryRead(params: {
  repository: ReadStateRepository;
  authorUid: string;
  worryId: string;
  body: unknown;
}): Promise<ServerMarkRepliesForWorryReadResult> {
  const body = params.body && typeof params.body === 'object'
    ? params.body as { replyIds?: unknown }
    : {};
  const replyIds = parseReplyIds(body.replyIds);

  if (replyIds === 'invalid') {
    return {
      status: 'validation_error',
      code: 'invalid_reply_ids',
      message: 'replyIds는 문자열 배열이어야 합니다.',
    };
  }

  try {
    return await params.repository.markRepliesForWorryRead({
      authorUid: params.authorUid,
      worryId: params.worryId,
      replyIds,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'worry_missing') {
        return { status: 'not_found', code: 'worry_missing', message: '고민을 찾을 수 없습니다.' };
      }
      if (error.message === 'reply_missing') {
        return { status: 'not_found', code: 'reply_missing', message: '답장을 찾을 수 없습니다.' };
      }
      if (error.message === 'not_worry_author') {
        return { status: 'forbidden', code: 'not_worry_author', message: '이 고민의 작성자가 아닙니다.' };
      }
      if (error.message === 'reply_not_for_worry_author') {
        return { status: 'forbidden', code: 'reply_not_for_worry_author', message: '요청한 답장을 읽을 수 없습니다.' };
      }
    }

    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '답장 읽음 상태 저장 중 문제가 발생했습니다.',
      details: error,
    };
  }
}

import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { createDeliveryPassRepository } from './firestoreRepository';
import { selectPassReplacementCandidates } from './recipientSelection';
import { sendReplacementPushAfterCommit } from './pushLogs';
import type {
  DeliveryPassRepository,
  ServerPassDeliveryResult,
} from './types';

function mapError(error: unknown): ServerPassDeliveryResult {
  if (!(error instanceof Error)) {
    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '패스 처리 중 문제가 발생했습니다.',
      details: error,
    };
  }

  if (error.message === 'delivery_missing') {
    return { status: 'not_found', code: 'delivery_missing', message: '전달을 찾을 수 없습니다.' };
  }
  if (error.message === 'worry_missing') {
    return { status: 'not_found', code: 'worry_missing', message: '고민을 찾을 수 없습니다.' };
  }
  if (error.message === 'not_delivery_recipient') {
    return { status: 'forbidden', code: 'not_delivery_recipient', message: '이 전달의 수신자가 아닙니다.' };
  }
  if (error.message === 'delivery_hidden') {
    return { status: 'conflict', code: 'delivery_hidden', message: '숨김 처리된 전달입니다.' };
  }
  if (error.message === 'worry_hidden') {
    return { status: 'conflict', code: 'worry_hidden', message: '숨김 처리된 고민입니다.' };
  }
  if (error.message === 'delivery_terminal_timestamp') {
    return { status: 'conflict', code: 'delivery_terminal_timestamp', message: '이미 처리된 전달입니다.' };
  }
  if (error.message === 'delivery_not_active') {
    return { status: 'conflict', code: 'delivery_not_active', message: '패스할 수 없는 전달입니다.' };
  }
  if (
    error.message === 'delivery_malformed'
    || error.message === 'attempt_malformed'
    || error.message === 'active_delivery_has_attempt'
  ) {
    return {
      status: 'server_error',
      code: 'data_integrity_error',
      message: '전달 데이터 상태가 올바르지 않습니다.',
      details: error.message,
    };
  }

  return {
    status: 'server_error',
    code: 'transaction_aborted',
    message: '패스 처리 중 문제가 발생했습니다.',
    details: error.message,
  };
}

export async function passDelivery(params: {
  db: Firestore;
  messaging: Messaging | null;
  uid: string;
  deliveryId: string;
  repository?: DeliveryPassRepository;
  random?: () => number;
}): Promise<ServerPassDeliveryResult> {
  const repository = params.repository ?? createDeliveryPassRepository({ db: params.db });

  try {
    const scan = await repository.fetchReplacementScan({ deliveryId: params.deliveryId });
    const candidates = selectPassReplacementCandidates({
      author: scan.author,
      candidates: scan.candidates,
      matchingCategories: scan.matchingCategories,
      excludedUids: scan.excludedUids,
      random: params.random ?? Math.random,
    });

    for (const selectedRecipient of candidates) {
      const result = await repository.commitPassDelivery({
        uid: params.uid,
        deliveryId: params.deliveryId,
        selectedRecipient,
        existingHumanDeliveryCount: scan.existingHumanDeliveryCount,
      });

      if (result.status === 'candidate_unavailable') continue;

      if (result.replacementStatus === 'created' && result.replacementDeliveryId && result.attemptId) {
        const pushResult = await sendReplacementPushAfterCommit({
          db: params.db,
          messaging: params.messaging,
          deliveryId: result.replacementDeliveryId,
          recipientUid: selectedRecipient.uid,
        });
        await repository.markReplacementPushResult({
          attemptId: result.attemptId,
          status: pushResult.status,
          logIds: pushResult.logIds,
          warnings: pushResult.warnings,
        }).catch(() => undefined);
      }

      return result;
    }

    const shortfallResult = await repository.commitPassDelivery({
      uid: params.uid,
      deliveryId: params.deliveryId,
      selectedRecipient: null,
      existingHumanDeliveryCount: scan.existingHumanDeliveryCount,
    });
    if (shortfallResult.status === 'candidate_unavailable') {
      return {
        status: 'server_error',
        code: 'transaction_aborted',
        message: '패스 처리 중 문제가 발생했습니다.',
        details: 'shortfall_candidate_unavailable',
      };
    }
    return shortfallResult;
  } catch (error) {
    return mapError(error);
  }
}

export function validatePassBody(body: unknown): { status: 'ok' } | { status: 'invalid'; message: string } {
  if (body === undefined) return { status: 'ok' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 'invalid', message: '요청 본문은 빈 객체여야 합니다.' };
  }
  if (Object.keys(body as Record<string, unknown>).length > 0) {
    return { status: 'invalid', message: '요청 본문은 비어 있어야 합니다.' };
  }
  return { status: 'ok' };
}

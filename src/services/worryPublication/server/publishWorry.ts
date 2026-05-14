import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import {
  WORRY_MODERATION_MODEL,
  WORRY_MODERATION_PROVIDER,
  moderateWorryForPublication,
} from './moderation';
import {
  buildRecipientEligibilitySnapshot,
  createInitialWorryPublicationRepository,
  serverTimestamp,
} from './firestoreRepository';
import { selectInitialWorryRecipients } from './recipientSelection';
import { validateWorryContent } from './validation';
import { sendNewWorryPushesAfterCommit } from './pushLogs';
import type {
  DeliveryBatchWriteModel,
  DeliveryWriteModel,
  InitialWorryPublicationRepository,
  ModerationLogWriteModel,
  Phase1AuthorProfile,
  SelectedPhase1Recipient,
  ServerPublishWorryResult,
  WorryModerationProvider,
  WorryWriteModel,
} from './types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildModerationLog(params: {
  id: string;
  worryId: string;
  authorUid: string;
  content: string;
  status: ModerationLogWriteModel['status'];
  reasonCode: string;
  userMessage: string;
  helpMessage: string | null;
  rawProviderResponse: unknown | null;
  rawCategories: string[];
  validCategories: string[];
  invalidCategories: string[];
  matchingCategories: string[];
}): ModerationLogWriteModel {
  const timestamp = serverTimestamp();
  return {
    id: params.id,
    targetType: 'worry',
    targetId: params.worryId,
    uid: params.authorUid,
    originalContent: params.content,
    status: params.status,
    reasonCode: params.reasonCode,
    userMessage: params.userMessage,
    helpMessage: params.helpMessage,
    rawProviderResponse: params.rawProviderResponse,
    rawCategories: params.rawCategories,
    validCategories: params.validCategories,
    invalidCategories: params.invalidCategories,
    matchingCategories: params.matchingCategories,
    provider: WORRY_MODERATION_PROVIDER,
    model: WORRY_MODERATION_MODEL,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildWorry(params: {
  worryId: string;
  batchId: string;
  moderationLogId: string;
  authorUid: string;
  content: string;
  rawCategories: string[];
  validCategories: string[];
  invalidCategories: string[];
  matchingCategories: string[];
  humanDeliveryCount: number;
}): WorryWriteModel {
  const timestamp = serverTimestamp();
  return {
    id: params.worryId,
    authorUid: params.authorUid,
    content: params.content,
    status: 'active',
    rawCategories: params.rawCategories,
    validCategories: params.validCategories,
    invalidCategories: params.invalidCategories,
    matchingCategories: params.matchingCategories,
    moderationLogId: params.moderationLogId,
    initialDeliveryBatchId: params.batchId,
    initialDeliveryTargetCount: 5,
    humanDeliveryLimit: 15,
    humanDeliveryCount: params.humanDeliveryCount,
    humanReplyCount: 0,
    hasHumanReply: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastDeliveryCreatedAt: timestamp,
  };
}

function buildBatch(params: {
  batchId: string;
  worryId: string;
  createdCount: number;
  matchedCount: number;
  randomCount: number;
}): DeliveryBatchWriteModel {
  return {
    id: params.batchId,
    worryId: params.worryId,
    batchRound: 0,
    createdAt: serverTimestamp(),
    targetCount: 5,
    createdCount: params.createdCount,
    matchedCount: params.matchedCount,
    randomCount: params.randomCount,
    reason: 'initial',
  };
}

function buildDeliveries(params: {
  worryId: string;
  batchId: string;
  author: Phase1AuthorProfile;
  recipients: SelectedPhase1Recipient[];
}): DeliveryWriteModel[] {
  return params.recipients.map(recipient => {
    const timestamp = serverTimestamp();
    return {
      id: `${params.worryId}_${recipient.uid}`,
      worryId: params.worryId,
      recipientUid: recipient.uid,
      authorUid: params.author.uid,
      status: 'active',
      answeredAt: null,
      batchId: params.batchId,
      batchRound: 0,
      slotIndex: recipient.slotIndex,
      selectionType: recipient.selectionType,
      matchOverlapCount: recipient.matchOverlapCount,
      matchCategoriesSnapshot: [...recipient.matchCategoriesSnapshot],
      recipientInterestsSnapshot: [...recipient.interests],
      recipientGenderSnapshot: recipient.gender,
      recipientHelpedCountSnapshot: recipient.helpedCount,
      authorGenderSnapshot: params.author.gender,
      isAiRecipient: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      answerableUntil: null,
    };
  });
}

export async function publishWorryOnServer(params: {
  db: Firestore;
  messaging: Messaging | null;
  author: Phase1AuthorProfile;
  content: unknown;
  moderationProvider: WorryModerationProvider;
  now?: () => Date;
  random?: () => number;
  repository?: InitialWorryPublicationRepository;
}): Promise<ServerPublishWorryResult> {
  const validation = validateWorryContent(params.content);
  if (validation.status === 'validation_error') {
    return validation;
  }

  const repository =
    params.repository ?? createInitialWorryPublicationRepository({ db: params.db });
  const ids = repository.createIds();

  const moderation = await moderateWorryForPublication({
    content: validation.content,
    provider: params.moderationProvider,
  });

  if (moderation.status === 'provider_error') {
    return {
      status: 'provider_error',
      code: 'provider_error',
      message: '고민 검토 중 문제가 발생했습니다.',
      details: errorMessage(moderation.error),
    };
  }

  if (moderation.status === 'provider_invalid') {
    return {
      status: 'provider_error',
      code: 'provider_invalid',
      message: '고민 검토 결과를 해석할 수 없습니다.',
      details: moderation.rawProviderResponse,
    };
  }

  if (moderation.status === 'rejected') {
    const moderationLog = buildModerationLog({
      id: ids.moderationLogId,
      worryId: ids.worryId,
      authorUid: params.author.uid,
      content: validation.content,
      status: 'rejected',
      reasonCode: moderation.reasonCode,
      userMessage: moderation.userMessage,
      helpMessage: moderation.helpMessage,
      rawProviderResponse: moderation.rawProviderResponse,
      rawCategories: moderation.rawCategories,
      validCategories: moderation.validCategories,
      invalidCategories: moderation.invalidCategories,
      matchingCategories: moderation.matchingCategories,
    });

    const committed = await repository.commitRejectedWorryModeration({ moderationLog });
    return {
      status: 'rejected',
      reasonCode: moderation.reasonCode,
      userMessage: moderation.userMessage,
      helpMessage: moderation.helpMessage ?? undefined,
      moderationLogId: committed.moderationLogId,
      targetId: committed.targetId,
    };
  }

  const candidates = await repository.fetchRecipientCandidates({
    authorUid: params.author.uid,
    minimumCandidateCount: 5,
  });
  const selection = selectInitialWorryRecipients({
    author: params.author,
    candidates,
    matchingCategories: moderation.matchingCategories,
    random: params.random ?? Math.random,
  });

  const deliveries = buildDeliveries({
    worryId: ids.worryId,
    batchId: ids.batchId,
    author: params.author,
    recipients: selection.recipients,
  });
  const matchedCount = selection.recipients.filter(recipient => recipient.selectionType === 'matched').length;
  const randomCount = selection.recipients.filter(recipient => recipient.selectionType === 'random').length;

  const moderationLog = buildModerationLog({
    id: ids.moderationLogId,
    worryId: ids.worryId,
    authorUid: params.author.uid,
    content: validation.content,
    status: 'approved',
    reasonCode: 'approved',
    userMessage: '',
    helpMessage: null,
    rawProviderResponse: moderation.rawProviderResponse,
    rawCategories: moderation.rawCategories,
    validCategories: moderation.validCategories,
    invalidCategories: moderation.invalidCategories,
    matchingCategories: moderation.matchingCategories,
  });
  const worry = buildWorry({
    worryId: ids.worryId,
    batchId: ids.batchId,
    moderationLogId: ids.moderationLogId,
    authorUid: params.author.uid,
    content: validation.content,
    rawCategories: moderation.rawCategories,
    validCategories: moderation.validCategories,
    invalidCategories: moderation.invalidCategories,
    matchingCategories: moderation.matchingCategories,
    humanDeliveryCount: deliveries.length,
  });
  const batch = buildBatch({
    batchId: ids.batchId,
    worryId: ids.worryId,
    createdCount: deliveries.length,
    matchedCount,
    randomCount,
  });

  try {
    const committed = await repository.commitInitialWorryPublication({
      worry,
      moderationLog,
      batch,
      deliveries,
      selectedRecipientUids: selection.recipients.map(recipient => recipient.uid),
      eligibilitySnapshot: buildRecipientEligibilitySnapshot(selection.recipients),
    });

    if (deliveries.length > 0) {
      await sendNewWorryPushesAfterCommit({
        db: params.db,
        messaging: params.messaging,
        deliveries: deliveries.map(delivery => ({
          deliveryId: delivery.id,
          recipientUid: delivery.recipientUid,
          worryId: delivery.worryId,
        })),
        now: params.now,
      });
    }

    return {
      status: 'published',
      worryId: committed.worryId,
      deliveryIds: committed.deliveryIds,
      moderationLogId: committed.moderationLogId,
    };
  } catch (error) {
    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '고민 전달 중 문제가 발생했습니다.',
      details: errorMessage(error),
    };
  }
}

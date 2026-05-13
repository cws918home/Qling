import { createReadStateRepository } from './firestoreRepository';
import { markDeliveryRead } from './markDeliveryRead';
import { markRepliesForWorryRead } from './markRepliesForWorryRead';
import type { ReadStateServiceDeps } from './types';

export function createReadStateService(deps: ReadStateServiceDeps) {
  const repository = deps.repository ?? createReadStateRepository({ db: deps.db });

  return {
    markDeliveryRead(params: {
      recipientUid: string;
      deliveryId: string;
    }) {
      return markDeliveryRead({
        repository,
        recipientUid: params.recipientUid,
        deliveryId: params.deliveryId,
      });
    },

    markRepliesForWorryRead(params: {
      authorUid: string;
      worryId: string;
      body: unknown;
    }) {
      return markRepliesForWorryRead({
        repository,
        authorUid: params.authorUid,
        worryId: params.worryId,
        body: params.body,
      });
    },
  };
}

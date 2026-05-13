import { createReplyPublicationRepository } from './firestoreRepository';
import { publishReplyForDelivery } from './publishReplyForDelivery';
import type { ReplyPublicationServiceDeps } from './types';

export function createReplyPublicationService(deps: ReplyPublicationServiceDeps) {
  const repository = deps.repository ?? createReplyPublicationRepository({ db: deps.db });

  return {
    publishReplyForDelivery(params: {
      replierUid: string;
      deliveryId: string;
      content: unknown;
    }) {
      return publishReplyForDelivery({
        db: deps.db,
        messaging: deps.messaging,
        replierUid: params.replierUid,
        deliveryId: params.deliveryId,
        content: params.content,
        moderationProvider: deps.moderationProvider,
        repository,
      });
    },
  };
}

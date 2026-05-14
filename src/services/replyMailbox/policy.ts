import type {
  ReplyMailboxChange,
  ReplyMailboxLetter,
  ReplyMailboxNotification,
} from './types';

const granted = (permission: NotificationPermission) => permission === 'granted';

export function getReceivedReplyNotifications<Reply extends ReplyMailboxLetter>(params: {
  isInitialSnapshot: boolean;
  permission: NotificationPermission;
  changes: ReplyMailboxChange<Reply>[];
}): ReplyMailboxNotification[] {
  if (params.isInitialSnapshot || !granted(params.permission)) return [];

  return params.changes
    .filter(change => change.type === 'added')
    .map(() => ({
      title: `📻 Qling`,
      options: {
        body: "누군가 내 고민에 답변을 보냈어요. 지금 확인해보세요.",
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      },
    }));
}

export function getGivenReplyNotifications<Reply extends ReplyMailboxLetter>(params: {
  isInitialSnapshot: boolean;
  permission: NotificationPermission;
  changes: ReplyMailboxChange<Reply>[];
}): ReplyMailboxNotification[] {
  void params;
  return [];
}

// Legacy letters notification boundary. Phase 4 mailbox read models live in
// services/myWorries; this module remains for foreground notification behavior.
export { useReplyMailbox } from './useReplyMailbox';
export type {
  ReplyMailboxAdapter,
  ReplyMailboxLetter,
} from './types';

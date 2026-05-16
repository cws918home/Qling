import { ArrowLeft, CheckCircle2, Heart, Send, ThumbsUp } from 'lucide-react';
import type { ReplyDetailScreenProps } from './contract';

export function ReplyDetailScreen(props: ReplyDetailScreenProps) {
  if (props.state.status === 'empty') {
    return (
      <div className="space-y-6">
        <button onClick={props.onBack} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
        <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] text-sm text-[#8B8B6B]">
          {props.state.message ?? '답장 상세 준비 중입니다.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={props.onBack} className="mb-6 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </button>

      <div className="space-y-6">
        {props.originalWorry && (
          <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9]">
            <div className="text-xs font-bold text-[#A3B18A] mb-3">
              {props.variant === 'my-answer-detail' ? '전달받은 고민' : '내가 보냈던 고민'}
            </div>
            <p className="text-[#8B8B6B] text-sm leading-relaxed whitespace-pre-wrap opacity-80">
              {props.originalWorry.bodyText ?? props.originalWorry.summaryText}
            </p>
          </div>
        )}

        {props.reply && (
          <div className="bg-[#FAEDCD] p-8 rounded-2xl shadow-sm border border-[#D4A373]">
            <div className="flex items-center gap-2 mb-6">
              {props.variant === 'my-answer-detail' ? <Send className="w-5 h-5 text-[#E07A5F]" /> : <Heart className="w-5 h-5 text-[#E07A5F]" />}
              <span className="font-bold text-[#D4A373]">{props.variant === 'my-answer-detail' ? '내가 남긴 다정한 답장' : '도착한 답장'}</span>
            </div>
            <p className="text-[#5A5A40] text-lg font-medium leading-loose whitespace-pre-wrap mb-8">
              {props.reply.bodyText}
            </p>
          </div>
        )}

        {props.variant === 'received-answer-detail' ? (
          <FeedbackPanel {...props} />
        ) : (
          <MyAnswerFeedbackPanel {...props} />
        )}
      </div>
    </div>
  );
}

function FeedbackPanel(props: ReplyDetailScreenProps) {
  return (
    <div className="pt-8 text-center border-t border-[#E9EDC9]">
      {props.existingFeedback.status === 'submitted' ? (
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E9EDC9] rounded-full text-sm font-bold text-[#5A5A40]">
            <CheckCircle2 className="w-5 h-5 text-[#A3B18A]" />
            {props.existingFeedback.value === 'like' ? '위로가 되었다고 마음을 전했어요.' : '확인을 완료했어요.'}
          </div>
          {props.existingFeedback.value === 'like' && !props.existingFeedback.comment && (
            <CommentBox {...props} />
          )}
          {props.existingFeedback.comment && (
            <div className="bg-[#FAEDCD]/50 p-6 rounded-2xl border border-[#E9EDC9]">
              <div className="text-xs font-bold text-[#A3B18A] mb-2">내가 남긴 코멘트</div>
              <p className="text-[#5A5A40] text-sm leading-relaxed">{props.existingFeedback.comment}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <h3 className="font-bold text-lg mb-4 text-[#5A5A40]">이 답장이 해결이나 위로에 도움이 되었나요?</h3>
          {props.commentModeration.status === 'rejected' && <p className="mb-3 text-sm text-red-500">{props.commentModeration.reason}</p>}
          {props.commentValidation.status === 'invalid' && <p className="mb-3 text-sm text-red-500">{props.commentValidation.message}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => { props.onFeedbackChange('like'); props.onFeedbackSubmit(); }} disabled={props.isFeedbackProcessing} className="w-full sm:w-auto px-6 py-4 bg-[#E07A5F] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#D46A4F] transition-all disabled:opacity-50">
              <ThumbsUp className="w-5 h-5" /> 위로가 되었어요!
            </button>
            <button onClick={() => { props.onFeedbackChange('dislike'); props.onFeedbackSubmit(); }} disabled={props.isFeedbackProcessing} className="w-full sm:w-auto px-6 py-4 bg-white border border-[#E9EDC9] text-[#8B8B6B] rounded-xl font-bold hover:bg-[#FAEDCD] transition-all disabled:opacity-50">
              그냥 그랬어요
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MyAnswerFeedbackPanel(props: ReplyDetailScreenProps) {
  return (
    <div className="pt-4 space-y-4">
      {props.existingFeedback.status === 'submitted' && props.existingFeedback.value === 'like' && (
        <div className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-[#E9EDC9] rounded-2xl text-[#5A5A40] font-bold">
          <Heart className="w-5 h-5 text-[#E07A5F]" />
          작성자에게 위로가 되었다는 답신이 왔어요.
        </div>
      )}
      {props.existingFeedback.status === 'submitted' && props.existingFeedback.comment && (
        <div className="bg-white p-6 rounded-2xl border border-[#D4A373]">
          <div className="text-xs font-bold text-[#D4A373] mb-3">작성자가 남긴 코멘트</div>
          <p className="text-[#5A5A40] text-sm leading-relaxed whitespace-pre-wrap">{props.existingFeedback.comment}</p>
        </div>
      )}
    </div>
  );
}

function CommentBox(props: ReplyDetailScreenProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#FAEDCD] text-left">
      <h4 className="font-bold text-[#5A5A40] mb-2 text-sm">따뜻한 마음이 담긴 답장에 코멘트 남기기</h4>
      <textarea
        value={props.commentDraft}
        onChange={event => props.onCommentChange(event.target.value)}
        placeholder="따뜻한 코멘트를 남겨주세요."
        className="w-full h-32 bg-[#FDFCF8] p-4 rounded-xl border border-[#FAEDCD] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm"
      />
      {props.commentModeration.status === 'rejected' && <p className="mt-2 text-sm text-red-500">{props.commentModeration.reason}</p>}
      {props.commentValidation.status === 'invalid' && <p className="mt-2 text-sm text-red-500">{props.commentValidation.message}</p>}
      <button onClick={props.onCommentSubmit} disabled={props.isCommentProcessing} className="mt-4 w-full py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] disabled:opacity-50 transition-all text-sm">
        {props.isCommentProcessing ? '검토 및 전송 중...' : '코멘트 남기기'}
      </button>
    </div>
  );
}

import { ArrowLeft, Heart, Send } from 'lucide-react';
import type { MyAnswersScreenProps } from './contract';

export function MyAnswersScreen(props: MyAnswersScreenProps) {
  return (
    <div className="space-y-6">
      <button onClick={props.onBack} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
        <ArrowLeft className="w-4 h-4" /> 마이페이지로
      </button>
      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-bold">내가 쓴 답변</h2>
        <p className="text-[#8B8B6B] text-sm">내가 보낸 답변과 받은 반응을 확인합니다.</p>
      </div>
      {props.state.status === 'empty' ? (
        <div className="text-center py-10 bg-[#FDFCF8] rounded-2xl border border-dashed border-[#E9EDC9]">
          <Heart className="w-10 h-10 text-[#E9EDC9] mx-auto mb-3" />
          <p className="text-[#8B8B6B] text-sm">{props.state.message ?? '아직 내가 보낸 위로가 없어요.'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {props.items.map(reply => (
            <button key={reply.replyId} onClick={() => props.onSelect(reply)} className="w-full text-left p-4 bg-[#FDFCF8] rounded-xl border border-[#E9EDC9] transition-all hover:bg-[#FAEDCD]">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-[#A3B18A]" />
                <span className="text-xs font-semibold text-[#8B8B6B]">나의 다정한 답장</span>
              </div>
              <p className="text-[#5A5A40] text-sm font-medium line-clamp-2 leading-relaxed">{reply.previewText}</p>
              {reply.feedbackLabel && <p className="mt-2 text-xs font-bold text-[#E07A5F]">{reply.feedbackLabel}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

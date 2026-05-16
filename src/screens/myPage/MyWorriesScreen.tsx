import { FileText, Headphones, Send, Signal } from 'lucide-react';
import type { MyWorriesScreenProps } from './contract';

export function MyWorriesScreen(props: MyWorriesScreenProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold">나의 고민</h2>
          <p className="text-[#8B8B6B] text-sm mt-1">내가 작성한 고민과 도착한 답장을 확인합니다.</p>
        </div>
        <button onClick={props.onWriteWorry} className="px-4 py-3 bg-[#E07A5F] text-white rounded-xl shadow-sm font-bold flex items-center gap-2 hover:bg-[#D46A4F] transition-colors">
          <Send className="w-4 h-4" /> 고민 쓰기
        </button>
      </div>

      {props.state.status === 'empty' ? (
        <div className="text-center py-16 bg-white/50 rounded-3xl border border-dashed border-[#E9EDC9]">
          <FileText className="w-12 h-12 text-[#E9EDC9] mx-auto mb-3" />
          <p className="text-[#8B8B6B]">{props.state.message ?? '아직 작성한 고민이 없어요.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {props.items.map(worry => (
            <button
              key={worry.worryId}
              onClick={() => props.onSelectWorry(worry)}
              className={`w-full text-left p-6 rounded-2xl border relative group transition-all ${worry.isSelected ? 'bg-[#FAEDCD] border-[#D4A373]' : worry.hasUnreadReplies ? 'bg-[#FFF8F1] border-[#E07A5F] hover:bg-[#FAEDCD]' : 'bg-white border-[#E9EDC9] hover:bg-[#FAEDCD]'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Signal className="w-4 h-4 text-[#D4A373]" />
                <span className="text-[10px] font-bold text-[#8B8B6B]">{worry.categoryLabel}</span>
              </div>
              <p className="text-[#5A5A40] font-medium line-clamp-2 leading-relaxed">{worry.contentPreview}</p>
              <div className="mt-3 text-xs text-[#A3B18A] font-bold">
                {worry.isSelected ? '아래에서 확인 중' : `답장 확인하기 (${worry.replyCount})`}
              </div>
            </button>
          ))}
        </div>
      )}

      {props.selectedWorry && (
        <div className="grid gap-4">
          <div className="bg-[#FAEDCD]/50 p-4 rounded-2xl border border-[#FAEDCD]">
            <div className="text-xs font-bold text-[#D4A373] mb-2">선택한 고민</div>
            <p className="text-sm text-[#5A5A40] line-clamp-3 whitespace-pre-wrap">{props.selectedWorry.content}</p>
          </div>
          <div className="text-sm font-bold text-[#5A5A40]">도착한 답장 ({props.selectedWorry.replies.length})</div>
          {props.selectedWorry.repliesState.status === 'empty' ? (
            <div className="text-center py-10 bg-white/50 rounded-3xl border border-dashed border-[#E9EDC9]">
              <p className="text-[#8B8B6B] text-sm">{props.selectedWorry.repliesState.message ?? '아직 이 고민에 도착한 답장이 없어요.'}</p>
            </div>
          ) : props.selectedWorry.replies.map(reply => (
            <button key={reply.replyId} onClick={() => props.onSelectReply(reply)} className={`w-full text-left p-6 rounded-2xl border transition-all hover:bg-[#FAEDCD] ${reply.hasUnread ? 'bg-[#FFF8F1] border-[#E07A5F]' : 'bg-white border-[#E9EDC9]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Headphones className="w-4 h-4 text-[#A3B18A]" />
                <span className="text-xs font-semibold text-[#8B8B6B]">누군가의 따뜻한 답장</span>
              </div>
              <p className="text-[#5A5A40] font-medium line-clamp-2 leading-relaxed">{reply.previewText}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

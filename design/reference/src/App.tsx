import { useEffect, useMemo, useState, type ComponentType } from "react";

import Splash from "./screens/splash/Component";
import Login from "./screens/login/Component";
import OnboardingBasic from "./screens/onboarding-basic/Component";
import OnboardingDuplicate from "./screens/onboarding-duplicate/Component";
import OnboardingInterests from "./screens/onboarding-interests/Component";
import ReceivedWorries from "./screens/received-worries/Component";
import QuestionWriteA from "./screens/question-write-a/Component";
import AnswerCheck from "./screens/answer-check/Component";
import QuestionWriteB from "./screens/question-write-b/Component";
import MyPage from "./screens/my-page/Component";
import LoadingScreen from "./screens/loading/Component";
import EditInterests from "./screens/edit-interests/Component";
import MyAnswers from "./screens/my-answers/Component";
import PrivacyPolicy from "./screens/privacy-policy/Component";
import Logout from "./screens/logout/Component";
import AccountDeletion from "./screens/account-deletion/Component";
import AnswerWrite1 from "./screens/answer-write-1/Component";
import AnswerWrite2 from "./screens/answer-write-2/Component";
import AnswerWrite3 from "./screens/answer-write-3/Component";
import MyWorries from "./screens/my-worries/Component";

type Screen = {
  id: string;
  group: string;
  name: string;
  Component: ComponentType;
};

const screens: Screen[] = [
  { id: "splash", group: "Splash / Login", name: "Splash", Component: Splash },
  { id: "login", group: "Splash / Login", name: "로그인화면", Component: Login },
  { id: "onboarding-basic", group: "Onboarding", name: "온보딩기본정보", Component: OnboardingBasic },
  { id: "onboarding-duplicate", group: "Onboarding", name: "온보딩중복확인", Component: OnboardingDuplicate },
  { id: "onboarding-interests", group: "Onboarding", name: "온보딩주요관심사", Component: OnboardingInterests },
  { id: "received-worries", group: "Worries", name: "받은고민", Component: ReceivedWorries },
  { id: "question-write-a", group: "Question / Answer", name: "질문작성", Component: QuestionWriteA },
  { id: "answer-check", group: "Question / Answer", name: "답변확인", Component: AnswerCheck },
  { id: "question-write-b", group: "Question / My Page", name: "질문작성", Component: QuestionWriteB },
  { id: "my-page", group: "Question / My Page", name: "마이페이지", Component: MyPage },
  { id: "loading", group: "Utility", name: "로딩화면", Component: LoadingScreen },
  { id: "edit-interests", group: "Utility", name: "관심분야수정", Component: EditInterests },
  { id: "my-answers", group: "My Content", name: "내가쓴답변", Component: MyAnswers },
  { id: "privacy-policy", group: "My Content", name: "개인정보처리방침", Component: PrivacyPolicy },
  { id: "logout", group: "Account", name: "로그아웃", Component: Logout },
  { id: "account-deletion", group: "Account", name: "회원탈퇴", Component: AccountDeletion },
  { id: "answer-write-1", group: "Answer Writing", name: "답변작성1", Component: AnswerWrite1 },
  { id: "answer-write-2", group: "Answer Writing", name: "답변작성2", Component: AnswerWrite2 },
  { id: "answer-write-3", group: "Answer Writing", name: "답변작성3", Component: AnswerWrite3 },
  { id: "my-worries", group: "My Content", name: "내가쓴고민", Component: MyWorries },
];

function readHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

export default function App() {
  const [activeId, setActiveId] = useState(() => readHash() || screens[0].id);
  const activeScreen = screens.find((screen) => screen.id === activeId) ?? screens[0];
  const ActiveComponent = activeScreen.Component;

  const groupedScreens = useMemo(
    () =>
      screens.reduce<Record<string, Screen[]>>((groups, screen) => {
        groups[screen.group] = [...(groups[screen.group] ?? []), screen];
        return groups;
      }, {}),
    [],
  );

  useEffect(() => {
    const onHashChange = () => {
      setActiveId(readHash() || screens[0].id);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectScreen = (id: string) => {
    window.location.hash = id;
    setActiveId(id);
  };

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="grid min-h-screen grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-[#0f172a] p-5">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold tracking-normal">Qling Design Delivery</h1>
            <p className="mt-2 text-[13px] leading-5 text-slate-300">
              {screens.length}개 화면을 전달용 패키지에서 확인합니다.
            </p>
          </div>

          <nav className="space-y-5">
            {Object.entries(groupedScreens).map(([group, groupScreens]) => (
              <section key={group}>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {group}
                </h2>
                <div className="space-y-1">
                  {groupScreens.map((screen) => {
                    const selected = screen.id === activeScreen.id;

                    return (
                      <button
                        key={screen.id}
                        type="button"
                        onClick={() => selectScreen(screen.id)}
                        className={`w-full rounded-md px-3 py-2 text-left text-[14px] transition ${
                          selected
                            ? "bg-[#ff8b3d] font-bold text-[#111827]"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {screen.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col items-center justify-center gap-4 p-8">
          <div className="w-[393px]">
            <p className="text-[13px] font-bold text-slate-300">{activeScreen.group}</p>
            <h2 className="mt-1 text-[24px] font-bold tracking-normal">{activeScreen.name}</h2>
          </div>

          <div
            className="h-[852px] w-[393px] overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-white/20"
            data-screen-frame
            data-screen-id={activeScreen.id}
          >
            <ActiveComponent />
          </div>
        </section>
      </div>
    </main>
  );
}

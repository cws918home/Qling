import {
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import {
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  serverTimestamp,
  doc,
  updateDoc,
  Timestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { onMessage } from 'firebase/messaging';
import { auth, db, firebaseRuntimeConfig, googleProvider, isDevRuntime, messaging } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Radio,
  Mic2,
  Loader2,
  MessageSquare,
  XCircle,
  FileText,
  UserRound,
} from 'lucide-react';
import { cn } from './lib/utils';
import { usePushRegistration } from './services/pushRegistration';
import {
  CENTRAL_BOTTOM_NAVIGATION_ACTION,
  PRD_APP_TABS,
  routeAfterAuthProfileLoad,
  routeAfterOnboardingComplete,
  routeToWriteWorry,
  type AppRouteViewState,
  type PrdAppTab,
} from './services/appShell/prdNavigationPolicy';
import { routeRenderingBoundaryForRoute } from './services/appShell/routeRenderingBoundary';
import { withAuthProfileUid } from './services/authProfile/profileIdentity';
import {
  ReceivedWorriesContainer,
  type SelectedReceivedWorry,
} from './screens/receivedWorries/ReceivedWorriesContainer';
import { WriteWorryContainer } from './screens/writeForm/WriteWorryContainer';
import { WriteReplyContainer } from './screens/writeForm/WriteReplyContainer';
import { MyPageContainer } from './screens/myPage/MyPageContainer';
import { MyAnswersContainer } from './screens/myPage/MyAnswersContainer';
import {
  MyWorriesContainer,
  type SelectedMyReply,
  type SelectedMyWorry,
} from './screens/myPage/MyWorriesContainer';
import { ReplyDetailContainer } from './screens/replyDetail/ReplyDetailContainer';

// --- Constants ---
const CATEGORIES = WORRY_CATEGORIES;
const GENDERS = [
  { id: 'male', label: '남성' },
  { id: 'female', label: '여성' },
];

// --- Types ---
interface UserProfile {
  uid: string;
  gender: string;
  interests: string[];
  helpedCount?: number;
  createdAt: Timestamp;
  onboardingCompletedAt?: unknown;
  exampleWorriesCreatedAt?: unknown;
  exampleWorrySeedIds?: string[];
  exampleDeliveryIds?: string[];
}

async function createExampleWorriesForCurrentUser(user: FirebaseUser) {
  const token = await user.getIdToken();
  const response = await fetch('/api/users/me/example-worries', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Example worry creation failed.');
  }
  return response.json();
}

// --- App Component ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<AppRouteViewState>('login');
  
  const [selectedWorry, setSelectedWorry] = useState<SelectedReceivedWorry | null>(null);
  const [selectedMyWorry, setSelectedMyWorry] = useState<SelectedMyWorry | null>(null);
  const [selectedReply, setSelectedReply] = useState<SelectedMyReply | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    notificationPermission,
    pushRegistrationStatus,
    requestNotificationPermission,
    resetPushRegistrationOnSignOut,
  } = usePushRegistration({ user, loading });

  // Auth & Profile Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setLoading(true);
        if (currentUser) {
          try {
            await currentUser.getIdToken();
            if (isDevRuntime) {
              console.info('[Firebase diagnostics] auth ready', {
                projectId: firebaseRuntimeConfig.projectId,
                firestoreDatabaseId: firebaseRuntimeConfig.firestoreDatabaseId,
                authCurrentUserUid: auth.currentUser?.uid ?? null,
                callbackUid: currentUser.uid,
                getIdTokenSucceeded: true,
              });
            }
          } catch (tokenError) {
            const firebaseError = tokenError as { code?: unknown; message?: unknown };
            console.error('[Firebase diagnostics] getIdToken failed', {
              projectId: firebaseRuntimeConfig.projectId,
              firestoreDatabaseId: firebaseRuntimeConfig.firestoreDatabaseId,
              authCurrentUserUid: auth.currentUser?.uid ?? null,
              callbackUid: currentUser.uid,
              code: typeof firebaseError.code === 'string' ? firebaseError.code : 'unknown',
              message: typeof firebaseError.message === 'string' ? firebaseError.message : String(tokenError),
              error: tokenError,
            });
            throw tokenError;
          }
          setUser(currentUser);
          
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            setProfile(withAuthProfileUid(userData, currentUser.uid));
            setView(prev => routeAfterAuthProfileLoad(prev));
            if (!userData.exampleWorriesCreatedAt) {
              void createExampleWorriesForCurrentUser(currentUser)
                .then(async () => {
                  const refreshed = await getDoc(userRef);
                  if (refreshed.exists()) setProfile(withAuthProfileUid(refreshed.data() as UserProfile, currentUser.uid));
                })
                .catch(err => {
                  console.error('Example worry retry failed:', err);
                });
            }
          } else {
            setProfile(null);
            setView('onboarding');
          }
        } else {
          if (isDevRuntime) {
            console.info('[Firebase diagnostics] auth signed out', {
              projectId: firebaseRuntimeConfig.projectId,
              firestoreDatabaseId: firebaseRuntimeConfig.firestoreDatabaseId,
              authCurrentUserUid: auth.currentUser?.uid ?? null,
              getIdTokenSucceeded: false,
            });
          }
          setUser(null);
          setProfile(null);
          setView('login');
          void resetPushRegistrationOnSignOut();
        }
      } catch (err) {
        console.error("Auth State Error", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [resetPushRegistrationOnSignOut]);


  // Foreground Message Listener
  useEffect(() => {
    if (!messaging || !user) return;
    const unsubMessaging = onMessage(messaging, (payload) => {
      console.log("Foreground Message received:", payload);
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || "Qling", {
          body: payload.notification?.body,
          icon: '/pwa-192x192.png'
        });
      }
    });
    return () => unsubMessaging();
  }, [user]);

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login Error", err);
      setError("구글 로그인에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Presence Updater
  useEffect(() => {
    if (!profile) return;
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          lastActive: serverTimestamp()
        });
      } catch (e) {
        console.error("Presence update failed", e);
      }
    };
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleOnboardingSubmit = async (gender: string, interests: string[]) => {
    if (!user) {
      alert("로그인 정보가 없습니다.");
      return;
    }
    
    setIsProcessing(true);
    console.log("Submitting onboarding data...");

    try {
      const userRef = doc(db, 'users', user.uid);
      const now = Timestamp.now();
      
      const newProfileData: any = {
        uid: user.uid,
        gender,
        interests,
        createdAt: now,
        lastActive: serverTimestamp() // Set to server timestamp for matching
      };
      
      // 1. Save to Firestore
      await setDoc(userRef, newProfileData, { merge: true });
      console.log("Profile saved successfully.");

      // 2. Create server-owned onboarding examples before entering the feed.
      await createExampleWorriesForCurrentUser(user);
      const savedProfile = await getDoc(userRef);
      const profileData = savedProfile.exists()
        ? withAuthProfileUid(savedProfile.data(), user.uid)
        : { ...newProfileData, lastActive: now };

      // 3. Update local state after server-owned state is present.
      setProfile(profileData as UserProfile);
      
      // 4. Forcefully switch view
      setView(routeAfterOnboardingComplete());
      
      // 5. Scroll to top
      window.scrollTo(0, 0);

    } catch (e: any) {
      console.error("Onboarding Submit Error:", e);
      alert(`데이터 저장에 실패했습니다. (사유: ${e.message})`);
    } finally {
      setIsProcessing(false);
    }
  };

  const [filterAlert, setFilterAlert] = useState<string | null>(null);

  const profileInterests = profile?.interests ?? [];
  const visibleHomeInterestBadgeText = profileInterests.slice(0, 5).join(', ');
  const homeInterestBadgeText = profileInterests.length === 0
    ? '관심 주제'
    : `${visibleHomeInterestBadgeText}${profileInterests.length > 5 ? '...' : ''}`;
  const routeBoundary = routeRenderingBoundaryForRoute(view);
  const currentRoute = routeBoundary.currentRoute;

  if (loading) {
    return <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#D4A373] animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">접속 문제가 발생했습니다</h1>
        <p className="text-[#8B8B6B] mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl font-bold">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#5A5A40] font-sans selection:bg-[#FAEDCD]">
      <AnimatePresence>
        {filterAlert && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <XCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-lg text-gray-800">{filterAlert}</p>
              <button 
                onClick={() => setFilterAlert(null)}
                className="w-full py-3 bg-[#5A5A40] text-white rounded-xl font-bold transition-all hover:bg-[#4A4A30]"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (hidden before the authenticated shell) */}
      {routeBoundary.mountsAuthenticatedShell && (
        <header className="fixed top-0 left-0 right-0 bg-[#FDFCF8]/80 backdrop-blur-md z-50 border-b border-[#E9EDC9]/50">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => setView('답변하기')} className="text-xl font-serif font-bold tracking-tight text-[#D4A373] flex items-center gap-2">
              <Radio className="w-5 h-5" /> Qling
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E9EDC9]/50 rounded-full text-[10px] sm:text-xs font-bold text-[#A3B18A]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3B18A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3B18A]"></span>
                </span>
                연결됨
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={cn("max-w-2xl mx-auto px-6", routeBoundary.routeGroup === 'onboarding flow' ? "pt-12 pb-12" : "pt-24 pb-32")}>
        <AnimatePresence mode="wait">
          
          {/* 0. Login View */}
          {currentRoute === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-[#FAEDCD] rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Radio className="w-12 h-12 text-[#D4A373]" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-[#5A5A40]">Qling</h1>
                <p className="text-[#8B8B6B]">나의 이야기가 밤하늘을 타고<br/>누군가에게 닿는 시간</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isProcessing}
                className="flex items-center gap-3 px-8 py-4 bg-white border border-[#E9EDC9] rounded-2xl shadow-sm hover:shadow-md transition-all text-[#5A5A40] font-medium disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                구글로 시작하기
              </button>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </motion.div>
          )}

          {/* 1. Onboarding View */}
          {currentRoute === 'onboarding' && (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-4 mb-10">
                <div className="w-20 h-20 bg-[#FAEDCD] rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Mic2 className="w-10 h-10 text-[#D4A373]" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-[#5A5A40]">주파수를 맞춰주세요</h1>
                <p className="text-[#8B8B6B]">당신의 취향을 알려주시면<br/>답변할 수 있는 고민을 먼저 전해드릴게요.</p>
              </div>

              <OnboardingForm onSubmit={handleOnboardingSubmit} isProcessing={isProcessing} />
            </motion.div>
          )}

          {currentRoute === 'my_answers' && (
            <motion.div key="my_answers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <MyAnswersContainer
                user={user}
                setView={setView}
                setSelectedReply={setSelectedReply}
              />
            </motion.div>
          )}

          {(
            currentRoute === '마이페이지'
            || currentRoute === 'my_page'
            || currentRoute === 'edit_interests'
            || currentRoute === 'privacy_policy'
            || currentRoute === 'operation_policy'
            || currentRoute === 'logout_confirmation'
            || currentRoute === 'account_deletion_confirmation'
            || currentRoute === 'notification_settings'
            || currentRoute === 'app_install_guide'
          ) && (
            <motion.div key="my_page_account" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <MyPageContainer
                route={view}
                user={user}
                profile={profile}
                setView={setView}
                setFilterAlert={setFilterAlert}
                notificationPermission={notificationPermission}
                pushRegistrationStatus={pushRegistrationStatus}
                requestNotificationPermission={requestNotificationPermission}
                resetPushRegistrationOnSignOut={resetPushRegistrationOnSignOut}
              />
            </motion.div>
          )}

          {/* 2. Answer View (Feed) */}
          {(currentRoute === '답변하기' || currentRoute === 'received_worries') && (
            <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold">답변하기</h2>
                <span className="text-xs bg-[#E9EDC9] text-[#5A5A40] px-3 py-1 rounded-full">{homeInterestBadgeText}</span>
              </div>
              <ReceivedWorriesContainer
                user={user}
                profile={profile}
                setView={setView}
                selectedWorry={selectedWorry}
                setSelectedWorry={setSelectedWorry}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {/* 3. Write Worry View */}
          {currentRoute === 'write_worry' && (
            <motion.div key="write_worry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <WriteWorryContainer
                user={user}
                profile={profile}
                setView={setView}
                clearSelectedMyWorry={() => setSelectedMyWorry(null)}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {/* 4. Write Reply View */}
          {currentRoute === 'write_reply' && selectedWorry && (
            <motion.div key="write_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <WriteReplyContainer
                user={user}
                selectedWorry={selectedWorry}
                setView={setView}
                clearSelectedWorry={() => setSelectedWorry(null)}
                clearSelectedReply={() => setSelectedReply(null)}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {/* 5. My Worries View */}
          {(currentRoute === '나의 고민' || currentRoute === 'my_worries' || currentRoute === 'my_worry_detail') && (
            <motion.div key="my_worries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <MyWorriesContainer
                user={user}
                selectedMyWorry={selectedMyWorry}
                setSelectedMyWorry={setSelectedMyWorry}
                setSelectedReply={setSelectedReply}
                setView={setView}
              />
            </motion.div>
          )}

          {/* 6. Read Reply & Feedback View */}
          {(currentRoute === 'read_received_reply' || currentRoute === 'received_answer_detail') && selectedReply && (
            <motion.div key="read_received_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ReplyDetailContainer
                mode="received-reply"
                route={view}
                selectedReply={selectedReply}
                setSelectedReply={setSelectedReply}
                selectedMyWorryContent={selectedMyWorry?.content}
                setView={setView}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {/* 7. Read My Reply View */}
          {(currentRoute === 'read_my_reply' || currentRoute === 'my_answer_detail') && selectedReply && (
            <motion.div key="read_my_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ReplyDetailContainer
                mode="my-answer"
                route={view}
                selectedReply={selectedReply}
                setSelectedReply={setSelectedReply}
                setView={setView}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {currentRoute === 'my_answer_detail' && !selectedReply && (
            <motion.div key="my_answer_detail_loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <ReplyDetailContainer
                mode="my-answer"
                route={view}
                selectedReply={selectedReply}
                setSelectedReply={setSelectedReply}
                setView={setView}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      {routeBoundary.mountsBottomNavigation && routeBoundary.authenticatedTab && (
        <BottomTabBar
          activeTab={routeBoundary.authenticatedTab}
          onSelect={(tab) => setView(tab)}
          onCentralAction={() => setView(routeToWriteWorry())}
        />
      )}
    </div>
  );
}

// --- Sub Components ---

function BottomTabBar({
  activeTab,
  onSelect,
  onCentralAction,
}: {
  activeTab: PrdAppTab;
  onSelect: (tab: PrdAppTab) => void;
  onCentralAction: () => void;
}) {
  const iconByTab: Record<PrdAppTab, ReactNode> = {
    답변하기: <MessageSquare className="w-5 h-5" />,
    '나의 고민': <FileText className="w-5 h-5" />,
    마이페이지: <UserRound className="w-5 h-5" />,
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E9EDC9]">
      <button
        type="button"
        aria-label={CENTRAL_BOTTOM_NAVIGATION_ACTION.accessibleLabel}
        onClick={onCentralAction}
        className="absolute left-1/2 -translate-x-1/2 -top-7 px-4 h-12 rounded-full bg-[#E07A5F] text-white shadow-lg text-xs font-bold flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {CENTRAL_BOTTOM_NAVIGATION_ACTION.label}
      </button>
      <div className="max-w-2xl mx-auto grid grid-cols-3 px-2 py-2">
        {PRD_APP_TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelect(tab)}
              className={cn(
                "h-14 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "bg-[#FAEDCD] text-[#5A5A40]" : "text-[#8B8B6B] hover:bg-[#FDFCF8]"
              )}
            >
              {iconByTab[tab]}
              <span>{tab}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function OnboardingForm({ onSubmit, isProcessing, initialGender = '', initialInterests = [] }: { onSubmit: (g: string, i: string[]) => void, isProcessing: boolean, initialGender?: string, initialInterests?: string[] }) {
  const [gender, setGender] = useState<string>(initialGender);
  const [interests, setInterests] = useState<string[]>(initialInterests);

  const toggleInterest = (i: string) => {
    if (interests.includes(i)) setInterests(interests.filter(x => x !== i));
    else setInterests([...interests, i]);
  };

  const isValid = gender !== '' && interests.length > 0;
  const isEditing = initialGender !== '';

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h3 className="font-bold text-lg">성별</h3>
        <div className="flex gap-3">
          {GENDERS.map(g => (
            <button 
              key={g.id} onClick={() => setGender(g.id)}
              className={cn("flex-1 py-3 rounded-xl border font-medium transition-all", gender === g.id ? "bg-[#D4A373] text-white border-[#D4A373] shadow-md" : "bg-white text-[#8B8B6B] border-[#E9EDC9] hover:bg-[#FAEDCD]")}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">가장 관심있는 주제 (복수 선택)</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const isSelected = interests.includes(cat);
            return (
              <button 
                key={cat} onClick={() => toggleInterest(cat)}
                className={cn("px-4 py-2.5 rounded-full border text-sm font-bold transition-all", isSelected ? "bg-[#A3B18A] text-white border-[#A3B18A] shadow-md" : "bg-white text-[#8B8B6B] border-[#E9EDC9] hover:bg-[#E9EDC9]")}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      <button 
        onClick={() => onSubmit(gender, interests)}
        disabled={!isValid || isProcessing}
        className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-bold shadow-xl hover:bg-[#4A4A30] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-8"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isEditing ? '설정 저장하기' : '주파수 맞추기 완료'} <ArrowRightIcon /></>}
      </button>
    </div>
  );
}

function ArrowRightIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> }

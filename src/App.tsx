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
  signOut,
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
  ArrowLeft,
  Radio,
  Headphones,
  Mic2,
  Signal,
  RadioReceiver,
  Heart,
  Loader2,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  FileText,
  Bell,
  Share2,
  QrCode,
  UserRound,
  Shield,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from './lib/utils';
import {
  markRepliesForWorryReadWithServer,
} from './services/readState/apiClient';
import { submitReplyFeedbackWithProductionAdapters } from './services/replyFeedback/production';
import type { ReplyFeedback } from './services/replyFeedback/types';
import {
  useMyGivenReplies,
  useMyWorries,
  useRepliesForWorry,
  type MyWorryListItem,
  type ReplyReadModelItem,
} from './services/myWorries';
import { usePushRegistration } from './services/pushRegistration';
import { deleteMyAccountViaApi } from './services/userAccount/client';
import {
  CENTRAL_BOTTOM_NAVIGATION_ACTION,
  PRD_APP_TABS,
  backRouteForRoute,
  backRouteFromMyReplyDetail,
  backRouteFromReceivedReplyDetail,
  routeAfterFeedbackPublish,
  routeAfterAuthProfileLoad,
  routeAfterOnboardingComplete,
  routeToEditInterests,
  routeToMyAnswers,
  routeToMyReplyDetail,
  routeToReceivedReplyDetail,
  routeToWriteWorry,
  type AppRouteState,
  type AppRouteViewState,
  type PrdAppTab,
} from './services/appShell/prdNavigationPolicy';
import { routeRenderingBoundaryForRoute } from './services/appShell/routeRenderingBoundary';
import { CONTENT_MAX_LENGTH, validateDraftContent } from './services/validation/content';
import { clearDraft, getDraft, setDraft, type DraftMap } from './services/drafts/contentDrafts';
import { withAuthProfileUid } from './services/authProfile/profileIdentity';
import {
  ReceivedWorriesContainer,
  type SelectedReceivedWorry,
} from './screens/receivedWorries/ReceivedWorriesContainer';
import { WriteWorryContainer } from './screens/writeForm/WriteWorryContainer';
import { WriteReplyContainer } from './screens/writeForm/WriteReplyContainer';

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
  const [selectedMyWorry, setSelectedMyWorry] = useState<MyWorryListItem | null>(null);
  const [selectedReply, setSelectedReply] = useState<ReplyReadModelItem | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackCommentDrafts, setFeedbackCommentDrafts] = useState<DraftMap>({});
  
  // PWA Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const {
    notificationPermission,
    pushRegistrationStatus,
    fcmDebugToken,
    requestNotificationPermission,
    resetPushRegistrationOnSignOut,
  } = usePushRegistration({ user, loading });
  const { myWorries } = useMyWorries({ user });
  const { repliesForWorry } = useRepliesForWorry({
    user,
    worryId: selectedMyWorry?.id ?? null,
  });
  const { myGivenReplies } = useMyGivenReplies({ user });

  useEffect(() => {
    if (!user || !selectedMyWorry) return;

    void markRepliesForWorryReadWithServer({
      user,
      worryId: selectedMyWorry.id,
    }).then(result => {
      if (result.status === 'failed') {
        console.error('Failed to mark replies read:', result.reason);
      }
    });
  }, [selectedMyWorry, user]);

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

  const handleSignOut = async () => {
    await resetPushRegistrationOnSignOut();
    await signOut(auth);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const result = await deleteMyAccountViaApi({ user });
      if (result.status === 'failed') {
        setFilterAlert(result.reason);
        return;
      }

      setView(backRouteForRoute('account_deletion_confirmation'));
      try {
        await resetPushRegistrationOnSignOut();
      } catch (cleanupError) {
        console.error('Local push cleanup after account deletion failed:', cleanupError);
      }
      await signOut(auth);
    } catch (deleteError) {
      console.error('Account deletion failed:', deleteError);
      setFilterAlert('계정 삭제 처리 중 문제가 발생했습니다.');
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

  const showRejectionAlert = (result: { reason?: string; userMessage?: string; helpMessage?: string }) => {
    const message = result.userMessage ?? result.reason ?? "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    setFilterAlert(result.helpMessage ? `${message}\n\n${result.helpMessage}` : message);
  };

  const giveFeedback = async (_replyId: string, feedbackType: ReplyFeedback) => {
    if (!selectedReply) return;

    try {
      const result = await submitReplyFeedbackWithProductionAdapters({
        reply: selectedReply,
        feedbackType,
      });
      if (result.status === 'rejected') {
        showRejectionAlert(result);
        return;
      }
      setSelectedReply(prev => prev ? { ...prev, feedback: result.feedback ?? feedbackType } : null);
      setView(prev => routeAfterFeedbackPublish(prev));
    } catch (e) {
      console.error(e);
    }
  };

  const selectedMyWorryReplies = repliesForWorry.map(reply => ({
    ...reply,
    replyToContent: reply.replyToContent ?? selectedMyWorry?.content,
  }));
  const profileInterests = profile?.interests ?? [];
  const visibleHomeInterestBadgeText = profileInterests.slice(0, 5).join(', ');
  const homeInterestBadgeText = profileInterests.length === 0
    ? '관심 주제'
    : `${visibleHomeInterestBadgeText}${profileInterests.length > 5 ? '...' : ''}`;
  const routeBoundary = routeRenderingBoundaryForRoute(view);
  const currentRoute = routeBoundary.currentRoute;
  const currentMyWorryDetailRoute: Extract<AppRouteState, { route: 'my_worry_detail' }> | null =
    typeof view === 'string' || view.route !== 'my_worry_detail' ? null : view;
  const currentMyAnswerDetailRoute: Extract<AppRouteState, { route: 'my_answer_detail' | 'read_my_reply' }> | null =
    typeof view === 'string' || (view.route !== 'my_answer_detail' && view.route !== 'read_my_reply') ? null : view;

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
        {currentRoute === 'logout_confirmation' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-12 h-12 bg-[#FAEDCD] rounded-full flex items-center justify-center mx-auto text-[#D4A373]">
                <ArrowLeft className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg text-gray-800">로그아웃할까요?</p>
                <p className="text-sm text-[#8B8B6B] leading-relaxed">이 기기에서 Qling 계정 연결을 해제합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setView(backRouteForRoute('logout_confirmation'))}
                  disabled={isProcessing}
                  className="py-3 bg-[#FDFCF8] border border-[#E9EDC9] text-[#5A5A40] rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={isProcessing}
                  className="py-3 bg-[#5A5A40] text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  로그아웃
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {currentRoute === 'account_deletion_confirmation' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg text-gray-800">계정을 삭제할까요?</p>
                <p className="text-sm text-[#8B8B6B] leading-relaxed">삭제 후에는 이 계정으로 고민 쓰기, 답장, 패스, 피드백을 사용할 수 없습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setView(backRouteForRoute('account_deletion_confirmation'))}
                  disabled={isProcessing}
                  className="py-3 bg-[#FDFCF8] border border-[#E9EDC9] text-[#5A5A40] rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isProcessing}
                  className="py-3 bg-red-500 text-white rounded-xl font-bold transition-all hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  삭제
                </button>
              </div>
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

          {currentRoute === 'edit_interests' && profile && (
            <motion.div key="edit_interests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <button onClick={() => setView(backRouteForRoute('edit_interests'))} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 마이페이지로
              </button>
              <div className="text-left space-y-2">
                <h1 className="text-3xl font-serif font-bold text-[#5A5A40]">관심 분야 수정</h1>
                <p className="text-[#8B8B6B]">관심 분야 수정 기능은 다음 단계에서 실제 저장 흐름과 연결됩니다.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-4">
                <div className="text-xs font-bold text-[#D4A373]">현재 관심 분야</div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(interest => (
                    <span key={interest} className="px-3 py-1 rounded-full bg-[#FAEDCD] text-xs font-bold text-[#5A5A40]">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentRoute === 'my_answers' && (
            <motion.div key="my_answers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={() => setView(backRouteForRoute('my_answers'))} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 마이페이지로
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold">내가 쓴 답변</h2>
                <p className="text-[#8B8B6B] text-sm">내가 보낸 답변과 받은 반응을 확인합니다.</p>
              </div>
              {myGivenReplies.length === 0 ? (
                <div className="text-center py-10 bg-[#FDFCF8] rounded-2xl border border-dashed border-[#E9EDC9]">
                  <Heart className="w-10 h-10 text-[#E9EDC9] mx-auto mb-3" />
                  <p className="text-[#8B8B6B] text-sm">아직 내가 보낸 위로가 없어요.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {myGivenReplies.map(reply => (
                    <button
                      key={reply.id}
                      onClick={() => {
                        setSelectedReply(reply);
                        setView(routeToMyReplyDetail({
                          replyId: reply.id,
                          deliveryId: reply.deliveryId,
                          worryId: reply.worryId,
                        }));
                      }}
                      className="w-full text-left p-4 bg-[#FDFCF8] rounded-xl border border-[#E9EDC9] transition-all hover:bg-[#FAEDCD]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="w-4 h-4 text-[#A3B18A]" />
                        <span className="text-xs font-semibold text-[#8B8B6B]">나의 다정한 답장</span>
                      </div>
                      <p className="text-[#5A5A40] text-sm font-medium line-clamp-2 leading-relaxed">
                        {reply.refinedContent}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(currentRoute === 'privacy_policy' || currentRoute === 'operation_policy') && (
            <motion.div key={currentRoute} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={() => setView(backRouteForRoute(view))} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 마이페이지로
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold">{currentRoute === 'privacy_policy' ? '개인정보처리방침' : '운영정책'}</h2>
                <p className="text-[#8B8B6B] text-sm">정책 본문 준비 중입니다.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] text-sm text-[#8B8B6B] leading-relaxed">
                정책 본문 준비 중입니다.
              </div>
            </motion.div>
          )}

          {/* 1.5 My Page View */}
          {currentRoute === '마이페이지' && profile && (
            <motion.div key="my_page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold">마이페이지</h2>
                <p className="text-[#8B8B6B] text-sm">내 프로필과 내가 남긴 답장을 확인합니다.</p>
              </div>
              <div className="flex items-center gap-4 bg-[#FAEDCD]/50 p-6 rounded-2xl border border-[#FAEDCD] mb-8">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#E07A5F] shadow-sm">
                  <Heart className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#5A5A40]">나의 따뜻한 발자취</h2>
                  <p className="text-[#8B8B6B] text-sm">지금까지 <strong className="text-[#E07A5F]">{profile.helpedCount || 0}</strong>번의 고민을 다정하게 안아주셨어요.</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FAEDCD] rounded-full flex items-center justify-center text-[#D4A373]">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#5A5A40]">내가 남긴 답장</h3>
                      <p className="text-xs text-[#8B8B6B]">좋아요와 코멘트는 기존 답장 읽기 화면에서 확인합니다.</p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#E9EDC9] text-[#5A5A40] px-3 py-1 rounded-full">{myGivenReplies.length}</span>
                </div>
                {myGivenReplies.length === 0 ? (
                  <div className="text-center py-10 bg-[#FDFCF8] rounded-2xl border border-dashed border-[#E9EDC9]">
                    <Heart className="w-10 h-10 text-[#E9EDC9] mx-auto mb-3" />
                    <p className="text-[#8B8B6B] text-sm">아직 내가 보낸 위로가 없어요.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {myGivenReplies.map(reply => (
                      <button
                        key={reply.id}
                        onClick={() => {
                          setSelectedReply(reply);
                          setView(routeToMyReplyDetail({
                            replyId: reply.id,
                            deliveryId: reply.deliveryId,
                            worryId: reply.worryId,
                          }));
                        }}
                        className="w-full text-left p-4 bg-[#FDFCF8] rounded-xl border border-[#E9EDC9] transition-all hover:bg-[#FAEDCD]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Send className="w-4 h-4 text-[#A3B18A]" />
                          <span className="text-xs font-semibold text-[#8B8B6B]">나의 다정한 답장</span>
                        </div>
                        <p className="text-[#5A5A40] text-sm font-medium line-clamp-2 leading-relaxed">
                          {reply.refinedContent}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FAEDCD] rounded-full flex items-center justify-center text-[#D4A373]">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#5A5A40]">푸시 알림 설정</h3>
                      <p className="text-xs text-[#8B8B6B]">새 고민이나 답장 알림을 받습니다.</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold",
                    notificationPermission === 'granted' ? "bg-green-50 text-green-600" : (notificationPermission === 'denied' ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500")
                  )}>
                    {notificationPermission === 'granted' ? '활성화됨' : (notificationPermission === 'denied' ? '차단됨' : '설정 필요')}
                  </div>
                  </div>

                  {fcmDebugToken && (
                  <div className="p-3 bg-gray-50 rounded-xl text-[8px] break-all text-gray-400 font-mono">
                    <strong>FCM Token:</strong> {fcmDebugToken}
                  </div>
                  )}
                {notificationPermission !== 'granted' && (
                  <button 
                    onClick={requestNotificationPermission}
                    className="w-full py-3 bg-[#E07A5F] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#D46A4F] transition-all flex items-center justify-center gap-2"
                  >
                    <Signal className="w-4 h-4" /> 알림 권한 허용하기
                  </button>
                )}
                {notificationPermission === 'denied' && (
                  <p className="text-[10px] text-[#E07A5F] text-center">브라우저 설정에서 알림 권한을 직접 허용해 주세요.</p>
                )}
              </div>

              <div className="bg-[#5A5A40] p-8 rounded-3xl text-white space-y-8 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-[#FAEDCD]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">어플 다운로드 / 공유</h3>
                    <p className="text-sm text-[#FAEDCD]/80">바탕화면에 설치하여 진짜 앱처럼 쓰세요.</p>
                  </div>
                </div>

                {/* 1. One-Click Install Button (Android/Chrome) */}
                {isInstallable && (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full py-4 bg-[#E07A5F] text-white rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    <Send className="w-5 h-5 rotate-90" /> 지금 바로 어플 설치하기
                  </button>
                )}
                
                {/* 2. QR Section */}
                <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-inner">
                  <QRCodeSVG 
                    value={window.location.origin} 
                    size={140}
                    level="H"
                  />
                </div>

                {/* 3. Detailed Instructions */}
                <div className="space-y-6 pt-4 border-t border-white/10">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#FAEDCD] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#E07A5F] rounded-full" /> 아이폰(iOS) 설치 방법
                    </h4>
                    <p className="text-[11px] text-[#FAEDCD]/70 leading-relaxed pl-3">
                      1. 하단 메뉴의 <strong className="text-white">[공유 버튼 <Share2 className="w-3 h-3 inline mb-0.5" />]</strong>을 누릅니다.<br/>
                      2. 리스트를 내려 <strong className="text-white">[홈 화면에 추가]</strong>를 누릅니다.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#FAEDCD] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#A3B18A] rounded-full" /> 안드로이드 설치 방법
                    </h4>
                    <p className="text-[11px] text-[#FAEDCD]/70 leading-relaxed pl-3">
                      1. 상단 <strong className="text-white">[설치 버튼]</strong>을 누르거나,<br/>
                      2. 브라우저 우측 상단 <strong className="text-white">[점 세개]</strong> 메뉴에서 <strong className="text-white">[앱 설치]</strong>를 누릅니다.
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: 'Qling', text: '익명으로 고민을 나누고 답장을 주고받는 앱', url: window.location.origin });
                      } else {
                        navigator.clipboard.writeText(window.location.origin);
                        alert("링크가 복사되었습니다!");
                      }
                    }}
                    className="flex items-center gap-2 mx-auto text-xs font-bold bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all"
                  >
                    <Share2 className="w-3 h-3" /> 링크 공유하기
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] space-y-3">
                <h3 className="font-bold text-[#5A5A40]">더보기</h3>
                <div className="grid gap-2">
                  <button
                    onClick={() => setView(routeToEditInterests())}
                    className="w-full p-4 rounded-xl bg-[#FDFCF8] border border-[#E9EDC9] text-left flex items-center gap-3"
                  >
                    <Sparkles className="w-5 h-5 text-[#A3B18A]" />
                    <span className="font-bold text-sm">관심 분야 수정</span>
                  </button>
                  <button
                    onClick={() => setView(routeToMyAnswers())}
                    className="w-full p-4 rounded-xl bg-[#FDFCF8] border border-[#E9EDC9] text-left flex items-center gap-3"
                  >
                    <Send className="w-5 h-5 text-[#A3B18A]" />
                    <span className="font-bold text-sm">내가 쓴 답변</span>
                  </button>
                  <button
                    onClick={() => setView('privacy_policy')}
                    className="w-full p-4 rounded-xl bg-[#FDFCF8] border border-[#E9EDC9] text-left flex items-center gap-3"
                  >
                    <Shield className="w-5 h-5 text-[#A3B18A]" />
                    <span className="font-bold text-sm">개인정보처리방침</span>
                  </button>
                  <button
                    onClick={() => setView('operation_policy')}
                    className="w-full p-4 rounded-xl bg-[#FDFCF8] border border-[#E9EDC9] text-left flex items-center gap-3"
                  >
                    <Shield className="w-5 h-5 text-[#A3B18A]" />
                    <span className="font-bold text-sm">운영정책</span>
                  </button>
                  <button
                    onClick={() => setView('logout_confirmation')}
                    className="w-full p-4 rounded-xl bg-[#FDFCF8] border border-[#E9EDC9] text-left flex items-center gap-3"
                  >
                    <ArrowLeft className="w-5 h-5 text-[#8B8B6B]" />
                    <span className="font-bold text-sm">로그아웃</span>
                  </button>
                  <button
                    onClick={() => setView('account_deletion_confirmation')}
                    className="w-full p-4 rounded-xl bg-red-50 border border-red-100 text-left flex items-center gap-3"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="font-bold text-sm text-red-600">계정 삭제</span>
                  </button>
                </div>
              </div>
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
          {(currentRoute === '나의 고민' || currentRoute === 'my_worries') && (
            <motion.div key="my_worries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold">나의 고민</h2>
                  <p className="text-[#8B8B6B] text-sm mt-1">내가 작성한 고민과 도착한 답장을 확인합니다.</p>
                </div>
                <button
                  onClick={() => setView(routeToWriteWorry())}
                  className="px-4 py-3 bg-[#E07A5F] text-white rounded-xl shadow-sm font-bold flex items-center gap-2 hover:bg-[#D46A4F] transition-colors"
                >
                  <Send className="w-4 h-4" /> 고민 쓰기
                </button>
              </div>

              {myWorries.length === 0 ? (
                <div className="text-center py-16 bg-white/50 rounded-3xl border border-dashed border-[#E9EDC9]">
                  <FileText className="w-12 h-12 text-[#E9EDC9] mx-auto mb-3" />
                  <p className="text-[#8B8B6B]">아직 작성한 고민이 없어요.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myWorries.map((worry) => (
                    <button
                      key={worry.id}
                      onClick={() => setSelectedMyWorry(worry)}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border relative group transition-all",
                        selectedMyWorry?.id === worry.id
                          ? "bg-[#FAEDCD] border-[#D4A373]"
                          : worry.hasUnreadReplies
                            ? "bg-[#FFF8F1] border-[#E07A5F] hover:bg-[#FAEDCD]"
                            : "bg-white border-[#E9EDC9] hover:bg-[#FAEDCD]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Signal className="w-4 h-4 text-[#D4A373]" />
                        <span className="text-[10px] font-bold text-[#8B8B6B]">
                          {worry.categories.join(', ') || '기타'}
                        </span>
                      </div>
                      <p className="text-[#5A5A40] font-medium line-clamp-2 leading-relaxed">
                        {worry.content}
                      </p>
                      <div className="mt-3 text-xs text-[#A3B18A] font-bold">
                        {selectedMyWorry?.id === worry.id ? '아래에서 확인 중' : `답장 확인하기 (${worry.humanReplyCount ?? 0})`}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedMyWorry && (
                <div className="grid gap-4">
                  <div className="bg-[#FAEDCD]/50 p-4 rounded-2xl border border-[#FAEDCD]">
                    <div className="text-xs font-bold text-[#D4A373] mb-2">선택한 고민</div>
                    <p className="text-sm text-[#5A5A40] line-clamp-3 whitespace-pre-wrap">{selectedMyWorry.content}</p>
                  </div>
                  <div className="text-sm font-bold text-[#5A5A40]">도착한 답장 ({selectedMyWorryReplies.length})</div>
                  {selectedMyWorryReplies.length === 0 ? (
                    <div className="text-center py-10 bg-white/50 rounded-3xl border border-dashed border-[#E9EDC9]">
                      <p className="text-[#8B8B6B] text-sm">아직 이 고민에 도착한 답장이 없어요.</p>
                    </div>
                  ) : selectedMyWorryReplies.map(reply => (
                    <button
                      key={reply.id}
                      onClick={() => {
                        setSelectedReply(reply);
                        setView(routeToReceivedReplyDetail({
                          worryId: selectedMyWorry.id,
                          replyId: reply.id,
                        }));
                      }}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border transition-all hover:bg-[#FAEDCD]",
                        reply.hasUnread ? "bg-[#FFF8F1] border-[#E07A5F]" : "bg-white border-[#E9EDC9]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Headphones className="w-4 h-4 text-[#A3B18A]" />
                        <span className="text-xs font-semibold text-[#8B8B6B]">누군가의 따뜻한 답장</span>
                      </div>
                      <p className="text-[#5A5A40] font-medium line-clamp-2 leading-relaxed">
                        {reply.refinedContent}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {currentRoute === 'my_worry_detail' && (
            <motion.div key="my_worry_detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={() => setView(backRouteForRoute('my_worry_detail'))} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 나의 고민으로
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold">작성한 고민</h2>
                <p className="text-[#8B8B6B] text-sm">
                  방금 작성한 고민 상세를 불러오는 중입니다.
                  {currentMyWorryDetailRoute ? ` worryId: ${currentMyWorryDetailRoute.worryId}` : ''}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] text-sm text-[#8B8B6B]">
                작성한 고민 상세 준비 중입니다.
              </div>
            </motion.div>
          )}

          {/* 6. Read Reply & Feedback View */}
          {(currentRoute === 'read_received_reply' || currentRoute === 'received_answer_detail') && selectedReply && (
            <motion.div key="read_received_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <button onClick={() => setView(backRouteFromReceivedReplyDetail())} className="mb-6 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 목록으로
              </button>
              
              <div className="space-y-6">
                {/* Original Worry */}
                <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9]">
                  <div className="text-xs font-bold text-[#A3B18A] mb-3">내가 보냈던 고민</div>
                  <p className="text-[#8B8B6B] text-sm leading-relaxed whitespace-pre-wrap opacity-80">
                    {selectedReply.replyToContent ?? '선택한 고민의 답장입니다.'}
                  </p>
                </div>

                {/* The Reply */}
                <div className="bg-[#FAEDCD] p-8 rounded-2xl shadow-sm border border-[#D4A373]">
                  <div className="flex items-center gap-2 mb-6">
                    <Heart className="w-5 h-5 text-[#E07A5F]" />
                    <span className="font-bold text-[#D4A373]">도착한 답장</span>
                  </div>
                  <p className="text-[#5A5A40] text-lg font-medium leading-loose whitespace-pre-wrap mb-8">
                    {selectedReply.refinedContent}
                  </p>
                </div>

                <div className="pt-8 text-center border-t border-[#E9EDC9]">
                  {selectedReply.feedback ? (
                    <div className="space-y-6">
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E9EDC9] rounded-full text-sm font-bold text-[#5A5A40]">
                        {selectedReply.feedback === 'helpful' ? (
                          <><CheckCircle2 className="w-5 h-5 text-[#A3B18A]" /> 위로가 되었다고 마음을 전했어요.</>
                        ) : (
                          <><CheckCircle2 className="w-5 h-5 text-[#8B8B6B]" /> 확인을 완료했어요.</>
                        )}
                      </div>
                      
                      {!selectedReply.publisherComment && selectedReply.feedback === 'helpful' ? (
                        <div className="bg-white p-6 rounded-2xl border border-[#FAEDCD]">
                          <h4 className="font-bold text-[#5A5A40] mb-2 text-sm">따뜻한 마음이 담긴 답장에 코멘트 남기기</h4>
                          <p className="text-xs text-[#8B8B6B] mb-4">내 고민을 들어준 분에게 감사 인사나 추가 코멘트를 남길 수 있습니다.</p>
                          <CommentForm 
                            replyId={selectedReply.id} 
                            value={getDraft(feedbackCommentDrafts, selectedReply.id)}
                            onChange={content => setFeedbackCommentDrafts(prev => setDraft(prev, selectedReply.id, content))}
                            onCommentAdded={(c) => setSelectedReply({...selectedReply, publisherComment: c})} 
                            onSubmit={selectedReply.source === 'prd_replies'
                              ? async content => {
                                const result = await submitReplyFeedbackWithProductionAdapters({
                                  reply: selectedReply,
                                  feedbackType: 'helpful',
                                  comment: content,
                                });
                                if (result.status === 'rejected') {
                                  showRejectionAlert(result);
                                  return result;
                                }
                                setFeedbackCommentDrafts(prev => clearDraft(prev, selectedReply.id));
                                return result;
                              }
                              : undefined}
                            onError={message => setFilterAlert(message)}
                          />

                        </div>
                      ) : selectedReply.publisherComment ? (
                        <div className="bg-[#FAEDCD]/50 p-6 rounded-2xl border border-[#E9EDC9]">
                          <div className="text-xs font-bold text-[#A3B18A] mb-2">내가 남긴 코멘트</div>
                          <p className="text-[#5A5A40] text-sm leading-relaxed">{selectedReply.publisherComment}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg mb-4 text-[#5A5A40]">이 답장이 해결이나 위로에 도움이 되었나요?</h3>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button 
                          onClick={() => giveFeedback(selectedReply.id, 'helpful')}
                          className="w-full sm:w-auto px-6 py-4 bg-[#E07A5F] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#D46A4F] transition-all"
                        >
                          <ThumbsUp className="w-5 h-5" /> 위로가 되었어요!
                        </button>
                        <button 
                          onClick={() => giveFeedback(selectedReply.id, 'not_helpful')}
                          className="w-full sm:w-auto px-6 py-4 bg-white border border-[#E9EDC9] text-[#8B8B6B] rounded-xl font-bold hover:bg-[#FAEDCD] transition-all"
                        >
                          그냥 그랬어요
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* 7. Read My Reply View */}
          {(currentRoute === 'read_my_reply' || currentRoute === 'my_answer_detail') && selectedReply && (
            <motion.div key="read_my_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <button onClick={() => setView(backRouteFromMyReplyDetail())} className="mb-6 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 목록으로
              </button>
              
              <div className="space-y-6">
                {/* Original Worry */}
                <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9]">
                  <div className="text-xs font-bold text-[#A3B18A] mb-3">전달받은 고민</div>
                  <p className="text-[#8B8B6B] text-sm leading-relaxed whitespace-pre-wrap opacity-80">
                    {selectedReply.replyToContent ?? '내가 답장한 고민입니다.'}
                  </p>
                </div>

                {/* My Reply */}
                <div className="bg-[#FAEDCD] p-8 rounded-2xl shadow-sm border border-[#D4A373]">
                  <div className="flex items-center gap-2 mb-6">
                    <Send className="w-5 h-5 text-[#E07A5F]" />
                    <span className="font-bold text-[#D4A373]">내가 남긴 다정한 답장</span>
                  </div>
                  <p className="text-[#5A5A40] text-lg font-medium leading-loose whitespace-pre-wrap mb-8">
                    {selectedReply.refinedContent}
                  </p>
                </div>

                {/* Feedback & Comment Section */}
                <div className="pt-4 space-y-4">
                  {selectedReply.feedback === 'helpful' && (
                    <div className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-[#E9EDC9] rounded-2xl text-[#5A5A40] font-bold">
                      <Heart className="w-5 h-5 text-[#E07A5F]" /> 
                      작성자에게 위로가 되었다는 답신이 왔어요! (해결 횟수 +1)
                    </div>
                  )}

                  {selectedReply.publisherComment && (
                    <div className="bg-white p-6 rounded-2xl border border-[#D4A373]">
                      <div className="text-xs font-bold text-[#D4A373] mb-3">작성자가 남긴 코멘트</div>
                      <p className="text-[#5A5A40] text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedReply.publisherComment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentRoute === 'my_answer_detail' && !selectedReply && (
            <motion.div key="my_answer_detail_loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={() => setView(backRouteForRoute('my_answer_detail'))} className="mb-2 flex items-center gap-2 text-[#8B8B6B] hover:text-[#5A5A40] transition-colors">
                <ArrowLeft className="w-4 h-4" /> 내가 쓴 답변으로
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold">내가 쓴 답변</h2>
                <p className="text-[#8B8B6B] text-sm">
                  방금 작성한 답변 상세를 불러오는 중입니다.
                  {currentMyAnswerDetailRoute ? ` replyId: ${currentMyAnswerDetailRoute.replyId}` : ''}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E9EDC9] text-sm text-[#8B8B6B]">
                내가 쓴 답변 상세 준비 중입니다.
              </div>
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

function Tabs({ tabs, render }: { tabs: {id: string, label: string}[], render: (active: string) => ReactNode }) {
  const [active, setActive] = useState(tabs[0].id);
  
  return (
    <div>
      <div className="flex border-b border-[#E9EDC9]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors",
              active === tab.id ? "border-[#E07A5F] text-[#E07A5F]" : "border-transparent text-[#8B8B6B] hover:text-[#5A5A40]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {render(active)}
    </div>
  );
}

function CommentForm({
  replyId,
  value,
  onChange,
  onCommentAdded,
  onSubmit,
  onError,
}: {
  replyId: string;
  value: string;
  onChange: (content: string) => void;
  onCommentAdded: (c: string) => void;
  onSubmit?: (content: string) => Promise<void | { status: 'saved' | 'rejected'; reason?: string; userMessage?: string; helpMessage?: string }>;
  onError?: (message: string) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const validation = validateDraftContent(value, 'feedback_comment');
  const trimmedLength = value.trim().length;
  const isTooLong = trimmedLength > CONTENT_MAX_LENGTH;
  const isValid = validation.status === 'valid';

  const submitComment = async () => {
    if (!isValid) return;
    setIsProcessing(true);
    try {
      if (onSubmit) {
        const result = await onSubmit(value);
        if (result && result.status === 'rejected') return;
        onCommentAdded(value.trim());
        return;
      }

      void replyId;
      onError?.("이 답장에는 코멘트를 남길 수 없습니다.");
    } catch (e) {
      console.error(e);
      onError?.("전송 실패");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea 
          value={value} onChange={e => onChange(e.target.value)}
          placeholder="따뜻한 코멘트를 남겨주세요."
          className="w-full h-32 bg-[#FDFCF8] p-4 rounded-xl border border-[#FAEDCD] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm"
        />
        <div className="absolute bottom-3 right-4 text-[10px] font-medium text-[#8B8B6B]">
          {isTooLong ? (
            <span className="text-[#E07A5F]">{trimmedLength}/{CONTENT_MAX_LENGTH}자</span>
          ) : trimmedLength > 0 ? (
            <span className="text-[#A3B18A]">{trimmedLength}자 작성됨</span>
          ) : (
            <span>최대 {CONTENT_MAX_LENGTH}자</span>
          )}
        </div>
      </div>
      
      <button 
        disabled={!isValid || isProcessing}
        onClick={submitComment}
        className="w-full py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] disabled:opacity-50 transition-all text-sm"
      >
        {isProcessing ? '검토 및 전송 중...' : '코멘트 남기기'}
      </button>
    </div>
  );
}

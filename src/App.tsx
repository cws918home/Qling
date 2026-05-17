import {
  useState,
  useEffect,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { onMessage } from 'firebase/messaging';
import { auth, db, firebaseRuntimeConfig, googleProvider, isDevRuntime, messaging } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  XCircle,
} from 'lucide-react';
import { cn } from './lib/utils';
import { usePushRegistration } from './services/pushRegistration';
import {
  CENTRAL_BOTTOM_NAVIGATION_ACTION,
  PRD_APP_TABS,
  routeAfterAuthProfileLoad,
  routeAfterAccountDeletion,
  routeAfterOnboardingComplete,
  routeAfterProfileReadDenied,
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
import { OnboardingContainer } from './screens/onboarding/OnboardingContainer';
import {
  BottomNavigation,
  MobileAppShell,
} from './screens/shared/ui';
import { LoadingShellScreen } from './screens/loadingShell/LoadingShellScreen';
import { LoginScreen } from './screens/loadingShell/LoginScreen';

// --- Types ---
interface UserProfile {
  uid: string;
  nickname?: string;
  normalizedNickname?: string;
  gender: string;
  age?: number;
  interests: string[];
  helpedCount?: number;
  createdAt?: unknown;
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
  const [loginError, setLoginError] = useState<string | null>(null);

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
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (profileReadError) {
            console.error('Profile read failed after auth sign-in:', profileReadError);
            setProfile(null);
            setView(routeAfterProfileReadDenied());
            return;
          }
          
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
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login Error", err);
      setLoginError("구글 로그인에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccountDeleted = () => {
    setUser(null);
    setProfile(null);
    setSelectedWorry(null);
    setSelectedMyWorry(null);
    setSelectedReply(null);
    setLoginError(null);
    setFilterAlert(null);
    setView(routeAfterAccountDeletion());
    window.scrollTo(0, 0);
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

  const [filterAlert, setFilterAlert] = useState<string | null>(null);

  const profileInterests = profile?.interests ?? [];
  const visibleHomeInterestBadgeText = profileInterests.slice(0, 5).join(', ');
  const homeInterestBadgeText = profileInterests.length === 0
    ? '관심 주제'
    : `${visibleHomeInterestBadgeText}${profileInterests.length > 5 ? '...' : ''}`;
  const routeBoundary = routeRenderingBoundaryForRoute(view);
  const currentRoute = routeBoundary.currentRoute;

  if (loading) {
    return (
      <LoadingShellScreen
        reason="session-loading"
        accessibleLabel="로그인 상태 확인 중"
      />
    );
  }

  if (currentRoute === 'login') {
    return (
      <LoginScreen
        sessionState={isProcessing ? 'signing-in' : loginError ? 'failed' : 'signed-out'}
        errorMessage={loginError ?? undefined}
        isProcessing={isProcessing}
        disabled={false}
        onSignIn={handleGoogleLogin}
      />
    );
  }

  return (
    <MobileAppShell
      header={routeBoundary.mountsAuthenticatedShell && (
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
      bottomNavigation={routeBoundary.mountsBottomNavigation && routeBoundary.authenticatedTab && (
        <BottomNavigation
          tabs={PRD_APP_TABS.map(tab => ({ tab, label: tab }))}
          activeTab={routeBoundary.authenticatedTab}
          centralAction={CENTRAL_BOTTOM_NAVIGATION_ACTION}
          onSelectTab={(tab) => setView(tab)}
          onCentralAction={() => setView(routeToWriteWorry())}
        />
      )}
      hasBottomNavigation={routeBoundary.mountsBottomNavigation}
      mainClassName={cn(routeBoundary.routeGroup === 'onboarding flow' ? "pt-12" : "pt-24")}
    >
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
      <AnimatePresence mode="wait">
          
          {/* 1. Onboarding View */}
          {currentRoute === 'onboarding' && (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OnboardingContainer
                user={user}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                onComplete={(completedProfile) => {
                  setProfile(withAuthProfileUid(completedProfile as UserProfile, user?.uid ?? ''));
                  setView(routeAfterOnboardingComplete());
                  window.scrollTo(0, 0);
                }}
                onError={message => setFilterAlert(message)}
              />
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
                onAccountDeleted={handleAccountDeleted}
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
          {(currentRoute === 'answer_check' || currentRoute === 'read_received_reply' || currentRoute === 'received_answer_detail') && selectedReply && (
            <motion.div key="read_received_reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ReplyDetailContainer
                mode="received-reply"
                user={user}
                route={view}
                selectedReply={selectedReply}
                setSelectedReply={setSelectedReply}
                selectedMyWorryContent={selectedMyWorry?.content}
                setView={setView}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

          {(currentRoute === 'answer_check' || currentRoute === 'received_answer_detail') && !selectedReply && (
            <motion.div key="received_answer_detail_empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <ReplyDetailContainer
                mode="received-reply"
                user={user}
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
                user={user}
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
                user={user}
                route={view}
                selectedReply={selectedReply}
                setSelectedReply={setSelectedReply}
                setView={setView}
                setFilterAlert={setFilterAlert}
              />
            </motion.div>
          )}

      </AnimatePresence>
    </MobileAppShell>
  );
}

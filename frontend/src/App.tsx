import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Flower2, X } from "lucide-react";
import {
  catalog as localCatalog,
  defaultRequest,
  fallbackRecommendations,
  manualLook,
  publicFacts,
  restoreLooks,
  lineMotifSchema,
} from "@domain";
import type {
  Catalog,
  CulturalFact,
  Look,
  StylingRequest,
  Tab,
  RecommendationResult,
  LineMotif,
} from "./types";
import {
  api,
  ApiError,
  initialAccount,
  serializeLook,
  type AccountResponse,
  type AccountSession,
} from "./lib/account";
import { Navbar } from "./components/Navbar";
import { ExploreSection } from "./components/ExploreSection";
import { StudioSection } from "./components/StudioSection";
import { RecommendationSection } from "./components/RecommendationSection";
import { LookbookSection } from "./components/LookbookSection";
import {
  AuthDialog,
  type AuthMode,
  type AuthFields,
} from "./components/AuthDialog";
import { AccessBanner } from "./components/AccessBanner";

function readLegacy() {
  try {
    const text = localStorage.getItem("viet_phuc_lookbook_v1");
    if (!text) return { looks: [], message: "" };
    const data = JSON.parse(text);
    return {
      looks: restoreLooks(data?.version === 1 ? data.looks : []),
      message: "",
    };
  } catch {
    return {
      looks: [],
      message:
        "Chưa đọc được lookbook cũ trên trình duyệt. Dữ liệu gốc vẫn được giữ nguyên.",
    };
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [catalog, setCatalog] = useState<Catalog>(localCatalog);
  const [cultureFacts, setCultureFacts] = useState<CulturalFact[]>(publicFacts);
  const [draft, setDraft] = useState<StylingRequest>({ ...defaultRequest });
  const [session, setSession] = useState<AccountSession | null>(null);
  const sessionRef = useRef<AccountSession | null>(null);
  const identityVersion = useRef(0);
  const updateVersion = useRef(0);
  const [savedLooks, setSavedLooks] = useState<Look[]>([]);
  const [legacy] = useState(readLegacy);
  const [accountError, setAccountError] = useState("");
  const [auth, setAuth] = useState<{ mode: AuthMode; reason?: string } | null>(
    null,
  );
  const [looks, setLooks] = useState<Look[]>([]);
  const [note, setNote] = useState("");
  const [isFallback, setIsFallback] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPatternLoading, setIsPatternLoading] = useState(false);
  const [generatedMotif, setGeneratedMotif] = useState<LineMotif | null>(null);
  const patternControllerRef = useRef<AbortController | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mutationBusy = useRef(false);
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const acceptAccount = useCallback((data: AccountResponse) => {
    if (
      sessionRef.current?.actorId !== data.session.actorId ||
      sessionRef.current?.csrfToken !== data.session.csrfToken
    ) {
      identityVersion.current++;
      controllerRef.current?.abort();
      patternControllerRef.current?.abort();
      setIsPatternLoading(false);
      setGeneratedMotif(null);
      setIsLoading(false);
      setLooks([]);
      setNote("");
      setToast(null);
      setAuth(null);
    }
    updateVersion.current++;
    sessionRef.current = data.session;
    setSession(data.session);
    setSavedLooks(restoreLooks(data.looks));
    setAccountError("");
  }, []);
  const refreshAccount = useCallback(async () => {
    const version = updateVersion.current;
    try {
      const data = await api<AccountResponse>("/auth/session");
      if (version === updateVersion.current) acceptAccount(data);
    } catch (error) {
      if (version === updateVersion.current)
        setAccountError(
          error instanceof Error
            ? error.message
            : "Chưa kết nối được tài khoản.",
        );
    }
  }, [acceptAccount]);
  useEffect(() => {
    let active = true;
    initialAccount()
      .then((data) => {
        if (active) acceptAccount(data);
      })
      .catch((error) => {
        if (active) setAccountError(error.message);
      });
    const onFocus = () => {
      if (!mutationBusy.current) void refreshAccount();
    };
    window.addEventListener("focus", onFocus);
    const timer = setInterval(onFocus, 60000);
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("viet-phuc-account");
      channel.onmessage = () => {
        void refreshAccount();
      };
      channelRef.current = channel;
    }
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      channelRef.current?.close();
    };
  }, [acceptAccount, refreshAccount]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/data", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (JSON.stringify(data.catalog) === JSON.stringify(localCatalog))
          setCatalog(data.catalog);
        if (
          Array.isArray(data.cultureFacts) &&
          data.cultureFacts.every((f: CulturalFact) =>
            publicFacts.some((p) => JSON.stringify(p) === JSON.stringify(f)),
          )
        )
          setCultureFacts(data.cultureFacts);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      patternControllerRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  };
  const openAuth = (mode: AuthMode, reason?: string) => {
    if (!sessionRef.current) {
      setToast({
        message: "Vui lòng kết nối máy chủ để đăng nhập hoặc đăng ký.",
      });
      void refreshAccount();
      return;
    }
    setAuth({ mode, reason });
  };
  const handleError = async (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Không thể thực hiện yêu cầu.";
    if (
      error instanceof ApiError &&
      ["AUTH_REQUIRED", "SESSION_CHANGED", "ALREADY_SIGNED_IN"].includes(
        error.code,
      )
    )
      await refreshAccount();
    if (
      error instanceof ApiError &&
      ["AI_LIMIT", "LOOKBOOK_LIMIT"].includes(error.code)
    ) {
      await refreshAccount();
      if (sessionRef.current?.role === "guest")
        setAuth({ mode: "register", reason: message });
    }
    setToast({ message });
  };
  const authenticate = async (
    mode: "login" | "register",
    fields: AuthFields,
  ) => {
    const current = sessionRef.current;
    if (!current)
      throw new ApiError("Vui lòng kết nối lại trước khi đăng nhập.");
    if (mutationBusy.current)
      throw new ApiError("Đang cập nhật tủ đồ. Vui lòng thử lại sau giây lát.");
    try {
      const data = await api<AccountResponse>(
        `/auth/${mode}`,
        { method: "POST", body: JSON.stringify(fields) },
        current,
      );
      acceptAccount(data);
      channelRef.current?.postMessage("changed");
      setToast({
        message:
          mode === "register"
            ? `Chào ${data.session.user?.name}, tài khoản đã sẵn sàng!`
            : `Mừng ${data.session.user?.name} trở lại!`,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        ["AUTH_REQUIRED", "SESSION_CHANGED", "ALREADY_SIGNED_IN"].includes(
          error.code,
        )
      )
        await refreshAccount();
      throw error;
    }
  };
  const logout = async () => {
    const current = sessionRef.current;
    if (!current) return;
    const data = await api<AccountResponse>(
      "/auth/logout",
      { method: "POST", body: "{}" },
      current,
    );
    acceptAccount(data);
    channelRef.current?.postMessage("changed");
    setToast({ message: "Đã đăng xuất. Bạn đang tiếp tục với vai trò khách." });
  };
  const save = async (look: Look, expectedActor?: string): Promise<boolean> => {
    if (mutationBusy.current) return false;
    const current = sessionRef.current;
    if (!current || (expectedActor && current.actorId !== expectedActor)) {
      setToast({
        message: "Vui lòng kết nối lại đúng tài khoản để lưu bản phối.",
      });
      return false;
    }
    mutationBusy.current = true;
    setIsSaving(true);
    const version = identityVersion.current;
    try {
      const data = await api<AccountResponse>(
        "/lookbook",
        { method: "POST", body: JSON.stringify(serializeLook(look)) },
        current,
      );
      if (version !== identityVersion.current) return false;
      acceptAccount(data);
      channelRef.current?.postMessage("changed");
      setToast({
        message: data.added
          ? "Đã thêm bản phối vào tủ đồ."
          : "Bản phối này đã có trong tủ đồ.",
      });
      return true;
    } catch (error) {
      if (version === identityVersion.current) await handleError(error);
      return false;
    } finally {
      mutationBusy.current = false;
      setIsSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (mutationBusy.current) return;
    const current = sessionRef.current,
      deleted = savedLooks.find((l) => l.id === id);
    if (!current || !deleted) return;
    mutationBusy.current = true;
    setIsSaving(true);
    const version = identityVersion.current;
    try {
      const data = await api<AccountResponse>(
        `/lookbook/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        current,
      );
      if (version !== identityVersion.current) return;
      acceptAccount(data);
      channelRef.current?.postMessage("changed");
      setToast({
        message: "Đã xóa bản phối.",
        undo: () => {
          void save(deleted, current.actorId);
        },
      });
    } catch (error) {
      if (version === identityVersion.current) await handleError(error);
    } finally {
      mutationBusy.current = false;
      setIsSaving(false);
    }
  };
  const apply = (look: Look) => {
    setDraft({
      garmentId: look.garmentId,
      eventId: look.eventId,
      styleId: look.styleId,
      gender: look.gender,
      primaryColor: look.palette[0],
      accentColor: look.palette[1],
      selectedAccessories: look.accessoryIds,
      pattern: look.pattern,
    });
    navigate("studio");
    setToast({ message: "Đã áp dụng bản phối. Bạn có thể chỉnh tiếp." });
  };
  const showSample = (
    message = "Gợi ý mẫu — chưa sử dụng Gemini. Không trừ lượt AI.",
  ) => {
    const result = fallbackRecommendations(draft, message);
    setLooks(result.looks);
    setNote(result.note);
    setIsFallback(true);
    navigate("recommend");
  };
  const generate = async () => {
    if (isLoading || isPatternLoading) return;
    const current = sessionRef.current;
    if (!current) {
      showSample(
        "Kết nối hiện chưa sẵn sàng. Đây là gợi ý mẫu, chưa sử dụng Gemini.",
      );
      return;
    }
    if (current.role === "guest" && current.usage.aiRemaining === 0) {
      openAuth(
        "register",
        "Bạn đã dùng hết 3 lượt AI hôm nay. Tạo tài khoản để tiếp tục hoặc quay lại sau 00:00 giờ Việt Nam.",
      );
      void refreshAccount();
      return;
    }
    const version = identityVersion.current;
    setIsLoading(true);
    navigate("recommend");
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 29000);
    try {
      const data = await api<
        RecommendationResult & { session: AccountSession }
      >(
        "/recommend",
        {
          method: "POST",
          body: JSON.stringify(draft),
          signal: controller.signal,
        },
        current,
      );
      if (version !== identityVersion.current) return;
      const valid = restoreLooks(data.looks);
      if (!valid.length || valid.length !== data.looks.length)
        throw new ApiError(
          "Gợi ý chưa hợp lệ. Vui lòng thử lại.",
          "INVALID_RESPONSE",
        );
      setLooks(valid);
      setNote(data.note);
      setIsFallback(data.isFallback);
      sessionRef.current = data.session;
      setSession(data.session);
      updateVersion.current++;
      channelRef.current?.postMessage("changed");
    } catch (error) {
      if (version !== identityVersion.current) return;
      if (error instanceof ApiError && error.code === "NETWORK_ERROR")
        showSample(
          "Kết nối hiện chưa sẵn sàng. Đây là gợi ý mẫu, chưa sử dụng Gemini.",
        );
      else await handleError(error);
    } finally {
      clearTimeout(timer);
      if (version === identityVersion.current) setIsLoading(false);
    }
  };
  const generatePattern = async (prompt: string): Promise<LineMotif> => {
    const current = sessionRef.current;
    if (!current)
      throw new ApiError(
        "Kết nối máy chủ để tạo hoa văn. Mẫu có sẵn vẫn dùng được.",
      );
    if (isLoading || isPatternLoading)
      throw new ApiError("Một yêu cầu AI đang chạy. Vui lòng chờ kết quả.");
    if (current.role === "guest" && current.usage.aiRemaining === 0) {
      openAuth(
        "register",
        "Bạn đã dùng hết 3 lượt AI hôm nay. Tạo tài khoản để vẽ tiếp hoặc dùng hoa văn có sẵn.",
      );
      void refreshAccount();
      throw new ApiError(
        "Bạn đã hết lượt AI hôm nay. Hoa văn có sẵn vẫn dùng tự do.",
        "AI_LIMIT",
      );
    }
    const version = identityVersion.current;
    const controller = new AbortController();
    patternControllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 29000);
    setIsPatternLoading(true);
    try {
      const result = await api<{
        motif: LineMotif;
        source: string;
        session: AccountSession;
      }>(
        "/patterns/generate",
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        },
        current,
      );
      if (version !== identityVersion.current)
        throw new ApiError(
          "Phiên đã thay đổi. Vui lòng tạo lại hoa văn trong tài khoản hiện tại.",
        );
      const motif = lineMotifSchema.safeParse(result.motif);
      if (!motif.success || result.source !== "gemini")
        throw new ApiError("Nét vẽ trả về chưa hợp lệ. Vui lòng thử lại.");
      sessionRef.current = result.session;
      setSession(result.session);
      updateVersion.current++;
      channelRef.current?.postMessage("changed");
      setGeneratedMotif(motif.data);
      return motif.data;
    } catch (error) {
      if (
        version === identityVersion.current &&
        error instanceof ApiError &&
        ["AI_LIMIT", "AUTH_REQUIRED", "SESSION_CHANGED"].includes(error.code)
      )
        await handleError(error);
      throw error;
    } finally {
      clearTimeout(timer);
      if (version === identityVersion.current) setIsPatternLoading(false);
    }
  };
  const remainingLegacy = legacy.looks.filter(
    (l) => !savedLooks.some((s) => s.id === l.id),
  );
  const importLegacy = async () => {
    const actor = sessionRef.current?.actorId;
    if (!actor) return;
    for (const look of remainingLegacy) if (!(await save(look, actor))) break;
  };
  const exportLookbook = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "Việt Phục Remix",
            version: 1,
            exportedAt: new Date().toISOString(),
            looks: savedLooks,
          },
          null,
          2,
        ),
      ],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "viet-phuc-lookbook.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast({ message: "Đã xuất lookbook dưới dạng tệp JSON." });
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đi tới nội dung
      </a>
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigate}
        lookbookCount={savedLooks.length}
        session={session}
        onAuth={openAuth}
      />
      {legacy.message && (
        <div className="storage-notice" role="alert">
          {legacy.message}
        </div>
      )}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="main-content"
      >
        {activeTab !== "explore" && (
          <AccessBanner
            session={session}
            error={accountError}
            onRegister={() => openAuth("register")}
            onReconnect={() => void refreshAccount()}
          />
        )}
        {activeTab === "explore" && (
          <ExploreSection
            garments={catalog.garments}
            cultureFacts={cultureFacts}
            onSelectGarment={(garmentId) => {
              setDraft((prev) => ({ ...prev, garmentId }));
              navigate("studio");
            }}
          />
        )}
        {activeTab === "studio" && (
          <StudioSection
            catalog={catalog}
            draft={draft}
            onChange={setDraft}
            onGenerate={generate}
            onSample={() => showSample()}
            onSave={() => void save(manualLook(draft))}
            onReset={() => setDraft({ ...defaultRequest })}
            isLoading={isLoading}
            isSaving={isSaving}
            isPatternLoading={isPatternLoading || isLoading}
            onGeneratePattern={generatePattern}
            generatedMotif={generatedMotif}
          />
        )}
        {activeTab === "recommend" && (
          <RecommendationSection
            looks={looks}
            isLoading={isLoading}
            note={note}
            isFallback={isFallback}
            onApplyLook={apply}
            onSaveLook={(look) => void save(look)}
            savedLookIds={savedLooks.map((l) => l.id)}
            onRetry={generate}
            onStudio={() => navigate("studio")}
          />
        )}
        {activeTab === "lookbook" && (
          <>
            {remainingLegacy.length > 0 && (
              <div className="legacy-notice">
                <span>
                  Bạn có {remainingLegacy.length} bản phối từ tủ đồ cũ. Bản gốc
                  vẫn được giữ trên trình duyệt.
                </span>
                <button
                  className="text-link"
                  disabled={isSaving || !session}
                  onClick={() => void importLegacy()}
                >
                  Chuyển vào tủ đồ hiện tại
                </button>
              </div>
            )}
            <LookbookSection
              savedLooks={savedLooks}
              onDeleteLook={(id) => void remove(id)}
              onApplyToStudio={apply}
              onStudio={() => navigate("studio")}
              onExport={exportLookbook}
            />
          </>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Flower2 size={20} strokeWidth={1.2} />
          <strong>Phối chất riêng, hiểu nét Việt.</strong>
        </div>
        <p>Việt Phục Remix · Bản demo Audition</p>
        <span>Thiết kế cho những người trẻ yêu văn hóa Việt.</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast.message}</span>
          {toast.undo && <button onClick={toast.undo}>Hoàn tác</button>}
          <button
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {auth && (
        <AuthDialog
          initialMode={auth.mode}
          reason={auth.reason}
          session={session}
          onClose={() => setAuth(null)}
          onSubmit={authenticate}
          onLogout={logout}
        />
      )}
    </div>
  );
}

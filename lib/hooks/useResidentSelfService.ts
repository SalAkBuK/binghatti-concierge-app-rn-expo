import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { invalidateResidentTenancy } from "./useResidentTenancy";
import { residentSelfServiceApi } from "../services/api/resident-self-service";
import type {
  CreateResidentMoveRequestDTO,
  ListResidentContractsParams,
  ListResidentMoveRequestsParams,
  ResidentContract,
  ResidentContractDocument,
  ResidentLatestContract,
  ResidentMoveRequest,
} from "../types";

type RefetchOptions = {
  asRefresh?: boolean;
  showLoading?: boolean;
};

type InternalLoadOptions = {
  showLoading: boolean;
  asRefresh: boolean;
};

type UploadSignedContractInput = {
  contractId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type HookOptions = {
  enabled?: boolean;
  contractListParams?: ListResidentContractsParams;
  onUnauthorized?: () => void | Promise<void>;
};

type UseResidentContractResult = {
  data: ResidentLatestContract;
  contracts: ResidentContract[];
  contractDetailsById: Record<string, ResidentContract>;
  activeLeaseDocuments: ResidentContractDocument[];
  contractsNextCursor: string | null;
  moveInHistory: ResidentMoveRequest[];
  moveOutHistory: ResidentMoveRequest[];
  activeHistoryContractId: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingContractDetail: boolean;
  isLoadingLeaseDocuments: boolean;
  isLoadingHistory: boolean;
  errorMessage: string | null;
  isRequestingMoveIn: boolean;
  isRequestingMoveOut: boolean;
  isUploadingSignedContract: boolean;
  refetch: (options?: RefetchOptions) => Promise<void>;
  refetchContractDetail: (contractId: string) => Promise<ResidentContract | null>;
  refetchActiveLeaseDocuments: () => Promise<void>;
  refetchHistory: (
    contractId: string,
    params?: ListResidentMoveRequestsParams,
  ) => Promise<void>;
  requestMoveIn: (
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ) => Promise<ResidentMoveRequest>;
  requestMoveOut: (
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ) => Promise<ResidentMoveRequest>;
  uploadSignedContract: (
    input: UploadSignedContractInput,
  ) => Promise<ResidentContractDocument>;
};

type ResidentContractSnapshot = {
  data: ResidentLatestContract;
  contracts: ResidentContract[];
  contractsNextCursor: string | null;
  fetchedAt: number;
};

const EMPTY_CONTRACT_STATE: ResidentLatestContract = {
  contract: null,
  canRequestMoveIn: false,
  canRequestMoveOut: false,
  latestMoveInRequestStatus: null,
  latestMoveOutRequestStatus: null,
};

const EMPTY_CONTRACT_SNAPSHOT: ResidentContractSnapshot = {
  data: EMPTY_CONTRACT_STATE,
  contracts: [],
  contractsNextCursor: null,
  fetchedAt: 0,
};

const CACHE_TTL_MS = 30_000;
let cachedContractSnapshot: ResidentContractSnapshot = EMPTY_CONTRACT_SNAPSHOT;
let sharedContractRequestPromise: Promise<ResidentContractSnapshot> | null = null;
const contractListeners = new Set<(snapshot: ResidentContractSnapshot) => void>();

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const getErrorMessage = (
  status: number | undefined,
  fallbackMessage: string,
): string => {
  if (status === 403) {
    return "Access to this information is currently unavailable.";
  }

  return fallbackMessage;
};

const mergeContracts = (
  latest: ResidentLatestContract,
  listContracts: ResidentContract[],
): ResidentContract[] => {
  const contractMap = new Map<string, ResidentContract>();
  for (const contract of listContracts) {
    if (contract.id) {
      contractMap.set(contract.id, contract);
    }
  }

  if (latest.contract?.id && !contractMap.has(latest.contract.id)) {
    contractMap.set(latest.contract.id, latest.contract);
  }

  return Array.from(contractMap.values());
};

const hasFreshContractSnapshot = (): boolean =>
  Boolean(
    cachedContractSnapshot.fetchedAt &&
      Date.now() - cachedContractSnapshot.fetchedAt < CACHE_TTL_MS,
  );

const getResidentContractSnapshot = (): ResidentContractSnapshot => cachedContractSnapshot;

const publishResidentContractSnapshot = (
  snapshot: ResidentContractSnapshot,
): void => {
  cachedContractSnapshot = snapshot;
  contractListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn("[ResidentContract] Failed to notify listener", error);
    }
  });
};

export const useResidentContract = (
  options?: HookOptions,
): UseResidentContractResult => {
  const enabled = options?.enabled ?? true;
  const onUnauthorized = options?.onUnauthorized;
  const contractListParams = options?.contractListParams;
  const initialSnapshot = getResidentContractSnapshot();
  const hasInitialSnapshot = enabled && hasFreshContractSnapshot();

  const [data, setData] = useState<ResidentLatestContract>(
    hasInitialSnapshot ? initialSnapshot.data : EMPTY_CONTRACT_STATE,
  );
  const [contracts, setContracts] = useState<ResidentContract[]>(
    hasInitialSnapshot ? initialSnapshot.contracts : [],
  );
  const [contractDetailsById, setContractDetailsById] = useState<
    Record<string, ResidentContract>
  >({});
  const [activeLeaseDocuments, setActiveLeaseDocuments] = useState<
    ResidentContractDocument[]
  >([]);
  const [contractsNextCursor, setContractsNextCursor] = useState<string | null>(
    hasInitialSnapshot ? initialSnapshot.contractsNextCursor : null,
  );
  const [moveInHistory, setMoveInHistory] = useState<ResidentMoveRequest[]>([]);
  const [moveOutHistory, setMoveOutHistory] = useState<ResidentMoveRequest[]>([]);
  const [activeHistoryContractId, setActiveHistoryContractId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !hasInitialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingContractDetail, setIsLoadingContractDetail] =
    useState<boolean>(false);
  const [isLoadingLeaseDocuments, setIsLoadingLeaseDocuments] =
    useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequestingMoveIn, setIsRequestingMoveIn] = useState<boolean>(false);
  const [isRequestingMoveOut, setIsRequestingMoveOut] = useState<boolean>(false);
  const [isUploadingSignedContract, setIsUploadingSignedContract] =
    useState<boolean>(false);

  const inFlightRef = useRef(false);
  const detailInFlightRef = useRef<Record<string, boolean>>({});
  const historyInFlightRef = useRef(false);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const contractsRef = useRef<ResidentContract[]>([]);
  const contractDetailsByIdRef = useRef<Record<string, ResidentContract>>({});
  const latestContractStateRef = useRef<ResidentLatestContract>(
    EMPTY_CONTRACT_STATE,
  );

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    contractsRef.current = contracts;
  }, [contracts]);

  useEffect(() => {
    contractDetailsByIdRef.current = contractDetailsById;
  }, [contractDetailsById]);

  useEffect(() => {
    latestContractStateRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleSnapshot = (snapshot: ResidentContractSnapshot) => {
      setData(snapshot.data);
      setContracts(snapshot.contracts);
      setContractsNextCursor(snapshot.contractsNextCursor);
      setErrorMessage(null);
      setIsLoading(false);
      setIsRefreshing(false);
      latestContractStateRef.current = snapshot.data;
      contractsRef.current = snapshot.contracts;
    };

    contractListeners.add(handleSnapshot);

    return () => {
      contractListeners.delete(handleSnapshot);
    };
  }, [enabled]);

  const handleUnauthorizedIfNeeded = useCallback(async (error: unknown) => {
    if (getStatusCode(error) === 401) {
      await onUnauthorizedRef.current?.();
      return true;
    }
    return false;
  }, []);

  const load = useCallback(
    async ({ showLoading, asRefresh }: InternalLoadOptions): Promise<void> => {
      if (!enabled) {
        setData(EMPTY_CONTRACT_STATE);
        setContracts([]);
        setContractDetailsById({});
        setActiveLeaseDocuments([]);
        contractsRef.current = [];
        contractDetailsByIdRef.current = {};
        latestContractStateRef.current = EMPTY_CONTRACT_STATE;
        setContractsNextCursor(null);
        setMoveInHistory([]);
        setMoveOutHistory([]);
        setActiveHistoryContractId(null);
        setErrorMessage(null);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingContractDetail(false);
        setIsLoadingLeaseDocuments(false);
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      if (!asRefresh && hasFreshContractSnapshot()) {
        const snapshot = getResidentContractSnapshot();
        setData(snapshot.data);
        setContracts(snapshot.contracts);
        setContractsNextCursor(snapshot.contractsNextCursor);
        latestContractStateRef.current = snapshot.data;
        contractsRef.current = snapshot.contracts;
        setErrorMessage(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      inFlightRef.current = true;
      if (showLoading) setIsLoading(true);
      if (asRefresh) setIsRefreshing(true);

      try {
        if (!sharedContractRequestPromise) {
          sharedContractRequestPromise = (async () => {
            const [latestContract, contractList] = await Promise.all([
              residentSelfServiceApi.getResidentLatestContract(),
              residentSelfServiceApi.listResidentContracts(contractListParams),
            ]);

            return {
              data: latestContract,
              contracts: mergeContracts(latestContract, contractList.items),
              contractsNextCursor: contractList.nextCursor,
              fetchedAt: Date.now(),
            };
          })().finally(() => {
            sharedContractRequestPromise = null;
          });
        }

        const snapshot = await sharedContractRequestPromise;
        publishResidentContractSnapshot(snapshot);
        setErrorMessage(null);
        invalidateResidentTenancy();
      } catch (error) {
        const handledUnauthorized = await handleUnauthorizedIfNeeded(error);
        if (handledUnauthorized) {
          return;
        }

        const statusCode = getStatusCode(error);
        setErrorMessage(
          getErrorMessage(
            statusCode,
            "Unable to load your contract details right now. Please try again.",
          ),
        );
      } finally {
        if (showLoading) setIsLoading(false);
        if (asRefresh) setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [contractListParams, enabled, handleUnauthorizedIfNeeded],
  );

  const refetch = useCallback(
    async (refetchOptions?: RefetchOptions): Promise<void> => {
      const asRefresh = refetchOptions?.asRefresh ?? false;
      const showLoading = refetchOptions?.showLoading ?? !asRefresh;
      await load({ showLoading, asRefresh });
    },
    [load],
  );

  const refetchContractDetail = useCallback(
    async (contractId: string): Promise<ResidentContract | null> => {
      if (!enabled || !contractId) {
        return null;
      }

      if (detailInFlightRef.current[contractId]) {
        return contractDetailsByIdRef.current[contractId] ?? null;
      }

      detailInFlightRef.current[contractId] = true;
      setIsLoadingContractDetail(true);

      try {
        const contract =
          await residentSelfServiceApi.getResidentContractDetail(contractId);
        const resolvedContractId = contract.id || contractId;
        const normalizedContract =
          contract.id === resolvedContractId
            ? contract
            : { ...contract, id: resolvedContractId };

        setContractDetailsById((prev) => {
          const next = {
            ...prev,
            [contractId]: normalizedContract,
            [resolvedContractId]: normalizedContract,
          };
          contractDetailsByIdRef.current = next;
          return next;
        });

        setContracts((prev) => {
          const next = [...prev];
          const index = next.findIndex(
            (item) => item.id === resolvedContractId || item.id === contractId,
          );
          if (index >= 0) {
            next[index] = normalizedContract;
            contractsRef.current = next;
            return next;
          }
          const appended = [...next, normalizedContract];
          contractsRef.current = appended;
          return appended;
        });

        setData((prev) => {
          if (prev.contract?.id !== resolvedContractId) {
            return prev;
          }
          const next = { ...prev, contract: normalizedContract };
          latestContractStateRef.current = next;
          return next;
        });

        return normalizedContract;
      } catch (error) {
        const handledUnauthorized = await handleUnauthorizedIfNeeded(error);
        if (handledUnauthorized) {
          return null;
        }

        if (getStatusCode(error) === 404) {
          const fallbackContract =
            contractDetailsByIdRef.current[contractId] ||
            contractsRef.current.find((item) => item.id === contractId) ||
            (latestContractStateRef.current.contract?.id === contractId
              ? latestContractStateRef.current.contract
              : null);
          if (fallbackContract?.id) {
            setContractDetailsById((prev) => {
              const next = {
                ...prev,
                [contractId]: fallbackContract,
                [fallbackContract.id as string]: fallbackContract,
              };
              contractDetailsByIdRef.current = next;
              return next;
            });
          }
          return fallbackContract ?? null;
        }

        throw error;
      } finally {
        detailInFlightRef.current[contractId] = false;
        setIsLoadingContractDetail(false);
      }
    },
    [enabled, handleUnauthorizedIfNeeded],
  );

  const refetchActiveLeaseDocuments = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setActiveLeaseDocuments([]);
      setIsLoadingLeaseDocuments(false);
      return;
    }

    setIsLoadingLeaseDocuments(true);
    try {
      const documents = await residentSelfServiceApi.listResidentActiveLeaseDocuments();
      setActiveLeaseDocuments(documents);
    } catch (error) {
      const handledUnauthorized = await handleUnauthorizedIfNeeded(error);
      if (!handledUnauthorized) {
        throw error;
      }
    } finally {
      setIsLoadingLeaseDocuments(false);
    }
  }, [enabled, handleUnauthorizedIfNeeded]);

  const refetchHistory = useCallback(
    async (
      contractId: string,
      params?: ListResidentMoveRequestsParams,
    ): Promise<void> => {
      if (!enabled || !contractId) {
        setMoveInHistory([]);
        setMoveOutHistory([]);
        setActiveHistoryContractId(null);
        return;
      }

      if (historyInFlightRef.current) {
        return;
      }

      historyInFlightRef.current = true;
      setIsLoadingHistory(true);
      setActiveHistoryContractId(contractId);

      try {
        const [moveIn, moveOut] = await Promise.all([
          residentSelfServiceApi.listResidentMoveInRequests(contractId, params),
          residentSelfServiceApi.listResidentMoveOutRequests(contractId, params),
        ]);
        setMoveInHistory(moveIn);
        setMoveOutHistory(moveOut);
      } catch (error) {
        const handledUnauthorized = await handleUnauthorizedIfNeeded(error);
        if (!handledUnauthorized) {
          throw error;
        }
      } finally {
        setIsLoadingHistory(false);
        historyInFlightRef.current = false;
      }
    },
    [enabled, handleUnauthorizedIfNeeded],
  );

  useEffect(() => {
    void load({ showLoading: true, asRefresh: false });
  }, [load]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        void load({ asRefresh: false, showLoading: false });
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, load]);

  useEffect(() => {
    void refetchActiveLeaseDocuments().catch(() => {
      // The lease/details screen handles doc failures via explicit alerts on manual actions.
    });
  }, [refetchActiveLeaseDocuments]);

  const requestMoveIn = useCallback(
    async (
      contractId: string,
      payload: CreateResidentMoveRequestDTO,
    ): Promise<ResidentMoveRequest> => {
      setIsRequestingMoveIn(true);
      try {
        const response = await residentSelfServiceApi.createResidentMoveInRequest(
          contractId,
          payload,
        );
        await refetch({ asRefresh: true, showLoading: false });
        if (activeHistoryContractId === contractId) {
          await refetchHistory(contractId);
        }
        return response;
      } catch (error) {
        await handleUnauthorizedIfNeeded(error);
        throw error;
      } finally {
        setIsRequestingMoveIn(false);
      }
    },
    [activeHistoryContractId, handleUnauthorizedIfNeeded, refetch, refetchHistory],
  );

  const requestMoveOut = useCallback(
    async (
      contractId: string,
      payload: CreateResidentMoveRequestDTO,
    ): Promise<ResidentMoveRequest> => {
      setIsRequestingMoveOut(true);
      try {
        const response = await residentSelfServiceApi.createResidentMoveOutRequest(
          contractId,
          payload,
        );
        await refetch({ asRefresh: true, showLoading: false });
        if (activeHistoryContractId === contractId) {
          await refetchHistory(contractId);
        }
        return response;
      } catch (error) {
        await handleUnauthorizedIfNeeded(error);
        throw error;
      } finally {
        setIsRequestingMoveOut(false);
      }
    },
    [activeHistoryContractId, handleUnauthorizedIfNeeded, refetch, refetchHistory],
  );

  const uploadSignedContract = useCallback(
    async (input: UploadSignedContractInput): Promise<ResidentContractDocument> => {
      setIsUploadingSignedContract(true);
      try {
        const uploadUrlPayload =
          await residentSelfServiceApi.createResidentContractDocumentUploadUrl(
            input.contractId,
            {
              type: "SIGNED_TENANCY_CONTRACT",
              fileName: input.fileName,
              mimeType: input.mimeType,
              sizeBytes: input.sizeBytes,
            },
          );

        if (!uploadUrlPayload.uploadUrl || !uploadUrlPayload.storageUrl) {
          throw new Error("Upload URL response is incomplete");
        }

        const localFileResponse = await fetch(input.fileUri);
        if (!localFileResponse.ok) {
          throw new Error("Unable to read selected file");
        }
        const fileBlob = await localFileResponse.blob();

        const putResponse = await fetch(uploadUrlPayload.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": input.mimeType,
          },
          body: fileBlob,
        });
        if (!putResponse.ok) {
          throw new Error(`Upload failed with status ${putResponse.status}`);
        }

        const document = await residentSelfServiceApi.createResidentContractDocument(
          input.contractId,
          {
            type: "SIGNED_TENANCY_CONTRACT",
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            url: uploadUrlPayload.storageUrl,
          },
        );

        await Promise.all([
          refetch({ asRefresh: true, showLoading: false }),
          refetchActiveLeaseDocuments(),
        ]);
        return document;
      } catch (error) {
        await handleUnauthorizedIfNeeded(error);
        throw error;
      } finally {
        setIsUploadingSignedContract(false);
      }
    },
    [handleUnauthorizedIfNeeded, refetch, refetchActiveLeaseDocuments],
  );

  return {
    data,
    contracts,
    contractDetailsById,
    activeLeaseDocuments,
    contractsNextCursor,
    moveInHistory,
    moveOutHistory,
    activeHistoryContractId,
    isLoading,
    isRefreshing,
    isLoadingContractDetail,
    isLoadingLeaseDocuments,
    isLoadingHistory,
    errorMessage,
    isRequestingMoveIn,
    isRequestingMoveOut,
    isUploadingSignedContract,
    refetch,
    refetchContractDetail,
    refetchActiveLeaseDocuments,
    refetchHistory,
    requestMoveIn,
    requestMoveOut,
    uploadSignedContract,
  };
};

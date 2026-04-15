import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  ApiResponse,
  CreateResidentContractDocumentDTO,
  CreateResidentContractDocumentUploadUrlDTO,
  CreateResidentMoveRequestDTO,
  ListResidentContractsParams,
  ListResidentMoveRequestsParams,
  ResidentContract,
  ResidentContractDocument,
  ResidentContractDocumentUploadUrlResponse,
  ResidentContractsListResponse,
  ResidentAvatarUploadResponse,
  ResidentIdentity,
  ResidentParkingAllocation,
  ResidentContractDisplayStatus,
  ResidentContractStatus,
  ResidentExtendedProfile,
  ResidentLatestContract,
  ResidentMoveRequest,
  ResidentMoveRequestStatus,
  UpdateResidentExtendedProfileDTO,
} from "../../types";
import type { ResidentSelfServiceApi } from "./types";

type UnknownRecord = Record<string, unknown>;

const logResidentContract = (label: string, payload: unknown): void => {
  if (!__DEV__) return;
  console.log(`[ResidentContract] ${label}`, payload);
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readProp = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const firstDefined = (...values: unknown[]): unknown =>
  values.find((item) => item !== undefined && item !== null);

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

const unwrapResponseData = <T>(response: ApiResponse<T> | T): T => {
  if (isRecord(response)) {
    if ("data" in response && response.data !== undefined) {
      return response.data as T;
    }
    if ("result" in response && response.result !== undefined) {
      return response.result as T;
    }
  }

  return response as T;
};

const getRecordKeys = (value: unknown): string[] | null =>
  isRecord(value) ? Object.keys(value) : null;

const summarizeResidentIdentity = (identity: ResidentIdentity) => ({
  buildingId: identity.occupancy?.buildingId ?? null,
  buildingName: identity.occupancy?.buildingName ?? null,
  hasOccupancy: Boolean(identity.occupancy),
  hasUser: Boolean(identity.user),
  occupancyId: identity.occupancy?.id ?? null,
  unitId: identity.occupancy?.unitId ?? null,
  unitLabel: identity.occupancy?.unitLabel ?? null,
  userId: identity.user?.id ?? null,
});

const normalizeContractStatus = (value: unknown): ResidentContractStatus | null => {
  const normalized = toStringOrNull(value)?.toUpperCase();
  switch (normalized) {
    case "DRAFT":
      return "DRAFT";
    case "ACTIVE":
      return "ACTIVE";
    case "ENDED":
      return "ENDED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return null;
  }
};

const normalizeContractDisplayStatus = (
  value: unknown,
): ResidentContractDisplayStatus | null => {
  const normalized = toStringOrNull(value)?.toUpperCase();
  switch (normalized) {
    case "DRAFT":
      return "DRAFT";
    case "ACTIVE":
      return "ACTIVE";
    case "CANCELLED":
      return "CANCELLED";
    case "MOVED_OUT":
      return "MOVED_OUT";
    default:
      return null;
  }
};

const normalizeMoveRequestStatus = (
  value: unknown,
): ResidentMoveRequestStatus => {
  const normalized = toStringOrNull(value)?.toUpperCase();
  switch (normalized) {
    case "PENDING":
      return "PENDING";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "CANCELLED":
      return "CANCELLED";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return null;
  }
};

const extractContractReference = (
  payload: UnknownRecord,
  fallbackId?: string | null,
): string | null => {
  const nestedContract = readProp(payload, "contract");
  return toStringOrNull(
    firstDefined(
      payload.contractId,
      payload.contract_id,
      payload.contractUuid,
      payload.contractUUID,
      payload.id,
      payload.uuid,
      payload.leaseId,
      payload.lease_id,
      isRecord(nestedContract) ? nestedContract.contractId : undefined,
      isRecord(nestedContract) ? nestedContract.id : undefined,
      isRecord(nestedContract) ? nestedContract.uuid : undefined,
      fallbackId,
    ),
  );
};

const looksLikeContractRecord = (payload: UnknownRecord): boolean => {
  const nestedContract = readProp(payload, "contract");
  const target = isRecord(nestedContract) ? nestedContract : payload;
  return Boolean(
    extractContractReference(target) ||
      toStringOrNull(
        firstDefined(
          target.contractNumber,
          target.ijariId,
          target.number,
          target.code,
          target.status,
        ),
      ),
  );
};

const mapContract = (payload: UnknownRecord): ResidentContract => {
  const nestedContract = readProp(payload, "contract");
  const source = isRecord(nestedContract) ? nestedContract : payload;
  const unit = readProp(payload, "unit");
  const sourceUnit = readProp(source, "unit");
  const sourceResident = readProp(source, "resident");
  const occupancy = readProp(payload, "occupancy");
  const building = readProp(payload, "building");
  const property = readProp(payload, "property");
  const additionalTermsValue = firstDefined(
    readProp(source, "additionalTerms"),
    readProp(payload, "additionalTerms"),
  );
  const additionalTerms = Array.isArray(additionalTermsValue)
    ? additionalTermsValue
        .map((item) => toStringOrNull(item))
        .filter((item): item is string => Boolean(item))
    : [];

  return {
    id: extractContractReference(source, extractContractReference(payload)),
    status: normalizeContractStatus(firstDefined(source.status, payload.status)),
    displayStatus: normalizeContractDisplayStatus(
      firstDefined(source.displayStatus, payload.displayStatus),
    ),
    contractNumber: toStringOrNull(
      firstDefined(
        source.contractNumber,
        source.number,
        source.code,
        source.ijariId,
        source.propertyNumber,
        payload.contractNumber,
        payload.number,
        payload.code,
        payload.ijariId,
        payload.propertyNumber,
      ),
    ),
    unitLabel: toStringOrNull(
      firstDefined(
        source.unitLabel,
        source.unitNumber,
        source.apartment,
        payload.unitLabel,
        payload.unitNumber,
        payload.apartment,
        readProp(unit, "label"),
        readProp(unit, "unitNumber"),
        readProp(unit, "number"),
        readProp(occupancy, "unitNumber"),
      ),
    ),
    buildingName: toStringOrNull(
      firstDefined(
        source.buildingName,
        source.buildingNameSnapshot,
        payload.buildingName,
        payload.buildingNameSnapshot,
        readProp(building, "name"),
        readProp(property, "name"),
      ),
    ),
    startDate: toStringOrNull(
      firstDefined(
        source.startDate,
        source.contractStartDate,
        source.commenceDate,
        source.contractPeriodFrom,
        source.leaseStartDate,
        payload.startDate,
        payload.contractStartDate,
        payload.commenceDate,
        payload.contractPeriodFrom,
        payload.leaseStartDate,
      ),
    ),
    endDate: toStringOrNull(
      firstDefined(
        source.endDate,
        source.contractEndDate,
        source.expiryDate,
        source.contractPeriodTo,
        source.leaseEndDate,
        payload.endDate,
        payload.contractEndDate,
        payload.expiryDate,
        payload.contractPeriodTo,
        payload.leaseEndDate,
      ),
    ),
    actualMoveOutDate: toStringOrNull(
      firstDefined(
        source.actualMoveOutDate,
        payload.actualMoveOutDate,
        source.actual_move_out_date,
        payload.actual_move_out_date,
      ),
    ),
    buildingId: toStringOrNull(firstDefined(source.buildingId, payload.buildingId)),
    orgId: toStringOrNull(firstDefined(source.orgId, payload.orgId)),
    occupancyId: toStringOrNull(
      firstDefined(source.occupancyId, payload.occupancyId),
    ),
    residentUserId: toStringOrNull(
      firstDefined(source.residentUserId, payload.residentUserId),
    ),
    unitId: toStringOrNull(firstDefined(source.unitId, payload.unitId)),
    contractDate: toStringOrNull(
      firstDefined(source.contractDate, payload.contractDate),
    ),
    annualRent: toStringOrNull(firstDefined(source.annualRent, payload.annualRent)),
    contractValue: toStringOrNull(
      firstDefined(source.contractValue, payload.contractValue),
    ),
    securityDepositAmount: toStringOrNull(
      firstDefined(source.securityDepositAmount, payload.securityDepositAmount),
    ),
    paymentFrequency: toStringOrNull(
      firstDefined(source.paymentFrequency, payload.paymentFrequency),
    ),
    paymentModeText: toStringOrNull(
      firstDefined(source.paymentModeText, payload.paymentModeText),
    ),
    numberOfCheques: toNumberOrNull(
      firstDefined(source.numberOfCheques, payload.numberOfCheques),
    ),
    locationCommunity: toStringOrNull(
      firstDefined(source.locationCommunity, payload.locationCommunity),
    ),
    plotNo: toStringOrNull(firstDefined(source.plotNo, payload.plotNo)),
    premisesNoDewa: toStringOrNull(
      firstDefined(source.premisesNoDewa, payload.premisesNoDewa),
    ),
    propertyNumber: toStringOrNull(
      firstDefined(source.propertyNumber, payload.propertyNumber),
    ),
    propertySizeSqm: toStringOrNull(
      firstDefined(source.propertySizeSqm, payload.propertySizeSqm),
    ),
    propertyTypeLabel: toStringOrNull(
      firstDefined(source.propertyTypeLabel, payload.propertyTypeLabel),
    ),
    propertyUsage: toStringOrNull(
      firstDefined(source.propertyUsage, payload.propertyUsage),
    ),
    additionalTerms,
    landlordNameSnapshot: toStringOrNull(
      firstDefined(source.landlordNameSnapshot, payload.landlordNameSnapshot),
    ),
    landlordEmailSnapshot: toStringOrNull(
      firstDefined(source.landlordEmailSnapshot, payload.landlordEmailSnapshot),
    ),
    landlordPhoneSnapshot: toStringOrNull(
      firstDefined(source.landlordPhoneSnapshot, payload.landlordPhoneSnapshot),
    ),
    ownerNameSnapshot: toStringOrNull(
      firstDefined(source.ownerNameSnapshot, payload.ownerNameSnapshot),
    ),
    tenantNameSnapshot: toStringOrNull(
      firstDefined(source.tenantNameSnapshot, payload.tenantNameSnapshot),
    ),
    tenantEmailSnapshot: toStringOrNull(
      firstDefined(source.tenantEmailSnapshot, payload.tenantEmailSnapshot),
    ),
    tenantPhoneSnapshot: toStringOrNull(
      firstDefined(source.tenantPhoneSnapshot, payload.tenantPhoneSnapshot),
    ),
    resident: {
      id: toStringOrNull(
        firstDefined(
          isRecord(sourceResident) ? sourceResident.id : undefined,
          readProp(payload, "residentUserId"),
        ),
      ),
      name: toStringOrNull(
        firstDefined(
          isRecord(sourceResident) ? sourceResident.name : undefined,
          readProp(payload, "tenantNameSnapshot"),
        ),
      ),
      email: toStringOrNull(
        firstDefined(
          isRecord(sourceResident) ? sourceResident.email : undefined,
          readProp(payload, "tenantEmailSnapshot"),
        ),
      ),
      phone: toStringOrNull(
        firstDefined(
          isRecord(sourceResident) ? sourceResident.phone : undefined,
          readProp(payload, "tenantPhoneSnapshot"),
        ),
      ),
    },
    unit: {
      id: toStringOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.id : undefined,
          readProp(unit, "id"),
          payload.unitId,
        ),
      ),
      label: toStringOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.label : undefined,
          readProp(unit, "label"),
          payload.unitLabel,
          payload.unitNumber,
        ),
      ),
      floor: toNumberOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.floor : undefined,
          readProp(unit, "floor"),
        ),
      ),
      bedrooms: toNumberOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.bedrooms : undefined,
          readProp(unit, "bedrooms"),
        ),
      ),
      bathrooms: toNumberOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.bathrooms : undefined,
          readProp(unit, "bathrooms"),
        ),
      ),
      unitSize: toStringOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.unitSize : undefined,
          readProp(unit, "unitSize"),
        ),
      ),
      unitSizeUnit: toStringOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.unitSizeUnit : undefined,
          readProp(unit, "unitSizeUnit"),
        ),
      ),
      furnishedStatus: toStringOrNull(
        firstDefined(
          isRecord(sourceUnit) ? sourceUnit.furnishedStatus : undefined,
          readProp(unit, "furnishedStatus"),
        ),
      ),
    },
    createdAt: toStringOrNull(firstDefined(source.createdAt, payload.createdAt)),
    updatedAt: toStringOrNull(firstDefined(source.updatedAt, payload.updatedAt)),
  };
};

const mapResidentIdentity = (payload: unknown): ResidentIdentity => {
  const record = isRecord(payload) ? payload : {};
  const userRecord = isRecord(readProp(record, "user"))
    ? (readProp(record, "user") as UnknownRecord)
    : {};
  const occupancyRecord = isRecord(readProp(record, "occupancy"))
    ? (readProp(record, "occupancy") as UnknownRecord)
    : null;
  const occupancyBuilding = occupancyRecord
    ? readProp(occupancyRecord, "building")
    : null;
  const occupancyUnit = occupancyRecord ? readProp(occupancyRecord, "unit") : null;

  return {
    user:
      Object.keys(userRecord).length > 0
        ? {
            id: toStringOrNull(userRecord.id),
            email: toStringOrNull(userRecord.email),
            name: toStringOrNull(firstDefined(userRecord.name, userRecord.fullName)),
            phone: toStringOrNull(
              firstDefined(userRecord.phone, userRecord.phoneNumber),
            ),
            avatarUrl: toStringOrNull(
              firstDefined(userRecord.avatarUrl, userRecord.avatar),
            ),
          }
        : null,
    occupancy: occupancyRecord
      ? {
          id: toStringOrNull(firstDefined(occupancyRecord.id, occupancyRecord.occupancyId)),
          buildingId: toStringOrNull(
            firstDefined(
              occupancyRecord.buildingId,
              occupancyRecord.building_id,
              isRecord(occupancyBuilding) ? occupancyBuilding.id : undefined,
              isRecord(occupancyBuilding) ? occupancyBuilding.buildingId : undefined,
            ),
          ),
          buildingName: toStringOrNull(
            firstDefined(
              occupancyRecord.buildingName,
              occupancyRecord.building_name,
              isRecord(occupancyBuilding) ? occupancyBuilding.name : undefined,
              isRecord(occupancyBuilding)
                ? occupancyBuilding.buildingName
                : undefined,
            ),
          ),
          unitId: toStringOrNull(
            firstDefined(
              occupancyRecord.unitId,
              occupancyRecord.unit_id,
              isRecord(occupancyUnit) ? occupancyUnit.id : undefined,
            ),
          ),
          unitLabel: toStringOrNull(
            firstDefined(
              occupancyRecord.unitLabel,
              occupancyRecord.unitNumber,
              occupancyRecord.apartment,
              isRecord(occupancyUnit) ? occupancyUnit.label : undefined,
              isRecord(occupancyUnit) ? occupancyUnit.unitNumber : undefined,
              isRecord(occupancyUnit) ? occupancyUnit.number : undefined,
              isRecord(occupancyUnit) ? occupancyUnit.name : undefined,
            ),
          ),
          floorNumber: toStringOrNull(
            firstDefined(
              occupancyRecord.floorNumber,
              occupancyRecord.floor,
              isRecord(occupancyUnit) ? occupancyUnit.floor : undefined,
              isRecord(occupancyUnit) ? occupancyUnit.floorNumber : undefined,
            ),
          ),
        }
      : null,
  };
};

const mapResidentParkingAllocation = (
  payload: unknown,
): ResidentParkingAllocation | null => {
  if (!payload) {
    return null;
  }

  const record = isRecord(payload) ? payload : null;
  if (!record) {
    return null;
  }

  const slotRecord = isRecord(readProp(record, "slot"))
    ? (readProp(record, "slot") as UnknownRecord)
    : null;

  return {
    id: toStringOrNull(firstDefined(record.id, record.allocationId)),
    slotId: toStringOrNull(
      firstDefined(
        record.slotId,
        record.slot_id,
        slotRecord?.id,
        slotRecord?.slotId,
      ),
    ),
    code: toStringOrNull(
      firstDefined(
        record.code,
        record.slotCode,
        record.slot_code,
        slotRecord?.code,
        slotRecord?.slotCode,
        slotRecord?.slot_code,
      ),
    ),
    level: toStringOrNull(
      firstDefined(
        record.level,
        record.slotLevel,
        record.slot_level,
        slotRecord?.level,
        slotRecord?.slotLevel,
        slotRecord?.slot_level,
      ),
    ),
    type: toStringOrNull(
      firstDefined(
        record.type,
        record.slotType,
        record.slot_type,
        slotRecord?.type,
        slotRecord?.slotType,
        slotRecord?.slot_type,
      ),
    ),
    createdAt: toStringOrNull(firstDefined(record.createdAt, record.created_at)),
    updatedAt: toStringOrNull(firstDefined(record.updatedAt, record.updated_at)),
  };
};

const mapResidentAvatarUploadResponse = (
  payload: unknown,
): ResidentAvatarUploadResponse => {
  const record = isRecord(payload) ? payload : {};
  const avatarUrl = toStringOrNull(
    firstDefined(record.avatarUrl, readProp(record, "url")),
  );

  if (!avatarUrl) {
    throw new Error("Resident avatar upload did not return an avatar URL");
  }

  return { avatarUrl };
};

const EMPTY_CONTRACT_STATE: ResidentLatestContract = {
  contract: null,
  canRequestMoveIn: false,
  canRequestMoveOut: false,
  latestMoveInRequestStatus: null,
  latestMoveOutRequestStatus: null,
};

const mapLatestContract = (payload: unknown): ResidentLatestContract => {
  if (!isRecord(payload)) {
    return EMPTY_CONTRACT_STATE;
  }

  const contractPayload = firstDefined(
    readProp(payload, "contract"),
    readProp(payload, "latestContract"),
    readProp(payload, "latest"),
  );
  const fallbackContractPayload = isRecord(contractPayload)
    ? contractPayload
    : looksLikeContractRecord(payload)
      ? payload
      : null;

  return {
    contract:
      fallbackContractPayload && isRecord(fallbackContractPayload)
        ? mapContract(fallbackContractPayload)
        : null,
    canRequestMoveIn: toBoolean(readProp(payload, "canRequestMoveIn")),
    canRequestMoveOut: toBoolean(readProp(payload, "canRequestMoveOut")),
    latestMoveInRequestStatus: normalizeMoveRequestStatus(
      readProp(payload, "latestMoveInRequestStatus"),
    ),
    latestMoveOutRequestStatus: normalizeMoveRequestStatus(
      readProp(payload, "latestMoveOutRequestStatus"),
    ),
  };
};

const mapContractsList = (payload: unknown): ResidentContractsListResponse => {
  if (Array.isArray(payload)) {
    return {
      items: payload.filter(isRecord).map(mapContract),
      nextCursor: null,
    };
  }

  if (!isRecord(payload)) {
    return { items: [], nextCursor: null };
  }

  const itemsPayload = firstDefined(
    payload.items,
    payload.contracts,
    payload.rows,
    payload.results,
    payload.data,
  );
  const items = Array.isArray(itemsPayload)
    ? itemsPayload.filter(isRecord).map(mapContract)
    : looksLikeContractRecord(payload)
      ? [mapContract(payload)]
      : [];

  return {
    items,
    nextCursor: toStringOrNull(
      firstDefined(payload.nextCursor, payload.next_cursor),
    ),
  };
};

const mapMoveRequest = (
  payload: unknown,
  contractIdFallback?: string,
): ResidentMoveRequest => {
  const record = isRecord(payload) ? payload : {};
  const normalizedFallback = toStringOrNull(contractIdFallback);
  const leaseId = toStringOrNull(firstDefined(record.leaseId, record.lease_id));

  return {
    id: toStringOrNull(firstDefined(record.id, record.requestId, record.request_id)),
    contractId: toStringOrNull(
      firstDefined(
        record.contractId,
        record.contract_id,
        record.leaseId,
        record.lease_id,
        normalizedFallback,
      ),
    ),
    leaseId,
    status: normalizeMoveRequestStatus(record.status),
    requestedMoveAt: toStringOrNull(
      firstDefined(record.requestedMoveAt, record.requested_move_at),
    ),
    notes: toStringOrNull(record.notes),
    createdAt: toStringOrNull(firstDefined(record.createdAt, record.created_at)),
    updatedAt: toStringOrNull(firstDefined(record.updatedAt, record.updated_at)),
    reviewedAt: toStringOrNull(firstDefined(record.reviewedAt, record.reviewed_at)),
    rejectionReason: toStringOrNull(
      firstDefined(record.rejectionReason, record.rejection_reason),
    ),
  };
};

const mapMoveRequestList = (
  payload: unknown,
  contractIdFallback?: string,
): ResidentMoveRequest[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapMoveRequest(item, contractIdFallback));
  }

  if (!isRecord(payload)) {
    return [];
  }

  const itemsPayload = firstDefined(payload.items, payload.requests, payload.data);
  if (!Array.isArray(itemsPayload)) {
    return [];
  }

  return itemsPayload.map((item) => mapMoveRequest(item, contractIdFallback));
};

const mapUploadUrlResponse = (
  payload: unknown,
): ResidentContractDocumentUploadUrlResponse => {
  if (!isRecord(payload)) {
    return {
      uploadUrl: null,
      storageUrl: null,
      objectKey: null,
      type: null,
      expiresInSeconds: null,
    };
  }

  return {
    uploadUrl: toStringOrNull(payload.uploadUrl),
    storageUrl: toStringOrNull(payload.storageUrl),
    objectKey: toStringOrNull(payload.objectKey),
    type: toStringOrNull(payload.type),
    expiresInSeconds: toNumberOrNull(payload.expiresInSeconds),
  };
};

const mapContractDocument = (
  payload: unknown,
  contractIdFallback?: string,
): ResidentContractDocument => {
  const record = isRecord(payload) ? payload : {};
  const contractId = extractContractReference(record, contractIdFallback ?? null);

  return {
    id: toStringOrNull(record.id),
    contractId,
    leaseId: toStringOrNull(firstDefined(record.leaseId, record.lease_id)),
    type: toStringOrNull(record.type),
    fileName: toStringOrNull(record.fileName),
    mimeType: toStringOrNull(record.mimeType),
    sizeBytes: toNumberOrNull(record.sizeBytes),
    url: toStringOrNull(record.url),
    createdAt: toStringOrNull(record.createdAt),
  };
};

const looksLikeContractDocumentRecord = (payload: UnknownRecord): boolean =>
  Boolean(
    toStringOrNull(
      firstDefined(
        payload.id,
        payload.url,
        payload.fileName,
        payload.mimeType,
        payload.type,
      ),
    ),
  );

const mapContractDocumentList = (
  payload: unknown,
  contractIdFallback?: string,
): ResidentContractDocument[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => mapContractDocument(item, contractIdFallback));
  }

  if (!isRecord(payload)) {
    return [];
  }

  const itemsPayload = firstDefined(payload.items, payload.documents, payload.data);
  if (Array.isArray(itemsPayload)) {
    return itemsPayload.map((item) => mapContractDocument(item, contractIdFallback));
  }

  if (looksLikeContractDocumentRecord(payload)) {
    return [mapContractDocument(payload, contractIdFallback)];
  }

  return [];
};

const mapResidentExtendedProfile = (payload: unknown): ResidentExtendedProfile => {
  const record = isRecord(payload) ? payload : {};
  const userRecord = isRecord(readProp(record, "user"))
    ? (readProp(record, "user") as UnknownRecord)
    : {};

  return {
    id: toStringOrNull(record.id) ?? "",
    orgId: toStringOrNull(record.orgId) ?? "",
    userId: toStringOrNull(record.userId) ?? "",
    user: {
      id: toStringOrNull(userRecord.id) ?? "",
      email: toStringOrNull(userRecord.email) ?? "",
      name: toStringOrNull(userRecord.name),
      phone: toStringOrNull(userRecord.phone),
      avatarUrl: toStringOrNull(firstDefined(userRecord.avatarUrl, userRecord.avatar)),
    },
    emiratesIdNumber: toStringOrNull(record.emiratesIdNumber),
    passportNumber: toStringOrNull(record.passportNumber),
    nationality: toStringOrNull(record.nationality),
    dateOfBirth: toStringOrNull(record.dateOfBirth),
    currentAddress: toStringOrNull(record.currentAddress),
    emergencyContactName: toStringOrNull(record.emergencyContactName),
    emergencyContactPhone: toStringOrNull(record.emergencyContactPhone),
    preferredBuildingId: toStringOrNull(record.preferredBuildingId),
    createdAt: toStringOrNull(record.createdAt),
    updatedAt: toStringOrNull(record.updatedAt),
  };
};

export class ResidentSelfServiceApiService
  extends BaseApiService
  implements ResidentSelfServiceApi
{
  async getResidentIdentity(): Promise<ResidentIdentity> {
    try {
      logResidentContract("GET /resident/me request", {
        endpoint: API_ENDPOINTS.resident.me,
      });
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.me,
      );
      const payload = unwrapResponseData(response);
      logResidentContract("GET /resident/me payload keys", getRecordKeys(payload));
      const normalized = mapResidentIdentity(payload);
      logResidentContract(
        "GET /resident/me summary",
        summarizeResidentIdentity(normalized),
      );
      logResidentContract("GET /resident/me normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("GET /resident/me error", error);
      throw error;
    }
  }

  async getResidentActiveParkingAllocation(): Promise<ResidentParkingAllocation | null> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.parkingActiveAllocation,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapResidentParkingAllocation(payload);
      logResidentContract(
        "GET /resident/parking/active-allocation normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentContract("GET /resident/parking/active-allocation error", error);
      throw error;
    }
  }

  async uploadResidentAvatar(file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<ResidentAvatarUploadResponse> {
    try {
      const formData = new FormData();
      formData.append("file", file as any);

      const response = await this.post<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.meAvatar,
        formData,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapResidentAvatarUploadResponse(payload);
      logResidentContract("POST /resident/me/avatar normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("POST /resident/me/avatar error", error);
      throw error;
    }
  }

  async getResidentLatestContract(): Promise<ResidentLatestContract> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractLatest,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapLatestContract(payload);
      logResidentContract("GET /resident/contracts/latest normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("GET /resident/contracts/latest error", error);
      throw error;
    }
  }

  async getResidentContractDetail(contractId: string): Promise<ResidentContract> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractDetail(contractId),
      );
      const payload = unwrapResponseData(response);
      const contractPayload = firstDefined(
        readProp(payload, "contract"),
        readProp(payload, "data"),
        payload,
      );

      const normalized = isRecord(contractPayload)
        ? mapContract(contractPayload)
        : {
            id: contractId,
            status: null,
            contractNumber: null,
            unitLabel: null,
            buildingName: null,
            startDate: null,
            endDate: null,
            createdAt: null,
            updatedAt: null,
          };

      const resolved = normalized.id
        ? normalized
        : { ...normalized, id: contractId };

      logResidentContract("GET /resident/contracts/:id normalized", resolved);
      return resolved;
    } catch (error) {
      logResidentContract("GET /resident/contracts/:id error", error);
      throw error;
    }
  }

  async listResidentContracts(
    params?: ListResidentContractsParams,
  ): Promise<ResidentContractsListResponse> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contracts,
        params,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapContractsList(payload);
      logResidentContract("GET /resident/contracts normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("GET /resident/contracts error", error);
      throw error;
    }
  }

  async listResidentActiveLeaseDocuments(): Promise<ResidentContractDocument[]> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.activeLeaseDocuments,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapContractDocumentList(payload);
      logResidentContract(
        "GET /resident/lease/active/documents normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentContract("GET /resident/lease/active/documents error", error);
      throw error;
    }
  }

  async createResidentMoveInRequest(
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ): Promise<ResidentMoveRequest> {
    try {
      const response = await this.post<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractMoveInRequests(contractId),
        payload,
      );
      const unwrappedPayload = unwrapResponseData(response);
      const normalized = mapMoveRequest(unwrappedPayload, contractId);
      logResidentContract("POST move-in normalized", normalized);

      return normalized;
    } catch (error) {
      logResidentContract("POST move-in error", error);
      throw error;
    }
  }

  async createResidentMoveOutRequest(
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ): Promise<ResidentMoveRequest> {
    try {
      const response = await this.post<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractMoveOutRequests(contractId),
        payload,
      );
      const unwrappedPayload = unwrapResponseData(response);
      const normalized = mapMoveRequest(unwrappedPayload, contractId);
      logResidentContract("POST move-out normalized", normalized);

      return normalized;
    } catch (error) {
      logResidentContract("POST move-out error", error);
      throw error;
    }
  }

  async listResidentMoveInRequests(
    contractId: string,
    params?: ListResidentMoveRequestsParams,
  ): Promise<ResidentMoveRequest[]> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractMoveInRequests(contractId),
        params,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapMoveRequestList(payload, contractId);
      logResidentContract("GET move-in history normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("GET move-in history error", error);
      throw error;
    }
  }

  async listResidentMoveOutRequests(
    contractId: string,
    params?: ListResidentMoveRequestsParams,
  ): Promise<ResidentMoveRequest[]> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractMoveOutRequests(contractId),
        params,
      );
      const payload = unwrapResponseData(response);
      const normalized = mapMoveRequestList(payload, contractId);
      logResidentContract("GET move-out history normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("GET move-out history error", error);
      throw error;
    }
  }

  async createResidentContractDocumentUploadUrl(
    contractId: string,
    payload: CreateResidentContractDocumentUploadUrlDTO,
  ): Promise<ResidentContractDocumentUploadUrlResponse> {
    try {
      const response = await this.post<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractDocumentsUploadUrl(contractId),
        payload,
      );
      const unwrappedPayload = unwrapResponseData(response);
      const normalized = mapUploadUrlResponse(unwrappedPayload);
      logResidentContract(
        "POST contract document upload-url normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentContract("POST contract document upload-url error", error);
      throw error;
    }
  }

  async createResidentContractDocument(
    contractId: string,
    payload: CreateResidentContractDocumentDTO,
  ): Promise<ResidentContractDocument> {
    try {
      const response = await this.post<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.contractDocuments(contractId),
        payload,
      );
      const unwrappedPayload = unwrapResponseData(response);
      const normalized = mapContractDocument(unwrappedPayload, contractId);
      logResidentContract("POST contract document normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("POST contract document error", error);
      throw error;
    }
  }

  async updateResidentProfile(
    payload: UpdateResidentExtendedProfileDTO,
  ): Promise<ResidentExtendedProfile> {
    try {
      const response = await this.put<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.meProfile,
        payload,
      );
      const unwrappedPayload = unwrapResponseData(response);
      const normalized = mapResidentExtendedProfile(unwrappedPayload);
      logResidentContract("PUT /resident/me/profile normalized", normalized);
      return normalized;
    } catch (error) {
      logResidentContract("PUT /resident/me/profile error", error);
      throw error;
    }
  }
}

export const residentSelfServiceApi = new ResidentSelfServiceApiService();

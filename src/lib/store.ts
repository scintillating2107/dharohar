import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type {
  User,
  Document,
  LandRecord,
  VerificationTask,
  AuditEvent,
  Parcel,
  ProcessingStep,
} from "@/types";
import { PROCESSING_STEPS } from "./config";
import { generateId } from "./utils";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "dharohar-store.json");

export function createInitialSteps(): ProcessingStep[] {
  return PROCESSING_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    status: "pending" as const,
  }));
}

interface PersistedStore {
  users: User[];
  passwordHashes: Record<string, string>;
  documents: Document[];
  records: LandRecord[];
  verificationTasks: VerificationTask[];
  auditEvents: AuditEvent[];
  parcels: Parcel[];
}

declare global {
  // eslint-disable-next-line no-var
  var __dharoharStore: PersistedStore | undefined;
}

function createInitialStore(): PersistedStore {
  const now = new Date().toISOString();
  return {
    users: [
      { id: "U001", email: "admin@dharohar.gov", name: "System Administrator", role: "ADMIN", createdAt: now },
      { id: "U002", email: "verification@dharohar.gov", name: "Rajesh Kumar", role: "VERIFICATION_OFFICER", district: "Lucknow", createdAt: now },
      { id: "U003", email: "data@dharohar.gov", name: "Priya Sharma", role: "DATA_OFFICER", district: "Lucknow", createdAt: now },
      { id: "U004", email: "survey@dharohar.gov", name: "Amit Verma", role: "SURVEY_OFFICER", district: "Lucknow", createdAt: now },
      { id: "U005", email: "citizen@dharohar.gov", name: "Ramesh Singh", role: "CITIZEN", district: "Lucknow", createdAt: now },
    ],
    passwordHashes: {},
    documents: [],
    records: [],
    verificationTasks: [],
    auditEvents: [],
    parcels: [],
  };
}

function mergeMissingDemoUsers(data: PersistedStore): PersistedStore {
  const initialUsers = createInitialStore().users;
  let changed = false;
  for (const u of initialUsers) {
    if (!data.users.some((x) => x.email === u.email)) {
      data.users.push(u);
      changed = true;
    }
  }
  if (changed) persistToDisk(data);
  return data;
}

function loadStoreFromDisk(): PersistedStore {
  if (existsSync(STORE_FILE)) {
    const parsed = JSON.parse(
      readFileSync(/* turbopackIgnore: true */ STORE_FILE, "utf-8")
    ) as PersistedStore;
    return mergeMissingDemoUsers(parsed);
  }
  const initial = createInitialStore();
  persistToDisk(initial);
  return initial;
}

function persistToDisk(data: PersistedStore): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(/* turbopackIgnore: true */ STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getStoreData(): PersistedStore {
  if (!global.__dharoharStore) {
    global.__dharoharStore = loadStoreFromDisk();
  }
  return global.__dharoharStore;
}

function persist(): void {
  persistToDisk(getStoreData());
}

export async function initStore(): Promise<void> {
  getStoreData();
}

export const store = {
  get users() { return getStoreData().users; },
  get passwordHashes() { return getStoreData().passwordHashes; },
  get documents() { return getStoreData().documents; },
  get records() { return getStoreData().records; },
  get verificationTasks() { return getStoreData().verificationTasks; },
  get auditEvents() { return getStoreData().auditEvents; },
  get parcels() { return getStoreData().parcels; },

  addDocument(doc: Document) {
    getStoreData().documents.unshift(doc);
    persist();
  },
  updateDocument(id: string, updates: Partial<Document>) {
    const idx = getStoreData().documents.findIndex((d) => d.id === id);
    if (idx >= 0) {
      getStoreData().documents[idx] = { ...getStoreData().documents[idx], ...updates };
      persist();
    }
  },
  getDocument(id: string) {
    return getStoreData().documents.find((d) => d.id === id);
  },
  addRecord(record: LandRecord) {
    getStoreData().records.unshift(record);
    persist();
  },
  updateRecord(id: string, updates: Partial<LandRecord>) {
    const idx = getStoreData().records.findIndex((r) => r.record_id === id);
    if (idx >= 0) {
      getStoreData().records[idx] = { ...getStoreData().records[idx], ...updates };
      persist();
    }
  },
  getRecord(id: string) {
    return getStoreData().records.find((r) => r.record_id === id);
  },
  addVerificationTask(task: VerificationTask) {
    getStoreData().verificationTasks.unshift(task);
    persist();
  },
  updateVerificationTask(id: string, updates: Partial<VerificationTask>) {
    const idx = getStoreData().verificationTasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      getStoreData().verificationTasks[idx] = { ...getStoreData().verificationTasks[idx], ...updates };
      persist();
    }
  },
  addAuditEvent(event: AuditEvent) {
    getStoreData().auditEvents.unshift(event);
    persist();
  },
  addUser(user: User, passwordHash: string) {
    getStoreData().users.push(user);
    getStoreData().passwordHashes[user.email] = passwordHash;
    persist();
  },
  addParcel(parcel: Parcel) {
    getStoreData().parcels.push(parcel);
    persist();
  },
  getParcel(id: string) {
    return getStoreData().parcels.find((p) => p.parcel_id === id);
  },
  getParcelByRecord(recordId: string) {
    return getStoreData().parcels.find((p) => p.record_id === recordId);
  },
  updateParcelByRecord(recordId: string, updates: Partial<Parcel>) {
    const idx = getStoreData().parcels.findIndex((p) => p.record_id === recordId);
    if (idx >= 0) {
      getStoreData().parcels[idx] = { ...getStoreData().parcels[idx], ...updates };
      persist();
    }
  },
};

export { generateId };

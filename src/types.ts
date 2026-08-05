export type SceneType = 'relax' | 'tighten';

export type SeedType = 'material' | 'creative';

export type ObjectType = 'image' | 'video' | 'text' | 'landing_page' | 'creative';

export type CcrOperator = 'gte' | 'lte';

export type LogicalOperator = 'and' | 'or';

export interface CcrCondition {
  metric: CcrMetricType;
  operator: CcrOperator;
  value: number;
}

export interface CcrConditionGroup {
  conditions: CcrCondition[];
  logicalOperator: LogicalOperator;
}

export type CountryType = 'US' | 'GB' | 'ID' | 'VN' | 'TH' | 'BR' | 'JP' | 'KR' | 'DE' | 'FR';

export type IndustryType = 'ecommerce' | 'game' | 'finance' | 'health' | 'education' | 'entertainment' | 'travel' | 'food';

export type AdLevelType = 'P0' | 'P1' | 'P2' | 'P3';

export type SeedStatus = 'active' | 'cleared';

export type ExecutionStatus = 'not_executed' | 'executing' | 'success' | 'failed';

export type ModelConclusion = 'suggest_clear' | 'suggest_keep' | 'execution_failed' | 'no_result';

export type ExecutionCapability = 'hermes' | 'workflow';

export type CCRArea = 'below_market' | 'above_market';

export type CcrMetricType =
  | 'p0_ccr'
  | 'p1_ccr'
  | 'p0_sexual_ccr'
  | 'p0_fraud_ccr'
  | 'p0_counterfeit_ccr'
  | 'p0_gambling_ccr'
  | 'p1_vulgar_ccr'
  | 'p1_misleading_ccr'
  | 'p1_discomforting_ccr';

export type SecondaryCCRType = 
  | 'p0_sexual_ccr' 
  | 'p0_fraud_ccr' 
  | 'p0_counterfeit_ccr'
  | 'p0_gambling_ccr'
  | 'p1_vulgar_ccr'
  | 'p1_misleading_ccr'
  | 'p1_discomforting_ccr';

export type DeliveryStatus = 'delivering' | 'no_delivery';

export type AuditSourceType = 'pre_review' | 'first_review' | 'post_review' | 'appeal' | 'ts';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type BatchApprovalStatus = 'unsubmitted' | 'pending_review' | 'approved' | 'rejected';

export type TaskStatus = 
  | 'pending_model'
  | 'model_executing' 
  | 'model_completed'
  | 'review_confirmed'
  | 'approval_approved'
  | 'approval_rejected'
  | 'disposal_completed' 
  | 'abandoned'
  | 'draft'
  | 'pending_approval'
  | 'disposal_pending';

export interface Task {
  id: string;
  name: string;
  remark?: string;
  sceneType: SceneType;
  status: TaskStatus;
  seedCount: number;
  seedIds?: string[];
  submitter?: string;
  filterConditions: FilterCondition;
  executionConfig?: ExecutionConfig;
  createdAt: string;
  updatedAt: string;
  batchApproval?: BatchApproval;
  disposalApproval?: ApprovalRequest;
  modelResultStats?: {
    suggestClear: number;
    suggestKeep: number;
    executionFailed: number;
  };
  reviewConfirmed?: boolean;
}

export interface SecondaryCCR {
  type: SecondaryCCRType;
  value: number;
}

export interface BatchApproval {
  id: string;
  sceneType: SceneType;
  seedCount: number;
  seedIds?: string[];
  taskName?: string;
  taskRemark?: string;
  filterConditions: FilterCondition;
  status: BatchApprovalStatus;
  reason: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
}

export interface ApprovalRequest {
  id: string;
  batchId: string;
  seedIds: string[];
  reason: string;
  sceneType: SceneType;
  totalCount: number;
  clearSuggestedCount: number;
  keepSuggestedCount: number;
  status: ApprovalStatus;
  feishuApprovalUrl: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
}

export interface FilterCondition {
  objectId?: string;
  objectIds?: string[];
  objectType?: ObjectType[];
  materialId?: string[];
  creativeId?: string[];
  seedType?: SeedType[];
  country?: CountryType[];
  industry?: IndustryType[];
  auditSource?: AuditSourceType[];
  policyCode?: string[];
  provision?: string[];
  p0CCRArea?: CCRArea[];
  p1CCRArea?: CCRArea[];
  ccrConditions?: CcrConditionGroup;
  secondaryCCR?: SecondaryCCRType[];
  deliveryStatus?: DeliveryStatus[];
  seedStatus?: SeedStatus[];
  executionStatus?: ExecutionStatus[];
  modelConclusion?: ModelConclusion[];
  createTimeRange?: [string, string];
  updateTimeRange?: [string, string];
}

export interface ModelResult {
  conclusion: ModelConclusion;
  confidence: number;
  hitTag: string;
  reason: string;
  suggestClear: boolean;
  manualCorrection?: {
    conclusion: 'suggest_clear' | 'suggest_keep';
    reason: string;
    operator: string;
    correctedAt: string;
  };
}

export interface OperationLog {
  id: string;
  time: string;
  action: string;
  operator: string;
  detail?: string;
}

export interface Seed {
  id: string;
  seedType: SeedType;
  objectId: string;
  creativeKey: string;
  materialId?: string;
  creativeId?: string;
  objectType: ObjectType;
  country: CountryType;
  industry: IndustryType;
  auditSource: AuditSourceType;
  policyCode: string;
  provision: string;
  adLevel: AdLevelType;
  ccr: number;
  secondaryCCRs: SecondaryCCR[];
  deliveryStatus: DeliveryStatus;
  seedStatus: SeedStatus;
  executionStatus: ExecutionStatus;
  executionCapability?: ExecutionCapability;
  tagId?: string;
  modelResult?: ModelResult;
  createdAt: string;
  updatedAt: string;
  clearedAt?: string;
  operationLogs: OperationLog[];
}

export interface ExecutionConfig {
  capability: ExecutionCapability | null;
  tagId: string;
  description: string;
  onlySelected: boolean;
  batchName: string;
}

export interface Stats {
  totalSeeds: number;
  pendingSeeds: number;
  executedSeeds: number;
  clearSuggestedSeeds: number;
  clearedSeeds: number;
  failedSeeds: number;
}

export interface ApiDraft {
  name: string;
  method: string;
  path: string;
  description: string;
  params?: string;
  body?: string;
  response?: string;
}

import type { Seed, ApiDraft, ObjectType, CountryType, IndustryType, DeliveryStatus, SeedStatus, ExecutionStatus, SecondaryCCR, SecondaryCCRType, Task, AuditSourceType } from './types';

const countryOptions = ['US', 'GB', 'ID', 'VN', 'TH', 'BR', 'JP', 'KR', 'DE', 'FR'] as const;
const industryOptions = ['ecommerce', 'game', 'finance', 'health', 'education', 'entertainment', 'travel', 'food'] as const;
export const policyCodes = ['POLICY_001', 'POLICY_002', 'POLICY_003', 'POLICY_004', 'POLICY_005', 'POLICY_006'];
export const provisions = ['PROV_A', 'PROV_B', 'PROV_C', 'PROV_D', 'PROV_E'];
const adLevels = ['P0', 'P1', 'P2', 'P3'] as const;
const objectTypes = ['image', 'video', 'text', 'landing_page'] as const;
const auditSources: AuditSourceType[] = ['pre_review', 'first_review', 'post_review', 'appeal', 'ts'];

const p0SecondaryCCRs: SecondaryCCRType[] = ['p0_sexual_ccr', 'p0_fraud_ccr', 'p0_vulgar_ccr', 'p0_political_ccr', 'p0_adult_ccr'];
const p1SecondaryCCRs: SecondaryCCRType[] = ['p1_sexual_ccr', 'p1_fraud_ccr', 'p1_vulgar_ccr', 'p1_political_ccr', 'p1_adult_ccr'];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCCR(): number {
  return Math.round((Math.random() * 0.9 + 0.01) * 100) / 100;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function createOperationLogs(seedId: string): Seed['operationLogs'] {
  const baseTime = new Date();
  const logs: Seed['operationLogs'] = [
    {
      id: generateId('log'),
      time: formatDate(new Date(baseTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)),
      action: '种子入库',
      operator: 'system',
      detail: `种子 ${seedId} 审核完成后进入种子库`,
    },
  ];
  return logs;
}

function createSecondaryCCRs(adLevel: string): SecondaryCCR[] {
  const ccrTypes = adLevel === 'P0' ? p0SecondaryCCRs : adLevel === 'P1' ? p1SecondaryCCRs : [];
  const count = Math.floor(Math.random() * 3) + 2;
  const selectedTypes = [...ccrTypes].sort(() => Math.random() - 0.5).slice(0, count);
  return selectedTypes.map(type => ({
    type,
    value: Math.round((Math.random() * 0.9 + 0.05) * 100) / 100,
  }));
}

const mockSeeds: Seed[] = [];

type ValidConclusion = 'suggest_clear' | 'suggest_keep';

const hitTags: Record<ValidConclusion, readonly string[]> = {
  suggest_clear: ['policy_relax_appeal_pass', 'risk_level_decreased', 'compliance_requirement_removed'],
  suggest_keep: ['critical_risk_confirmed', 'risk_level_increased', 'new_policy_violation'],
};

const reasons: Record<ValidConclusion, readonly string[]> = {
  suggest_clear: [
    '该素材命中政策放宽后的允许表达，历史拒绝结果不应继续复用。',
    '风险等级降低至可接受范围，建议清除种子库结果。',
    '合规要求已移除，该素材不再需要进入种子库。',
  ],
  suggest_keep: [
    '该素材仍符合收严后的风险定义，建议保留种子结果继续复用。',
    '风险等级升高，需要继续监控该素材。',
    '命中新政策违规项，建议保留种子结果。',
  ],
};

function createSeed(index: number, seedType: 'material' | 'creative', isHighPriority: boolean): Seed {
  const objectType = objectTypes[index % objectTypes.length] as ObjectType;
  const highRiskCountries: CountryType[] = ['US', 'JP', 'KR', 'DE'];
  const highRiskIndustries: IndustryType[] = ['finance', 'game', 'health'];
  const country = isHighPriority 
    ? highRiskCountries[index % highRiskCountries.length]
    : (countryOptions[index % countryOptions.length] as CountryType);
  const industry = isHighPriority
    ? highRiskIndustries[index % highRiskIndustries.length]
    : (industryOptions[index % industryOptions.length] as IndustryType);
  const ccr = isHighPriority
    ? Math.round((0.75 + Math.random() * 0.24) * 100) / 100
    : randomCCR();
  const adLevel = isHighPriority
    ? (index < 100 ? 'P0' : 'P1')
    : (adLevels[index % adLevels.length] as string);
  const deliveryStatus: DeliveryStatus = isHighPriority ? 'delivering' : (Math.random() > 0.5 ? 'delivering' : 'no_delivery');
  const auditSource = auditSources[index % auditSources.length];
  const policyCode = isHighPriority ? 'POLICY_001' : policyCodes[index % policyCodes.length];
  const provision = isHighPriority ? 'PROV_A' : provisions[index % provisions.length];
  
  const executionStatusOptions: ExecutionStatus[] = ['not_executed', 'not_executed', 'not_executed', 'success', 'success', 'executing', 'failed'];
  const executionStatus = executionStatusOptions[Math.floor(Math.random() * executionStatusOptions.length)];
  
  let modelResult: Seed['modelResult'] | undefined;
  let executionCapability: Seed['executionCapability'] | undefined;
  let tagId: string | undefined;
  
  if (executionStatus === 'success') {
    const conclusions: ValidConclusion[] = ['suggest_clear', 'suggest_keep'];
    const conclusion = randomItem(conclusions);
    executionCapability = (Math.random() > 0.5 ? 'hermes' : 'workflow') as Seed['executionCapability'];
    tagId = executionCapability === 'hermes' ? `tag_${Math.floor(Math.random() * 1000)}` : `workflow_${Math.floor(Math.random() * 100)}`;
    
    modelResult = {
      conclusion,
      confidence: Math.round((Math.random() * 20 + 75)) / 100,
      hitTag: randomItem(hitTags[conclusion]),
      reason: randomItem(reasons[conclusion]),
      suggestClear: conclusion === 'suggest_clear',
    };
  } else if (executionStatus === 'executing') {
    executionCapability = (Math.random() > 0.5 ? 'hermes' : 'workflow') as Seed['executionCapability'];
    tagId = executionCapability === 'hermes' ? `tag_${Math.floor(Math.random() * 1000)}` : `workflow_${Math.floor(Math.random() * 100)}`;
  } else if (executionStatus === 'failed') {
    executionCapability = (Math.random() > 0.5 ? 'hermes' : 'workflow') as Seed['executionCapability'];
    tagId = executionCapability === 'hermes' ? `tag_${Math.floor(Math.random() * 1000)}` : `workflow_${Math.floor(Math.random() * 100)}`;
  }
  
  const baseTime = new Date();
  const createdAt = formatDate(new Date(baseTime.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000));
  const updatedAt = formatDate(new Date(baseTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000));
  const seedStatus: SeedStatus = Math.random() > 0.9 ? 'cleared' : 'active';
  
  return {
    id: `${seedType}_seed_${String(index).padStart(4, '0')}`,
    seedType,
    objectId: `obj_${seedType}_${String(index).padStart(4, '0')}`,
    creativeKey: `ck_${seedType}_${String(index).padStart(4, '0')}`,
    materialId: seedType === 'material' ? `mat_${String(index).padStart(4, '0')}` : undefined,
    creativeId: seedType === 'creative' ? `crt_${String(index).padStart(4, '0')}` : undefined,
    objectType,
    country,
    industry,
    auditSource,
    policyCode,
    provision,
    adLevel,
    ccr,
    secondaryCCRs: createSecondaryCCRs(adLevel),
    deliveryStatus,
    seedStatus,
    executionStatus,
    executionCapability,
    tagId,
    modelResult,
    createdAt,
    updatedAt,
    clearedAt: seedStatus === 'cleared' ? formatDate(new Date(baseTime.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000)) : undefined,
    operationLogs: createOperationLogs(`${seedType}_seed_${String(index).padStart(4, '0')}`),
  };
}

for (let i = 0; i < 200; i++) {
  mockSeeds.push(createSeed(i, 'material', i < 50));
}

for (let i = 0; i < 200; i++) {
  mockSeeds.push(createSeed(i, 'creative', i < 50));
}

export const seeds = mockSeeds;

export const apiDrafts: ApiDraft[] = [
  {
    name: '筛选种子列表',
    method: 'POST',
    path: '/api/v1/seeds/filter',
    description: '根据筛选条件查询素材/创意种子列表',
    params: 'page: number, pageSize: number',
    body: `{
  "objectId": "string",
  "objectType": ["image|video|text|landing_page"],
  "materialId": "string",
  "creativeId": "string",
  "seedType": ["material|creative"],
  "country": ["string"],
  "industry": ["string"],
  "auditSource": ["pre_review|first_review|post_review|appeal|ts"],
  "policyCode": "string",
  "provision": "string",
  "p0CCRArea": "below_market|above_market",
  "p1CCRArea": "below_market|above_market",
  "secondaryCCR": ["p0_sexual_ccr|p0_fraud_ccr|..."],
  "deliveryStatus": ["delivering|no_delivery"],
  "seedStatus": ["active|cleared"],
  "executionStatus": ["not_executed|executing|success|failed"],
  "modelConclusion": ["suggest_clear|suggest_keep"],
  "createTimeRange": ["string", "string"],
  "updateTimeRange": ["string", "string"]
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "items": Seed[],
    "total": number,
    "page": number,
    "pageSize": number
  }
}`,
  },
  {
    name: '提交量级审批',
    method: 'POST',
    path: '/api/v1/seeds/batch-approval',
    description: '提交种子批量操作的量级审批申请',
    body: `{
  "sceneType": "relax|tighten",
  "seedCount": number,
  "filterConditions": {...},
  "reason": "string"
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "approvalId": "string",
    "status": "pending_review",
    "createdAt": "string"
  }
}`,
  },
  {
    name: '创建执行批次',
    method: 'POST',
    path: '/api/v1/seeds/batch',
    description: '创建种子执行批次，用于批量执行模型',
    body: `{
  "batchName": "string",
  "capability": "hermes|workflow",
  "tagId": "string",
  "description": "string",
  "seedIds": ["string"],
  "sceneType": "relax|tighten"
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "batchId": "string",
    "batchName": "string",
    "totalCount": number,
    "createdAt": "string"
  }
}`,
  },
  {
    name: '执行模型任务',
    method: 'POST',
    path: '/api/v1/seeds/execute',
    description: '对种子执行 Hermes 或 Workflow 模型',
    body: `{
  "batchId": "string",
  "capability": "hermes|workflow",
  "tagId": "string",
  "seedIds": ["string"]
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "string",
    "status": "executing"
  }
}`,
  },
  {
    name: '查询模型执行结果',
    method: 'GET',
    path: '/api/v1/seeds/results',
    description: '查询种子的模型执行结果',
    params: 'batchId: string, seedIds?: string[]',
    response: `{
  "code": 0,
  "message": "success",
  "data": [{
    "seedId": "string",
    "executionStatus": "success|failed",
    "modelResult": {
      "conclusion": "suggest_clear|suggest_keep",
      "confidence": number,
      "hitTag": "string",
      "reason": "string",
      "suggestClear": boolean
    },
    "updatedAt": "string"
  }]
}`,
  },
  {
    name: '提交处置审批',
    method: 'POST',
    path: '/api/v1/seeds/disposal-approval',
    description: '提交种子批量处置审批申请',
    body: `{
  "batchId": "string",
  "seedIds": ["string"],
  "reason": "string",
  "sceneType": "relax|tighten",
  "totalCount": number,
  "clearSuggestedCount": number,
  "keepSuggestedCount": number,
  "reviewRequiredCount": number
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "approvalId": "string",
    "status": "pending",
    "feishuApprovalUrl": "string",
    "createdAt": "string"
  }
}`,
  },
  {
    name: '查询审批状态',
    method: 'GET',
    path: '/api/v1/seeds/approval/{approvalId}',
    description: '查询审批申请状态',
    params: 'approvalId: string',
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "approvalId": "string",
    "status": "pending|approved|rejected",
    "approvedBy": "string",
    "approvedAt": "string",
    "rejectReason": "string"
  }
}`,
  },
  {
    name: '批量清除种子库',
    method: 'POST',
    path: '/api/v1/seeds/batch-clear',
    description: '批量清除种子库结果（审批通过后调用）',
    body: `{
  "approvalId": "string",
  "seedIds": ["string"],
  "reason": "string",
  "operator": "string"
}`,
    response: `{
  "code": 0,
  "message": "success",
  "data": {
    "clearedCount": number,
    "failedCount": number,
    "operationLogId": "string"
  }
}`,
  },
];

export const industryLabels: Record<string, string> = {
  ecommerce: '电商',
  game: '游戏',
  finance: '金融',
  health: '健康',
  education: '教育',
  entertainment: '娱乐',
  travel: '旅游',
  food: '餐饮',
};

export const countryLabels: Record<string, string> = {
  US: '美国',
  GB: '英国',
  ID: '印尼',
  VN: '越南',
  TH: '泰国',
  BR: '巴西',
  JP: '日本',
  KR: '韩国',
  DE: '德国',
  FR: '法国',
};

export const auditSourceLabels: Record<string, string> = {
  pre_review: '预审',
  first_review: '初审',
  post_review: '投后',
  appeal: '申诉',
  ts: 'TS',
};

export const seedTypeLabels: Record<string, string> = {
  material: '素材种子',
  creative: '创意位种子',
};

export const objectTypeLabels: Record<string, string> = {
  image: '图片素材',
  video: '视频素材',
  text: '文案素材',
  landing_page: '落地页',
};

export const deliveryStatusLabels: Record<string, string> = {
  delivering: '投放中',
  no_delivery: '无投放',
};

export const seedStatusLabels: Record<string, string> = {
  active: '生效中',
  cleared: '已清除',
};

export const executionStatusLabels: Record<string, string> = {
  not_executed: '未执行',
  executing: '执行中',
  success: '执行成功',
  failed: '执行失败',
};

export const modelConclusionLabels: Record<string, string> = {
  suggest_clear: '建议清除',
  suggest_keep: '建议保留',
  no_result: '未出结果',
};

export const capabilityLabels: Record<string, string> = {
  hermes: 'Hermes',
  workflow: 'Workflow',
};

export const ccrAreaLabels: Record<string, string> = {
  below_market: '<大盘',
  above_market: '>=大盘',
};

export const approvalStatusLabels: Record<string, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
};

export const batchApprovalStatusLabels: Record<string, string> = {
  unsubmitted: '未提交',
  pending_review: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
};

export const secondaryCCRLabels: Record<string, string> = {
  'p0_sexual_ccr': 'P0-色情CCR',
  'p0_fraud_ccr': 'P0-欺诈CCR',
  'p0_vulgar_ccr': 'P0-低俗CCR',
  'p0_political_ccr': 'P0-政治CCR',
  'p0_adult_ccr': 'P0-成人CCR',
  'p1_sexual_ccr': 'P1-色情CCR',
  'p1_fraud_ccr': 'P1-欺诈CCR',
  'p1_vulgar_ccr': 'P1-低俗CCR',
  'p1_political_ccr': 'P1-政治CCR',
  'p1_adult_ccr': 'P1-成人CCR',
};

export const hermesTags = [
  { id: 'tag_policy_relax_202607', name: '政策放宽复核 Tag', scene: 'relax' },
  { id: 'tag_policy_tighten_202607', name: '政策收严识别 Tag', scene: 'tighten' },
  { id: 'tag_compliance_check_001', name: '合规检查通用 Tag', scene: 'both' },
  { id: 'tag_risk_assessment_001', name: '风险评估 Tag', scene: 'both' },
  { id: 'tag_content_review_001', name: '内容审核 Tag', scene: 'both' },
];

export const workflowTags = [
  { id: 'workflow_compliance_check_001', name: '合规检查工作流', scene: 'tighten' },
  { id: 'workflow_policy_appeal_001', name: '政策申诉工作流', scene: 'relax' },
  { id: 'workflow_multi_model_check_001', name: '多模型串联检查', scene: 'both' },
  { id: 'workflow_risk_prioritize_001', name: '风险优先级排序', scene: 'tighten' },
];

export const taskStatusLabels: Record<string, string> = {
  draft: '草稿',
  pending_approval: '待审批',
  model_executing: '模型评估中',
  model_completed: '模型评估完毕待处置',
  disposal_pending: '处置审批中',
  disposal_completed: '处置完毕',
  abandoned: '废弃',
};

export const taskStatusColors: Record<string, string> = {
  draft: 'default',
  pending_approval: 'orange',
  model_executing: 'blue',
  model_completed: 'purple',
  disposal_pending: 'orange',
  disposal_completed: 'green',
  abandoned: 'gray',
};

export const mockTasks: Task[] = [
  {
    id: 'task_001',
    name: '政策放宽-POLICY_001历史拒绝种子复核',
    sceneType: 'relax',
    status: 'disposal_completed',
    seedCount: 50,
    filterConditions: {
      policyCode: ['POLICY_001'],
      provision: ['PROV_A'],
      seedStatus: ['active'],
    },
    createdAt: '2026-07-01 10:00:00',
    updatedAt: '2026-07-02 15:30:00',
    batchApproval: {
      id: 'batch_001',
      sceneType: 'relax',
      seedCount: 50,
      filterConditions: {},
      status: 'approved',
      reason: '政策放宽场景，需要复核历史拒绝种子',
      createdAt: '2026-07-01 10:30:00',
      approvedBy: '运营 Leader',
      approvedAt: '2026-07-01 11:00:00',
    },
    modelResultStats: { suggestClear: 30, suggestKeep: 20 },
  },
  {
    id: 'task_002',
    name: '政策收严-高CCR种子识别',
    sceneType: 'tighten',
    status: 'model_completed',
    seedCount: 80,
    filterConditions: {
      industry: ['finance', 'game'],
      country: ['US', 'JP'],
      secondaryCCR: ['p0_sexual_ccr', 'p0_fraud_ccr'],
    },
    createdAt: '2026-07-02 09:00:00',
    updatedAt: '2026-07-03 11:00:00',
    batchApproval: {
      id: 'batch_002',
      sceneType: 'tighten',
      seedCount: 80,
      filterConditions: {},
      status: 'approved',
      reason: '高CCR种子需要优先识别',
      createdAt: '2026-07-02 09:30:00',
      approvedBy: '运营 Leader',
      approvedAt: '2026-07-02 10:00:00',
    },
    modelResultStats: { suggestClear: 20, suggestKeep: 60 },
  },
  {
    id: 'task_003',
    name: '政策放宽-POLICY_002申诉种子处理',
    sceneType: 'relax',
    status: 'pending_approval',
    seedCount: 120,
    filterConditions: {
      policyCode: ['POLICY_002'],
      deliveryStatus: ['no_delivery'],
    },
    createdAt: '2026-07-03 14:00:00',
    updatedAt: '2026-07-03 16:00:00',
    batchApproval: {
      id: 'batch_003',
      sceneType: 'relax',
      seedCount: 120,
      filterConditions: {},
      status: 'approved',
      reason: 'POLICY_002申诉种子需要处理',
      createdAt: '2026-07-03 14:30:00',
      approvedBy: '运营 Leader',
      approvedAt: '2026-07-03 15:00:00',
    },
  },
  {
    id: 'task_004',
    name: '政策收严-P0广告主金融行业筛查',
    sceneType: 'tighten',
    status: 'pending_approval',
    seedCount: 200,
    filterConditions: {
      industry: ['finance'],
      country: ['US', 'DE', 'JP'],
    },
    createdAt: '2026-07-03 10:00:00',
    updatedAt: '2026-07-03 10:30:00',
    batchApproval: {
      id: 'batch_004',
      sceneType: 'tighten',
      seedCount: 200,
      filterConditions: {},
      status: 'pending_review',
      reason: 'P0广告主金融行业需要筛查',
      createdAt: '2026-07-03 10:30:00',
    },
  },
  {
    id: 'task_005',
    name: '政策放宽-历史拒绝种子全量复核',
    sceneType: 'relax',
    status: 'draft',
    seedCount: 300,
    filterConditions: {
      deliveryStatus: ['no_delivery'],
    },
    createdAt: '2026-07-04 09:00:00',
    updatedAt: '2026-07-04 09:00:00',
  },
  {
    id: 'task_006',
    name: '政策收严-游戏行业风控升级',
    sceneType: 'tighten',
    status: 'disposal_pending',
    seedCount: 60,
    filterConditions: {
      industry: ['game'],
      country: ['KR', 'JP'],
    },
    createdAt: '2026-07-02 11:00:00',
    updatedAt: '2026-07-03 14:00:00',
    batchApproval: {
      id: 'batch_006',
      sceneType: 'tighten',
      seedCount: 60,
      filterConditions: {},
      status: 'approved',
      reason: '游戏行业风控升级需要处理',
      createdAt: '2026-07-02 11:30:00',
      approvedBy: '运营 Leader',
      approvedAt: '2026-07-02 12:00:00',
    },
    modelResultStats: { suggestClear: 15, suggestKeep: 45 },
  },
  {
    id: 'task_007',
    name: '政策收严-健康行业合规检查',
    sceneType: 'tighten',
    status: 'abandoned',
    seedCount: 45,
    filterConditions: {
      industry: ['health'],
      country: ['US'],
    },
    createdAt: '2026-06-28 10:00:00',
    updatedAt: '2026-06-29 15:00:00',
  },
];

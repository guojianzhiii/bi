import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Input,
  Layout,
  Menu,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type {
  CcrCondition,
  CcrMetricType,
  CcrOperator,
  ExecutionCapability,
  ExecutionConfig,
  FilterCondition,
  LogicalOperator,
  ModelConclusion,
  OperationLog,
  SceneType,
  Seed,
  Task,
  TaskStatus,
} from './types.ts';
import * as MockData from './mockData.ts';
import './App.css';

type NavKey = 'createTask' | 'taskCenter';
type ValidConclusion = 'suggest_clear' | 'suggest_keep';
type TagOption = {
  id: string;
  name: string;
  scene: SceneType | 'both';
};
type TaskFilters = {
  sceneType?: SceneType;
  taskId?: string;
  market?: string[];
  objectType?: string[];
  taskStatus?: TaskStatus;
  createdStart?: string;
  createdEnd?: string;
};

const defaultSubmitter = '机审运营';

const {
  auditSourceLabels,
  capabilityLabels,
  countryLabels,
  hermesTags,
  industryLabels,
  mockTasks,
  modelConclusionLabels,
  objectTypeLabels,
  policyCodes,
  provisions,
  seeds: initialSeeds,
  seedStatusLabels,
  seedTypeLabels,
  taskStatusLabels,
  workflowTags,
} = MockData;

const ccrMetricLabels: Record<CcrMetricType, string> = {
  p0_ccr: 'P0 CCR',
  p1_ccr: 'P1 CCR',
  p0_sexual_ccr: 'P0 Sexual CCR',
  p0_fraud_ccr: 'P0 Fraud CCR',
  p0_counterfeit_ccr: 'P0 Counterfeit CCR',
  p0_gambling_ccr: 'P0 Gambling CCR',
  p1_vulgar_ccr: 'P1 Vulgar CCR',
  p1_misleading_ccr: 'P1 Misleading CCR',
  p1_discomforting_ccr: 'P1 Discomforting CCR',
};

const statusColorMap: Record<TaskStatus, string> = {
  pending_model: 'blue',
  model_executing: 'processing',
  model_completed: 'purple',
  approval_approved: 'green',
  approval_rejected: 'red',
  disposal_completed: 'green',
  abandoned: 'default',
  draft: 'default',
  pending_approval: 'orange',
  disposal_pending: 'gold',
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function parseObjectIdsFromText(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,;，；\n\r\t]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function generateMockModelResult() {
  const conclusions: ValidConclusion[] = ['suggest_clear', 'suggest_keep'];
  const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
  const hitTags: Record<ValidConclusion, string[]> = {
    suggest_clear: ['policy_relax_appeal_pass', 'risk_level_decreased', 'compliance_requirement_removed'],
    suggest_keep: ['critical_risk_confirmed', 'risk_level_increased', 'new_policy_violation'],
  };
  const reasons: Record<ValidConclusion, string[]> = {
    suggest_clear: [
      '模型判断该种子在新策略下不应继续复用，建议置为无效。',
      '风险等级已降低，历史结果不再适合作为机审种子。',
      '政策边界发生变化，建议移除种子结果。',
    ],
    suggest_keep: [
      '模型确认该内容仍具备复用价值，建议保留。',
      '风险特征稳定命中，建议继续作为机审种子。',
      '策略收严后仍符合风险定义，建议保留结果。',
    ],
  };

  return {
    conclusion: conclusion as ModelConclusion,
    confidence: Math.round((Math.random() * 20 + 75)) / 100,
    hitTag: hitTags[conclusion][Math.floor(Math.random() * hitTags[conclusion].length)],
    reason: reasons[conclusion][Math.floor(Math.random() * reasons[conclusion].length)],
    suggestClear: conclusion === 'suggest_clear',
  };
}

function getSeedMetricValue(seed: Seed, metric: CcrMetricType): number | undefined {
  if (metric === 'p0_ccr') return seed.adLevel === 'P0' ? seed.ccr : undefined;
  if (metric === 'p1_ccr') return seed.adLevel === 'P1' ? seed.ccr : undefined;
  return seed.secondaryCCRs.find((item) => item.type === metric)?.value;
}

function App() {
  const [seeds, setSeeds] = useState<Seed[]>(initialSeeds);
  const [tasks, setTasks] = useState<Task[]>(
    mockTasks.map((task) => ({
      ...task,
      status: normalizeTaskStatus(task.status),
      seedIds: task.seedIds || initialSeeds.slice(0, Math.min(task.seedCount, 80)).map((seed) => seed.id),
    })),
  );
  const [currentNav, setCurrentNav] = useState<NavKey>('createTask');
  const [sceneType, setSceneType] = useState<SceneType>('relax');
  const [taskName, setTaskName] = useState('');
  const [taskRemark, setTaskRemark] = useState('');
  const [filterConditions, setFilterConditions] = useState<FilterCondition>({});
  const [createdTaskId, setCreatedTaskId] = useState('');
  const [previewSeeds, setPreviewSeeds] = useState<Seed[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTaskRowKeys, setSelectedTaskRowKeys] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [detailSeed, setDetailSeed] = useState<Seed | null>(null);
  const [showSeedDetail, setShowSeedDetail] = useState(false);
  const [showSeedModelResult, setShowSeedModelResult] = useState(false);
  const [executionDrawerOpen, setExecutionDrawerOpen] = useState(false);
  const [executionTaskIds, setExecutionTaskIds] = useState<string[]>([]);
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    capability: null,
    tagId: '',
    description: '',
    onlySelected: false,
    batchName: '',
  });
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});
  const [appliedTaskFilters, setAppliedTaskFilters] = useState<TaskFilters>({});

  function normalizeTaskStatus(status: TaskStatus): TaskStatus {
    if (status === 'draft' || status === 'pending_approval') return 'pending_model';
    if (status === 'disposal_pending') return 'approval_approved';
    return status;
  }

  const filteredSeeds = useMemo(() => {
    let result = [...seeds];
    const manualObjectIds = filterConditions.objectId ? parseObjectIdsFromText(filterConditions.objectId) : [];
    const uploadedObjectIds = filterConditions.objectIds || [];
    const objectIds = Array.from(new Set([...manualObjectIds, ...uploadedObjectIds]));

    if (objectIds.length > 0) {
      result = result.filter((seed) => objectIds.some((id) => seed.objectId.includes(id)));
    }
    if (filterConditions.objectType?.length) {
      result = result.filter((seed) => filterConditions.objectType?.includes(seed.objectType));
    }
    if (filterConditions.seedType?.length) {
      result = result.filter((seed) => filterConditions.seedType?.includes(seed.seedType));
    }
    if (filterConditions.country?.length) {
      result = result.filter((seed) => filterConditions.country?.includes(seed.country));
    }
    if (filterConditions.industry?.length) {
      result = result.filter((seed) => filterConditions.industry?.includes(seed.industry));
    }
    if (filterConditions.seedStatus?.length) {
      result = result.filter((seed) => filterConditions.seedStatus?.includes(seed.seedStatus));
    }
    if (filterConditions.auditSource?.length) {
      result = result.filter((seed) => filterConditions.auditSource?.includes(seed.auditSource));
    }
    if (sceneType === 'relax') {
      if (filterConditions.policyCode?.length) {
        result = result.filter((seed) => filterConditions.policyCode?.includes(seed.policyCode));
      }
      if (filterConditions.provision?.length) {
        result = result.filter((seed) => filterConditions.provision?.includes(seed.provision));
      }
    }
    if (sceneType === 'tighten' && filterConditions.ccrConditions) {
      const { conditions, logicalOperator } = filterConditions.ccrConditions;
      if (conditions.length === 0) return result;
      result = result.filter((seed) => {
        const matchResults = conditions.map((condition) => {
          const value = getSeedMetricValue(seed, condition.metric);
          if (value === undefined) return false;
          if (condition.operator === 'gte' && value < condition.value) return false;
          if (condition.operator === 'lte' && value > condition.value) return false;
          return true;
        });
        if (logicalOperator === 'and') {
          return matchResults.every((m) => m);
        }
        return matchResults.some((m) => m);
      });
    }
    return result;
  }, [filterConditions, sceneType, seeds]);

  const paginatedPreviewSeeds = previewSeeds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const taskStats = useMemo(() => ({
    total: tasks.length,
    pendingModel: tasks.filter((task) => task.status === 'pending_model').length,
    running: tasks.filter((task) => task.status === 'model_executing').length,
    pendingApproval: tasks.filter((task) => task.status === 'model_completed').length,
    pendingClean: tasks.filter((task) => task.status === 'approval_approved').length,
  }), [tasks]);

  const taskRows = useMemo(() => {
    return [...tasks]
      .filter((task) => {
        if (appliedTaskFilters.sceneType && task.sceneType !== appliedTaskFilters.sceneType) return false;
        if (appliedTaskFilters.taskId && !task.id.includes(appliedTaskFilters.taskId.trim())) return false;
        if (appliedTaskFilters.market?.length) {
          const markets = (task.filterConditions.country || []) as string[];
          if (!markets.some((market: string) => appliedTaskFilters.market?.includes(market))) return false;
        }
        if (appliedTaskFilters.objectType?.length) {
          const objectTypes = (task.filterConditions.objectType || []) as string[];
          if (!objectTypes.some((type: string) => appliedTaskFilters.objectType?.includes(type))) return false;
        }
        if (appliedTaskFilters.taskStatus && task.status !== appliedTaskFilters.taskStatus) return false;
        if (appliedTaskFilters.createdStart && task.createdAt < appliedTaskFilters.createdStart) return false;
        if (appliedTaskFilters.createdEnd && task.createdAt > `${appliedTaskFilters.createdEnd} 23:59:59`) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [appliedTaskFilters, tasks]);

  const detailTaskSeeds = useMemo(() => {
    if (!selectedTask) return [];
    return seeds.filter((seed) => selectedTask.seedIds?.includes(seed.id));
  }, [seeds, selectedTask]);

  const executionTasks = useMemo(
    () => tasks.filter((task) => executionTaskIds.includes(task.id)),
    [executionTaskIds, tasks],
  );

  const executionSceneType = useMemo<SceneType | undefined>(() => {
    const scenes = Array.from(new Set(executionTasks.map((task) => task.sceneType)));
    return scenes.length === 1 ? scenes[0] : undefined;
  }, [executionTasks]);

  const availableTags = executionConfig.capability === 'workflow'
    ? (workflowTags as TagOption[]).filter((item: TagOption) => item.scene === 'both' || item.scene === executionSceneType)
    : (hermesTags as TagOption[]).filter((item: TagOption) => item.scene === 'both' || item.scene === executionSceneType);

  const updateFilter = <K extends keyof FilterCondition>(key: K, value: FilterCondition[K]) => {
    setFilterConditions((prev: FilterCondition) => ({ ...prev, [key]: value }));
    setCreatedTaskId('');
    setPreviewSeeds([]);
    setCurrentPage(1);
  };

  const addCcrCondition = () => {
    setFilterConditions((prev: FilterCondition) => {
      const existing = prev.ccrConditions || { conditions: [], logicalOperator: 'and' };
      return {
        ...prev,
        ccrConditions: {
          ...existing,
          conditions: [
            ...existing.conditions,
            { metric: 'p0_ccr', operator: 'gte', value: 0.7 },
          ],
        },
      };
    });
    setCreatedTaskId('');
    setPreviewSeeds([]);
  };

  const updateCcrCondition = (index: number, field: keyof CcrCondition, value: CcrMetricType | CcrOperator | number) => {
    setFilterConditions((prev: FilterCondition) => {
      const existing = prev.ccrConditions || { conditions: [], logicalOperator: 'and' };
      return {
        ...prev,
        ccrConditions: {
          ...existing,
          conditions: existing.conditions.map((cond, i) =>
            i === index ? { ...cond, [field]: value } : cond,
          ),
        },
      };
    });
    setCreatedTaskId('');
    setPreviewSeeds([]);
  };

  const removeCcrCondition = (index: number) => {
    setFilterConditions((prev: FilterCondition) => {
      const existing = prev.ccrConditions || { conditions: [], logicalOperator: 'and' };
      return {
        ...prev,
        ccrConditions: {
          ...existing,
          conditions: existing.conditions.filter((_, i) => i !== index),
        },
      };
    });
    setCreatedTaskId('');
    setPreviewSeeds([]);
  };

  const updateLogicalOperator = (operator: LogicalOperator) => {
    setFilterConditions((prev: FilterCondition) => {
      const existing = prev.ccrConditions || { conditions: [], logicalOperator: 'and' };
      return {
        ...prev,
        ccrConditions: { ...existing, logicalOperator: operator },
      };
    });
    setCreatedTaskId('');
    setPreviewSeeds([]);
  };

  const handleSceneChange = (value: SceneType) => {
    setSceneType(value);
    setFilterConditions({});
    setTaskName('');
    setTaskRemark('');
    setCreatedTaskId('');
    setPreviewSeeds([]);
  };

  const handleObjectIdUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      message.warning('当前 Demo 环境未接入 Excel 解析库，请先将文件另存为 CSV/TXT 后上传。');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const objectIds = parseObjectIdsFromText(String(reader.result || ''));
      updateFilter('objectIds', objectIds);
      message.success(`已导入 ${objectIds.length} 个 Object ID`);
    };
    reader.onerror = () => message.error('读取文件失败');
    reader.readAsText(file);
    return false;
  };

  const getTaskNameExample = () => {
    const sceneLabel = sceneType === 'relax' ? '政策放宽' : '政策收严';
    const market = filterConditions.country?.[0] || 'US';
    const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const purpose = sceneType === 'relax' ? 'gambling policy种子清理' : '高CCR种子清理';
    return `${sceneLabel}-${dateLabel}-${market}-${purpose}`;
  };

  const validateTaskMeta = () => {
    if (!taskName.trim()) {
      message.warning('请填写任务名称');
      return false;
    }
    if (!taskRemark.trim()) {
      message.warning('请填写任务备注');
      return false;
    }
    return true;
  };

  const getTaskSubmitter = (task: Task) => task.submitter || defaultSubmitter;

  const isTaskFilterApplied = Object.values(appliedTaskFilters).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));

  const handleSearchTasks = () => {
    setAppliedTaskFilters({ ...taskFilters });
    setSelectedTaskRowKeys([]);
  };

  const handleResetTaskFilters = () => {
    setTaskFilters({});
    setAppliedTaskFilters({});
    setSelectedTaskRowKeys([]);
  };

  const handleCreateSeedTask = () => {
    if (!validateTaskMeta()) return;
    const taskSeeds = filteredSeeds;
    if (taskSeeds.length === 0) {
      message.warning('当前条件下没有可生成任务的种子');
      return;
    }
    const now = formatDate(new Date());
    const nextTask: Task = {
      id: generateId('task'),
      name: taskName.trim(),
      remark: taskRemark.trim(),
      sceneType,
      status: 'pending_model',
      seedCount: taskSeeds.length,
      seedIds: taskSeeds.map((seed) => seed.id),
      submitter: '当前用户',
      filterConditions: { ...filterConditions },
      createdAt: now,
      updatedAt: now,
    };
    setTasks((prev) => [nextTask, ...prev]);
    setPreviewSeeds(taskSeeds);
    setCreatedTaskId(nextTask.id);
    setCurrentPage(1);
    message.success(`已生成种子筛选任务：${nextTask.id}`);
  };

  const openExecutionDrawer = (taskIds: string[]) => {
    const executableIds = taskIds.filter((id) => tasks.find((task) => task.id === id)?.status === 'pending_model');
    if (executableIds.length === 0) {
      message.warning('请选择处于“待执行模型”的任务');
      return;
    }
    setExecutionTaskIds(executableIds);
    setExecutionConfig({ capability: null, tagId: '', description: '', onlySelected: false, batchName: '' });
    setExecutionDrawerOpen(true);
  };

  const handleRunModel = () => {
    if (!executionConfig.capability || !executionConfig.tagId) {
      message.warning('请先选择执行能力和 Tag ID');
      return;
    }
    const targetTasks = executionTasks;
    if (targetTasks.length === 0) return;

    const now = formatDate(new Date());
    setTasks((prev) => prev.map((task) => (
      executionTaskIds.includes(task.id)
        ? { ...task, status: 'model_executing', executionConfig: { ...executionConfig, batchName: task.name }, updatedAt: now }
        : task
    )));
    setExecutionDrawerOpen(false);
    message.success('模型执行已提交，Demo 将自动模拟返回结果');

    window.setTimeout(() => {
      const nextStats = new Map<string, { suggestClear: number; suggestKeep: number }>();
      const resultBySeedId = new Map<string, ReturnType<typeof generateMockModelResult>>();
      targetTasks.forEach((task) => {
        let suggestClear = 0;
        let suggestKeep = 0;
        task.seedIds?.forEach((seedId: string) => {
          const result = generateMockModelResult();
          resultBySeedId.set(seedId, result);
          if (result.conclusion === 'suggest_clear') suggestClear += 1;
          if (result.conclusion === 'suggest_keep') suggestKeep += 1;
        });
        nextStats.set(task.id, { suggestClear, suggestKeep });
      });

      setSeeds((prev: Seed[]) => prev.map((seed: Seed) => {
        const modelResult = resultBySeedId.get(seed.id);
        if (!modelResult) return seed;
        const newLog: OperationLog = {
          id: generateId('log'),
          time: formatDate(new Date()),
          action: '任务中心执行模型',
          operator: 'operator',
          detail: `${capabilityLabels[executionConfig.capability!]} - ${executionConfig.tagId}`,
        };
        return {
          ...seed,
          executionStatus: 'success',
          executionCapability: executionConfig.capability || undefined,
          tagId: executionConfig.tagId,
          modelResult,
          updatedAt: formatDate(new Date()),
          operationLogs: [...seed.operationLogs, newLog],
        };
      }));

      setTasks((prev: Task[]) => prev.map((task: Task) => {
        const stats = nextStats.get(task.id);
        if (!stats) return task;
        return {
          ...task,
          status: 'model_completed',
          updatedAt: formatDate(new Date()),
          modelResultStats: stats,
        };
      }));
      message.success('模型执行完毕，任务进入待审批确认');
    }, 1200);
  };

  const updateTaskStatus = (taskIds: string[], status: TaskStatus, successText: string) => {
    const updatedAt = formatDate(new Date());
    setTasks((prev: Task[]) => prev.map((task: Task) => (
      taskIds.includes(task.id)
        ? { ...task, status, updatedAt }
        : task
    )));
    setSelectedTask((prev: Task | null) => (prev && taskIds.includes(prev.id) ? { ...prev, status, updatedAt } : prev));
    setSelectedTaskRowKeys([]);
    message.success(successText);
  };

  const handleCleanTasks = (taskIds: string[]) => {
    const targetTasks = tasks.filter((task) => taskIds.includes(task.id) && task.status === 'approval_approved');
    if (targetTasks.length === 0) {
      message.warning('请选择处于“审批通过，待清理”的任务');
      return;
    }
    const targetSeedIds = new Set(targetTasks.flatMap((task) => task.seedIds || []));
    setSeeds((prev) => prev.map((seed) => {
      if (!targetSeedIds.has(seed.id)) return seed;
      return {
        ...seed,
        seedStatus: 'cleared',
        clearedAt: formatDate(new Date()),
        updatedAt: formatDate(new Date()),
        operationLogs: [
          ...seed.operationLogs,
          {
            id: generateId('log'),
            time: formatDate(new Date()),
            action: '审批通过后清理种子',
            operator: 'system',
            detail: '任务中心触发自动清理',
          },
        ],
      };
    }));
    updateTaskStatus(targetTasks.map((task) => task.id), 'disposal_completed', '已完成清理');
  };

  const renderScene = (scene: SceneType) => (
    <Tag color={scene === 'relax' ? 'green' : 'orange'}>
      {scene === 'relax' ? '政策放宽' : '政策收严'}
    </Tag>
  );

  const renderTaskStatus = (status: TaskStatus) => (
    <Tag color={statusColorMap[status] || 'default'}>{taskStatusLabels[status]}</Tag>
  );

  const renderModelConclusion = (conclusion?: ModelConclusion) => {
    if (!conclusion) return '-';
    const className = conclusion === 'suggest_clear' ? 'tag-suggest-clear' : conclusion === 'suggest_keep' ? 'tag-suggest-keep' : 'tag-no-result';
    return <Tag className={className}>{modelConclusionLabels[conclusion]}</Tag>;
  };

  const renderSeedPreview = (seed: Seed) => {
    if (seed.objectType === 'image') {
      const prompt = encodeURIComponent(`realistic ad creative preview for ${seed.industry} market ${seed.country}, clean product image, website thumbnail`);
      return (
        <div className="preview-card">
          <img
            src={`https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_4_3`}
            alt="图片预览"
            className="preview-image"
          />
        </div>
      );
    }
    if (seed.objectType === 'video') return <div className="preview-card"><div className="preview-video">Video<br />00:15</div></div>;
    if (seed.objectType === 'text') return <div className="preview-card"><div className="preview-text">高转化广告文案示例：限时优惠，立即了解更多。</div></div>;
    return <div className="preview-card"><div className="preview-landing">{`https://ads.example.com/${seed.objectId}`}</div></div>;
  };

  const openSeedDetail = (seed: Seed, showModelResult = false) => {
    setDetailSeed(seed);
    setShowSeedModelResult(showModelResult);
    setShowSeedDetail(true);
  };

  const getSeedColumns = (showModelResult = false): TableProps<Seed>['columns'] => {
    const columns: TableProps<Seed>['columns'] = [
      { title: '预览', key: 'preview', width: 110, render: (_, record) => renderSeedPreview(record) },
      { title: '种子 ID', dataIndex: 'id', key: 'id', width: 150 },
      { title: 'Object ID', dataIndex: 'objectId', key: 'objectId', width: 180 },
      { title: 'Object Type', dataIndex: 'objectType', key: 'objectType', width: 120, render: (value: Seed['objectType']) => objectTypeLabels[value] },
      { title: '市场', dataIndex: 'country', key: 'country', width: 100, render: (value: Seed['country']) => countryLabels[value] },
      { title: '行业', dataIndex: 'industry', key: 'industry', width: 100, render: (value: Seed['industry']) => industryLabels[value] },
      { title: '种子状态', dataIndex: 'seedStatus', key: 'seedStatus', width: 120, render: (value: Seed['seedStatus']) => seedStatusLabels[value] },
    ];

    if (showModelResult) {
      columns.push({ title: '模型结论', dataIndex: 'modelResult', key: 'modelResult', width: 140, render: (value: Seed['modelResult']) => renderModelConclusion(value?.conclusion) });
    }

    columns.push({
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => <Button type="link" icon={<EyeOutlined />} onClick={() => openSeedDetail(record, showModelResult)}>详情</Button>,
    });

    return columns;
  };

  const taskFilterSummary = (task: Task) => {
    const parts: string[] = [];
    if (task.filterConditions.country?.length) parts.push(`市场：${(task.filterConditions.country as string[]).map((item: string) => countryLabels[item]).join(' / ')}`);
    if (task.filterConditions.objectType?.length) parts.push(`Object Type：${(task.filterConditions.objectType as string[]).map((item: string) => objectTypeLabels[item]).join(' / ')}`);
    if (task.filterConditions.auditSource?.length) parts.push(`审核来源：${(task.filterConditions.auditSource as string[]).map((item: string) => auditSourceLabels[item]).join(' / ')}`);
    if (task.filterConditions.policyCode?.length) parts.push(`Policy：${task.filterConditions.policyCode.join(' / ')}`);
    if (task.filterConditions.provision?.length) parts.push(`Provision：${task.filterConditions.provision.join(' / ')}`);
    if (task.filterConditions.ccrConditions) {
      const { conditions, logicalOperator } = task.filterConditions.ccrConditions;
      const ccrParts = conditions.map((cond) => {
        const opLabel = cond.operator === 'gte' ? '>=' : '<=';
        return `${ccrMetricLabels[cond.metric]} ${opLabel}${cond.value}`;
      });
      if (ccrParts.length) parts.push(`CCR：${ccrParts.join(` ${logicalOperator === 'and' ? '且' : '或'} `)}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '未记录筛选摘要';
  };

  const createTaskContent = (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card title="发起新任务" className="scene-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>处理场景</span>
            <Segmented
              value={sceneType}
              onChange={(value) => handleSceneChange(value as SceneType)}
              options={[
                { label: '政策放宽', value: 'relax' },
                { label: '政策收严', value: 'tighten' },
              ]}
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <label>任务名称</label>
              <Input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder={getTaskNameExample()} />
              <div className="field-hint">建议格式：场景-YYYYMMDD-市场-任务目的，例如：{sceneType === 'relax' ? '政策放宽-20260720-US-gambling policy种子清理' : '政策收严-20260720-US-高CCR种子清理'}</div>
            </Col>
            <Col span={12}>
              <label>任务备注</label>
              <Input.TextArea value={taskRemark} onChange={(event) => setTaskRemark(event.target.value)} rows={2} placeholder="说明任务背景、目标市场和操作原因" />
            </Col>
          </Row>
          <Alert
            type={sceneType === 'relax' ? 'success' : 'warning'}
            showIcon
            message={sceneType === 'relax' ? '放宽场景：基于 Policy / Provision / 审核来源圈定可复核种子。' : '收严场景：基于 CCR 指标区间圈定高优先级种子。'}
          />
        </Space>
      </Card>

      <Card title="筛选条件">
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <label>Object ID</label>
              <Input.TextArea
                value={filterConditions.objectId}
                onChange={(event) => updateFilter('objectId', event.target.value)}
                rows={3}
                placeholder="多个 Object ID 可用逗号、空格或换行分隔"
              />
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                <Upload accept=".csv,.txt,.xlsx,.xls" showUploadList={false} beforeUpload={handleObjectIdUpload}>
                  <Button>上传 Object ID 表格</Button>
                </Upload>
                <span style={{ color: '#86868b', fontSize: 12 }}>已导入 {filterConditions.objectIds?.length || 0} 个 Object ID</span>
              </Space>
            </Col>
            <Col span={8}>
              <label>Object Type</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.objectType} onChange={(value) => updateFilter('objectType', value)}>
                  {(Object.entries(objectTypeLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <label>种子类型</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.seedType} onChange={(value) => updateFilter('seedType', value)}>
                  {(Object.entries(seedTypeLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <label>市场</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.country} onChange={(value) => updateFilter('country', value)}>
                  {(Object.entries(countryLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            {sceneType === 'tighten' && (
              <Col span={6}>
                <label>行业</label>
                <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.industry} onChange={(value) => updateFilter('industry', value)}>
                  {(Object.entries(industryLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                </Select>
              </Col>
            )}
            <Col span={sceneType === 'relax' ? 6 : 6}>
              <label>当前种子状态</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.seedStatus} onChange={(value) => updateFilter('seedStatus', value)}>
                  {(Object.entries(seedStatusLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            <Col span={6}>
              <label>审核环节来源</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.auditSource} onChange={(value) => updateFilter('auditSource', value)}>
                  {(Object.entries(auditSourceLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
          </Row>

          {sceneType === 'relax' && (
            <Row gutter={16}>
              <Col span={8}>
                <label>Policy Code</label>
                <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.policyCode} onChange={(value) => updateFilter('policyCode', value)}>
                    {(policyCodes as string[]).map((value: string) => <Select.Option key={value} value={value}>{value}</Select.Option>)}
                </Select>
              </Col>
              <Col span={8}>
                <label>Provision</label>
                <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.provision} onChange={(value) => updateFilter('provision', value)}>
                    {(provisions as string[]).map((value: string) => <Select.Option key={value} value={value}>{value}</Select.Option>)}
                </Select>
              </Col>
            </Row>
          )}

          {sceneType === 'tighten' && (
            <div>
              <div style={{ fontWeight: 700, color: '#1d1d1f', marginBottom: 12 }}>CCR 自定义条件</div>
              <div style={{ marginBottom: 12 }}>
                <Button type="dashed" icon={<PlusCircleOutlined />} onClick={addCcrCondition}>
                  添加条件
                </Button>
              </div>
              {(filterConditions.ccrConditions?.conditions || []).map((condition, index) => (
                <div key={index} className="ccr-condition-row">
                  <Row gutter={8} align="middle">
                    <Col span={2}>
                      <span className="ccr-condition-num">条件{index + 1}</span>
                    </Col>
                    <Col span={5}>
                      <Select
                        style={{ width: '100%' }}
                        value={condition.metric}
                        onChange={(value) => updateCcrCondition(index, 'metric', value as CcrMetricType)}
                      >
                        {(Object.entries(ccrMetricLabels) as Array<[CcrMetricType, string]>).map(([value, label]) => (
                          <Select.Option key={value} value={value}>{label}</Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Select
                        style={{ width: '100%' }}
                        value={condition.operator}
                        onChange={(value) => updateCcrCondition(index, 'operator', value as CcrOperator)}
                      >
                        <Select.Option value="gte">大于等于</Select.Option>
                        <Select.Option value="lte">小于等于</Select.Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={condition.value}
                        onChange={(event) => updateCcrCondition(index, 'value', Number(event.target.value))}
                      />
                    </Col>
                    <Col span={2}>
                      <Button type="text" danger onClick={() => removeCcrCondition(index)}>删除</Button>
                    </Col>
                  </Row>
                </div>
              ))}
              {(filterConditions.ccrConditions?.conditions || []).length >= 2 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <span style={{ marginRight: 8, color: '#64748b' }}>条件关系：</span>
                  <Segmented
                    value={filterConditions.ccrConditions?.logicalOperator || 'and'}
                    onChange={(value) => updateLogicalOperator(value as LogicalOperator)}
                    options={[
                      { value: 'and', label: '全部满足 (AND)' },
                      { value: 'or', label: '任一满足 (OR)' },
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setFilterConditions({}); setPreviewSeeds([]); setCreatedTaskId(''); }}>重置条件</Button>
            <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleCreateSeedTask}>生成种子筛选任务</Button>
          </div>
        </Space>
      </Card>

      {createdTaskId && (
        <Card>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="success"
              showIcon
              message={`任务已创建：${createdTaskId}`}
              description="任务发起不需要审批，已进入任务中心的“待执行模型”节点。"
            />
            <div>
              <span style={{ color: '#64748b' }}>筛选种子数量：</span>
              <span style={{ fontWeight: 800, fontSize: 24, color: '#1d1d1f' }}>{previewSeeds.length}</span>
            </div>
            <Table
              rowKey="id"
              dataSource={paginatedPreviewSeeds}
              columns={getSeedColumns(false)}
              scroll={{ x: 1200 }}
              pagination={{ current: currentPage, pageSize, total: previewSeeds.length, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
              onChange={(pagination) => { setCurrentPage(pagination.current || 1); setPageSize(pagination.pageSize || 10); }}
            />
          </Space>
        </Card>
      )}
    </Space>
  );

  const taskCenterContent = (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={5}><Card className="stat-card"><Statistic title="任务总数" value={taskStats.total} /></Card></Col>
        <Col span={5}><Card className="stat-card"><Statistic title="待执行模型" value={taskStats.pendingModel} /></Card></Col>
        <Col span={5}><Card className="stat-card"><Statistic title="模型执行中" value={taskStats.running} /></Card></Col>
        <Col span={5}><Card className="stat-card"><Statistic title="待审批确认" value={taskStats.pendingApproval} /></Card></Col>
        <Col span={4}><Card className="stat-card"><Statistic title="待清理" value={taskStats.pendingClean} /></Card></Col>
      </Row>

      <Card title="查找任务">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <label>场景</label>
            <Select allowClear style={{ width: '100%' }} value={taskFilters.sceneType} onChange={(value) => setTaskFilters((prev: TaskFilters) => ({ ...prev, sceneType: value as SceneType | undefined }))}>
              <Select.Option value="relax">政策放宽</Select.Option>
              <Select.Option value="tighten">政策收严</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <label>任务 ID</label>
            <Input value={taskFilters.taskId} onChange={(event) => setTaskFilters((prev: TaskFilters) => ({ ...prev, taskId: event.target.value }))} placeholder="输入 Task ID" />
          </Col>
          <Col span={6}>
            <label>市场</label>
            <Select mode="multiple" style={{ width: '100%' }} value={taskFilters.market} onChange={(value) => setTaskFilters((prev: TaskFilters) => ({ ...prev, market: value as string[] }))}>
              {(Object.entries(countryLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <label>Object Type</label>
            <Select mode="multiple" style={{ width: '100%' }} value={taskFilters.objectType} onChange={(value) => setTaskFilters((prev: TaskFilters) => ({ ...prev, objectType: value as string[] }))}>
              {(Object.entries(objectTypeLabels) as Array<[string, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <label>流程节点</label>
            <Select allowClear style={{ width: '100%' }} value={taskFilters.taskStatus} onChange={(value) => setTaskFilters((prev: TaskFilters) => ({ ...prev, taskStatus: value as TaskStatus | undefined }))}>
              <Select.Option value="pending_model">待执行模型</Select.Option>
              <Select.Option value="model_executing">模型执行中</Select.Option>
              <Select.Option value="model_completed">模型执行完毕，待审批确认</Select.Option>
              <Select.Option value="approval_approved">审批通过，待清理</Select.Option>
              <Select.Option value="approval_rejected">审批拒绝，终止</Select.Option>
              <Select.Option value="disposal_completed">处置完毕</Select.Option>
              <Select.Option value="abandoned">废弃</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <label>创建时间开始</label>
            <Input type="date" value={taskFilters.createdStart} onChange={(event) => setTaskFilters((prev: TaskFilters) => ({ ...prev, createdStart: event.target.value }))} />
          </Col>
            <Col span={6}>
              <label>创建时间结束</label>
              <Input type="date" value={taskFilters.createdEnd} onChange={(event) => setTaskFilters((prev: TaskFilters) => ({ ...prev, createdEnd: event.target.value }))} />
            </Col>
            <Col span={12} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8 }}>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearchTasks}>搜索</Button>
              <Button onClick={handleResetTaskFilters}>重置</Button>
            </Col>
          </Row>
        </Card>

        <Card
          title={(
            <Space>
              <span>任务列表</span>
              <Button icon={<PlayCircleOutlined />} onClick={() => openExecutionDrawer(selectedTaskRowKeys)}>批量执行模型</Button>
              <Button icon={<DeleteOutlined />} onClick={() => handleCleanTasks(selectedTaskRowKeys)}>批量清理种子</Button>
            </Space>
          )}
        >
          <div className="task-list-note">
            {isTaskFilterApplied ? `已展示筛选后的任务列表，共 ${taskRows.length} 个任务。` : `未提交筛选条件，当前按创建时间倒排展示全部 ${taskRows.length} 个任务。`}
          </div>
          <Table
            rowKey="id"
            dataSource={taskRows}
            rowSelection={{ selectedRowKeys: selectedTaskRowKeys, onChange: (keys) => setSelectedTaskRowKeys(keys.map(String)) }}
            pagination={{ pageSize: 8, showTotal: (total) => `共 ${total} 个任务` }}
            columns={[
              {
                title: '任务信息',
                key: 'task',
                render: (_, record: Task) => (
                  <div>
                    <div style={{ fontWeight: 700, color: '#1d1d1f' }}>{record.name}</div>
                    <div style={{ color: '#86868b', fontSize: 12, marginTop: 4 }}>{record.id}</div>
                    <div style={{ color: '#6e6e73', fontSize: 12, marginTop: 4 }}>{taskFilterSummary(record)}</div>
                  </div>
                ),
              },
              { title: '场景', dataIndex: 'sceneType', key: 'sceneType', width: 120, render: (value: SceneType) => renderScene(value) },
              { title: '种子数', dataIndex: 'seedCount', key: 'seedCount', width: 100 },
              { title: '提交人', key: 'submitter', width: 110, render: (_, record: Task) => getTaskSubmitter(record) },
              { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
              { title: '流程节点', dataIndex: 'status', key: 'status', width: 190, render: (value: TaskStatus) => renderTaskStatus(value) },
              {
                title: '模型结果',
                key: 'modelStats',
                width: 190,
                render: (_, record: Task) => record.modelResultStats
                  ? <span>建议清除 {record.modelResultStats.suggestClear} / 建议保留 {record.modelResultStats.suggestKeep}</span>
                  : <span style={{ color: '#86868b' }}>未执行</span>,
              },
              {
                title: '操作',
                key: 'action',
                width: 260,
                fixed: 'right',
                render: (_, record: Task) => (
                  <Space wrap>
                    <Button size="small" onClick={() => { setSelectedTask(record); setShowTaskDetail(true); }}>详情</Button>
                    {record.status === 'pending_model' && <Button size="small" type="primary" onClick={() => openExecutionDrawer([record.id])}>执行模型</Button>}
                    {record.status === 'model_completed' && (
                      <>
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => updateTaskStatus([record.id], 'approval_approved', '审批已通过，任务进入待清理')}>
                          审批通过
                        </Button>
                        <Button size="small" danger onClick={() => updateTaskStatus([record.id], 'approval_rejected', '审批已拒绝，任务终止')}>拒绝</Button>
                      </>
                    )}
                    {record.status === 'approval_approved' && <Button size="small" type="primary" icon={<DeleteOutlined />} onClick={() => handleCleanTasks([record.id])}>清理</Button>}
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider width={260} theme="light">
        <div style={{ padding: '24px 20px 16px' }}>
          <div className="page-title">结果库批量处理工作台</div>
          <div style={{ color: '#6e6e73', fontSize: 13, marginTop: 8 }}>
            发起任务、模型执行、审批确认、清理处置集中管理。
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentNav]}
          onClick={(item) => setCurrentNav(item.key as NavKey)}
          items={[
            { key: 'createTask', icon: <PlusCircleOutlined />, label: '发起新任务' },
            { key: 'taskCenter', icon: <SearchOutlined />, label: '任务中心' },
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="header-title">{currentNav === 'createTask' ? '发起新任务' : '任务中心'}</div>
          <Button icon={<QuestionCircleOutlined />} onClick={() => Modal.info({
            title: 'User Guide',
            width: 880,
            content: (
              <div className="guide-panel">
                <div className="guide-hero">
                  <div>
                    <div className="guide-eyebrow">Policy Iteration Workflow</div>
                    <div className="guide-title">素材结果种子清理流程</div>
                    <div className="guide-desc">
                      在政策迭代场景中，历史已经入库的素材/创意结果种子可能不再符合新的策略边界。工具用于筛选、模型复核和清理此前入库结果，避免后续机审错误复用旧结果，造成漏放或误伤。
                    </div>
                  </div>
                  <div className="guide-badge">6 个操作步骤</div>
                </div>
                <div className="guide-flow">
                  <span>发起任务</span>
                  <span>执行模型</span>
                  <span>审批确认</span>
                  <span>清理处置</span>
                </div>
                <Row gutter={[12, 12]}>
                  {[
                    ['1', '选择场景', '先判断本次策略变化是政策放宽还是政策收严。放宽通常关注历史拒绝结果是否需要移除；收严通常关注高风险 CCR 种子是否需要置为无效。'],
                    ['2', '配置筛选条件', '按市场、Object Type、种子状态等条件圈定范围。收严场景支持 P0/P1 及二级 CCR 区间平铺输入，放宽场景支持审核来源、Policy、Provision。'],
                    ['3', '生成 Task ID', '点击生成种子筛选任务后形成一条任务记录。任务发起不需要审批，并立即进入任务中心的“待执行模型”节点。'],
                    ['4', '预览种子与详情', '生成任务后展示种子列表，可预览图片、视频、文本和 Link，并可打开右侧详情查看 Object 信息、模型结果和 BI Troubleshooting 跳转。'],
                    ['5', '执行模型', '在任务中心勾选单个或多个“待执行模型”任务，打开抽屉选择 Hermes / Workflow 和 Tag ID，提交后进入“模型执行中”。'],
                    ['6', '审批确认与清理', '模型返回后进入“模型执行完毕，待审批确认”。审批通过后进入“审批通过，待清理”，可触发清理并将种子置为无效；审批拒绝则任务终止。'],
                  ].map(([step, title, desc]) => (
                    <Col span={12} key={step}>
                      <div className="guide-step-card">
                        <div className="guide-step-number">{step}</div>
                        <div>
                          <div className="guide-step-title">{title}</div>
                          <div className="guide-step-desc">{desc}</div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          })}
          >
            User Guide
          </Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          {currentNav === 'createTask' ? createTaskContent : taskCenterContent}
        </Layout.Content>
      </Layout>

      <Drawer title="执行模型" open={executionDrawerOpen} width={620} onClose={() => setExecutionDrawerOpen(false)}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert type="info" showIcon message={`已选择 ${executionTaskIds.length} 个任务`} description={executionTaskIds.join(' / ')} />
          <div>
            <label>执行能力</label>
            <Select
              style={{ width: '100%' }}
              value={executionConfig.capability || undefined}
                onChange={(value) => setExecutionConfig((prev: ExecutionConfig) => ({ ...prev, capability: value as ExecutionCapability, tagId: '' }))}
              placeholder="请选择 Hermes 或 Workflow"
            >
                {(Object.entries(capabilityLabels) as Array<[ExecutionCapability, string]>).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
            </Select>
          </div>
          <div>
            <label>{executionConfig.capability === 'workflow' ? 'Workflow Tag ID' : 'Hermes Tag ID'}</label>
            <Select
              style={{ width: '100%' }}
              value={executionConfig.tagId || undefined}
                onChange={(value) => setExecutionConfig((prev: ExecutionConfig) => ({ ...prev, tagId: value as string }))}
              placeholder="请选择 Tag"
            >
              {availableTags.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </div>
          <div>
            <label>执行说明</label>
            <Input.TextArea
              value={executionConfig.description}
                onChange={(event) => setExecutionConfig((prev: ExecutionConfig) => ({ ...prev, description: event.target.value }))}
              rows={3}
              placeholder="补充本次执行模型的策略、范围和注意事项"
            />
          </div>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunModel}>提交执行</Button>
        </Space>
      </Drawer>

      <Drawer title="任务详情" open={showTaskDetail} width={860} onClose={() => setShowTaskDetail(false)}>
        {selectedTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务名称" span={2}>{selectedTask.name}</Descriptions.Item>
              <Descriptions.Item label="Task ID">{selectedTask.id}</Descriptions.Item>
              <Descriptions.Item label="流程节点">{renderTaskStatus(selectedTask.status)}</Descriptions.Item>
              <Descriptions.Item label="场景">{renderScene(selectedTask.sceneType)}</Descriptions.Item>
              <Descriptions.Item label="种子数量">{selectedTask.seedCount}</Descriptions.Item>
              <Descriptions.Item label="提交人">{getTaskSubmitter(selectedTask)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedTask.createdAt}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{selectedTask.updatedAt}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{selectedTask.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="筛选摘要" span={2}>{taskFilterSummary(selectedTask)}</Descriptions.Item>
            </Descriptions>
            {selectedTask.status === 'pending_model' && <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => openExecutionDrawer([selectedTask.id])}>执行模型</Button>}
            {selectedTask.status === 'model_completed' && (
              <Space>
                <Button type="primary" onClick={() => updateTaskStatus([selectedTask.id], 'approval_approved', '审批已通过，任务进入待清理')}>审批通过</Button>
                <Button danger onClick={() => updateTaskStatus([selectedTask.id], 'approval_rejected', '审批已拒绝，任务终止')}>审批拒绝</Button>
              </Space>
            )}
            {selectedTask.status === 'approval_approved' && <Button type="primary" icon={<DeleteOutlined />} onClick={() => handleCleanTasks([selectedTask.id])}>清理种子</Button>}
            <Card size="small" title="任务种子">
              <Table rowKey="id" dataSource={detailTaskSeeds} columns={getSeedColumns(selectedTask.status !== 'pending_model')} scroll={{ x: 1200 }} pagination={{ pageSize: 5 }} />
            </Card>
          </Space>
        )}
      </Drawer>

      <Drawer title="种子详情" open={showSeedDetail} width={720} onClose={() => setShowSeedDetail(false)}>
        {detailSeed && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {renderSeedPreview(detailSeed)}
            <Descriptions bordered column={2}>
              <Descriptions.Item label="种子 ID">{detailSeed.id}</Descriptions.Item>
              <Descriptions.Item label="Object ID">{detailSeed.objectId}</Descriptions.Item>
              <Descriptions.Item label="Object Type">{objectTypeLabels[detailSeed.objectType]}</Descriptions.Item>
              <Descriptions.Item label="种子类型">{seedTypeLabels[detailSeed.seedType]}</Descriptions.Item>
              <Descriptions.Item label="市场">{countryLabels[detailSeed.country]}</Descriptions.Item>
              <Descriptions.Item label="行业">{industryLabels[detailSeed.industry]}</Descriptions.Item>
              <Descriptions.Item label="审核来源">{auditSourceLabels[detailSeed.auditSource]}</Descriptions.Item>
              <Descriptions.Item label="当前状态">{seedStatusLabels[detailSeed.seedStatus]}</Descriptions.Item>
              <Descriptions.Item label="CCR">{Math.round(detailSeed.ccr * 100)}%</Descriptions.Item>
              {showSeedModelResult && (
                <>
                  <Descriptions.Item label="模型结论">{renderModelConclusion(detailSeed.modelResult?.conclusion)}</Descriptions.Item>
                  <Descriptions.Item label="模型原因" span={2}>{detailSeed.modelResult?.reason || '-'}</Descriptions.Item>
                </>
              )}
            </Descriptions>
            <Button
              type="primary"
              href={`https://bi.bytedance.net/troubleshooting?object_id=${detailSeed.objectId}`}
              target="_blank"
              rel="noreferrer"
              icon={<InfoCircleOutlined />}
            >
              跳转 BI Troubleshooting
            </Button>
          </Space>
        )}
      </Drawer>
    </Layout>
  );
}

export default App;

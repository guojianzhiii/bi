import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
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
  DeleteOutlined,
  EyeOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type * as Types from './types.ts';
import * as MockData from './mockData.ts';
const { Panel } = Collapse;

type NavKey = 'taskCenter' | 'createTask' | 'executeModel' | 'disposeSeeds';
type ValidConclusion = 'suggest_clear' | 'suggest_keep';

type ApprovalRequest = Types.ApprovalRequest;
type BatchApproval = Types.BatchApproval;
type CCRArea = Types.CCRArea;
type ExecutionCapability = Types.ExecutionCapability;
type ExecutionConfig = Types.ExecutionConfig;
type FilterCondition = Types.FilterCondition;
type ModelConclusion = Types.ModelConclusion;
type OperationLog = Types.OperationLog;
type SceneType = Types.SceneType;
type Seed = Types.Seed;
type Task = Types.Task;
type TaskStatus = Types.TaskStatus;

const {
  approvalStatusLabels,
  auditSourceLabels,
  batchApprovalStatusLabels,
  capabilityLabels,
  ccrAreaLabels,
  countryLabels,
  deliveryStatusLabels,
  hermesTags,
  industryLabels,
  mockTasks,
  modelConclusionLabels,
  objectTypeLabels,
  policyCodes,
  provisions,
  secondaryCCRLabels,
  seeds: initialSeeds,
  seedStatusLabels,
  seedTypeLabels,
  taskStatusLabels,
  workflowTags,
} = MockData;

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

function generateMockModelResult(): Seed['modelResult'] {
  const conclusions: ValidConclusion[] = ['suggest_clear', 'suggest_keep'];
  const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
  const hitTags: Record<ValidConclusion, string[]> = {
    suggest_clear: ['policy_relax_appeal_pass', 'risk_level_decreased', 'compliance_requirement_removed'],
    suggest_keep: ['critical_risk_confirmed', 'risk_level_increased', 'new_policy_violation'],
  };
  const reasons: Record<ValidConclusion, string[]> = {
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

  return {
    conclusion,
    confidence: Math.round((Math.random() * 20 + 75)) / 100,
    hitTag: hitTags[conclusion][Math.floor(Math.random() * hitTags[conclusion].length)],
    reason: reasons[conclusion][Math.floor(Math.random() * reasons[conclusion].length)],
    suggestClear: conclusion === 'suggest_clear',
  };
}

function App() {
  const [seeds, setSeeds] = useState<Seed[]>(initialSeeds);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [currentNav, setCurrentNav] = useState<NavKey>('taskCenter');
  const [sceneType, setSceneType] = useState<SceneType>('relax');
  const [taskName, setTaskName] = useState('');
  const [taskRemark, setTaskRemark] = useState('');
  const [filterConditions, setFilterConditions] = useState<FilterCondition>({});
  const [generatedBatchSeeds, setGeneratedBatchSeeds] = useState<Seed[]>([]);
  const [isBatchGenerated, setIsBatchGenerated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [detailSeed, setDetailSeed] = useState<Seed | null>(null);
  const [showSeedDetail, setShowSeedDetail] = useState(false);
  const [showBatchApprovalModal, setShowBatchApprovalModal] = useState(false);
  const [batchApprovalReason, setBatchApprovalReason] = useState('');
  const [currentBatchApproval, setCurrentBatchApproval] = useState<BatchApproval | null>(null);
  const [selectedExecuteTaskId, setSelectedExecuteTaskId] = useState('');
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    capability: null,
    tagId: '',
    description: '',
    onlySelected: false,
    batchName: '',
  });
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [currentDisposalTask, setCurrentDisposalTask] = useState<Task | null>(null);
  const [disposalReason, setDisposalReason] = useState('');

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
    if (filterConditions.materialId?.length) {
      result = result.filter((seed) => filterConditions.materialId?.includes(seed.materialId || ''));
    }
    if (filterConditions.creativeId?.length) {
      result = result.filter((seed) => filterConditions.creativeId?.includes(seed.creativeId || ''));
    }
    if (filterConditions.country?.length) {
      result = result.filter((seed) => filterConditions.country?.includes(seed.country));
    }
    if (filterConditions.industry?.length) {
      result = result.filter((seed) => filterConditions.industry?.includes(seed.industry));
    }
    if (filterConditions.auditSource?.length) {
      result = result.filter((seed) => filterConditions.auditSource?.includes(seed.auditSource));
    }
    if (filterConditions.policyCode?.length) {
      result = result.filter((seed) => filterConditions.policyCode?.includes(seed.policyCode));
    }
    if (filterConditions.provision?.length) {
      result = result.filter((seed) => filterConditions.provision?.includes(seed.provision));
    }
    if (filterConditions.deliveryStatus?.length) {
      result = result.filter((seed) => filterConditions.deliveryStatus?.includes(seed.deliveryStatus));
    }
    if (filterConditions.seedStatus?.length) {
      result = result.filter((seed) => filterConditions.seedStatus?.includes(seed.seedStatus));
    }
    if (filterConditions.executionStatus?.length) {
      result = result.filter((seed) => filterConditions.executionStatus?.includes(seed.executionStatus));
    }
    if (filterConditions.modelConclusion?.length) {
      result = result.filter((seed) => filterConditions.modelConclusion?.includes(seed.modelResult?.conclusion || 'no_result'));
    }
    if (filterConditions.p0CCRArea?.length) {
      result = result.filter((seed) => {
        if (seed.adLevel !== 'P0') return false;
        return filterConditions.p0CCRArea?.some((area) => (area === 'above_market' ? seed.ccr >= 0.5 : seed.ccr < 0.5));
      });
    }
    if (filterConditions.p1CCRArea?.length) {
      result = result.filter((seed) => {
        if (seed.adLevel !== 'P1') return false;
        return filterConditions.p1CCRArea?.some((area) => (area === 'above_market' ? seed.ccr >= 0.5 : seed.ccr < 0.5));
      });
    }
    if (filterConditions.secondaryCCR?.length) {
      result = result.filter((seed) =>
        seed.secondaryCCRs.some((ccr) => filterConditions.secondaryCCR?.includes(ccr.type)),
      );
    }

    return result;
  }, [seeds, filterConditions]);

  const visibleSeeds = isBatchGenerated ? generatedBatchSeeds : [];
  const paginatedSeeds = visibleSeeds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.batchApproval?.status === 'pending_review').length,
      approved: tasks.filter((task) => task.batchApproval?.status === 'approved').length,
      completed: tasks.filter((task) => task.status === 'disposal_completed').length,
    };
  }, [tasks]);

  const availableTags = executionConfig.capability === 'hermes'
    ? hermesTags.filter((item) => item.scene === sceneType || item.scene === 'both')
    : workflowTags.filter((item) => item.scene === sceneType || item.scene === 'both');

  const getTaskNameExample = () => {
    const sceneLabel = sceneType === 'relax' ? '政策放宽' : '政策收严';
    const market = filterConditions.country?.[0] || 'US';
    const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${sceneLabel}-${dateLabel}-${market}-种子处理`;
  };

  const validateTaskMeta = () => {
    const sceneKeyword = sceneType === 'relax' ? '放宽' : '收严';
    const hasScene = taskName.includes(sceneKeyword) || taskName.includes(sceneType === 'relax' ? '政策放宽' : '政策收严');
    const hasDate = /\d{4}[-/]?\d{2}[-/]?\d{2}|\d{8}/.test(taskName);
    const selectedMarkets = filterConditions.country || [];
    const hasMarket = selectedMarkets.length === 0
      || selectedMarkets.some((country) => taskName.includes(country) || taskName.includes(countryLabels[country]));

    if (!taskName.trim()) {
      message.warning('请填写任务名称');
      return false;
    }
    if (!taskRemark.trim()) {
      message.warning('请填写任务备注');
      return false;
    }
    if (!hasScene || !hasDate || !hasMarket) {
      message.warning(`任务名称需包含场景、日期和市场，例如：${getTaskNameExample()}`);
      return false;
    }
    return true;
  };

  const resetGeneration = () => {
    setIsBatchGenerated(false);
    setGeneratedBatchSeeds([]);
    setCurrentPage(1);
  };

  const updateFilter = <K extends keyof FilterCondition>(key: K, value: FilterCondition[K]) => {
    setFilterConditions((prev) => ({ ...prev, [key]: value }));
    resetGeneration();
  };

  const handleSceneChange = (value: SceneType) => {
    setSceneType(value);
    setFilterConditions({});
    setTaskName('');
    setTaskRemark('');
    setSelectedExecuteTaskId('');
    resetGeneration();
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

  const handleResetFilter = () => {
    setFilterConditions({});
    setTaskName('');
    setTaskRemark('');
    resetGeneration();
  };

  const handleSaveFilter = () => {
    message.success('筛选条件已暂存');
  };

  const handleGenerateBatch = () => {
    if (!validateTaskMeta()) return;
    const activeSeeds = filteredSeeds.filter((seed) => seed.seedStatus === 'active');
    if (activeSeeds.length === 0) {
      message.warning('当前条件下没有可处理的生效中种子');
      return;
    }
    setGeneratedBatchSeeds(activeSeeds);
    setIsBatchGenerated(true);
    setCurrentPage(1);
    message.success(`已生成筛选结果，共 ${activeSeeds.length} 条生效中种子`);
  };

  const handleSubmitBatchApproval = () => {
    if (!isBatchGenerated || generatedBatchSeeds.length === 0) {
      message.warning('请先生成筛选结果');
      return;
    }
    if (!validateTaskMeta()) return;

    setCurrentBatchApproval({
      id: generateId('batch_approval'),
      sceneType,
      seedCount: generatedBatchSeeds.length,
      seedIds: generatedBatchSeeds.map((seed) => seed.id),
      taskName: taskName.trim(),
      taskRemark: taskRemark.trim(),
      filterConditions: { ...filterConditions },
      status: 'unsubmitted',
      reason: '',
      createdAt: formatDate(new Date()),
    });
    setBatchApprovalReason('');
    setShowBatchApprovalModal(true);
  };

  const handleConfirmBatchApproval = () => {
    if (!currentBatchApproval || !batchApprovalReason.trim()) {
      message.warning('请填写量级审批原因');
      return;
    }

    const nextApproval: BatchApproval = {
      ...currentBatchApproval,
      status: 'pending_review',
      reason: batchApprovalReason.trim(),
    };

    const nextTask: Task = {
      id: generateId('task'),
      name: currentBatchApproval.taskName || taskName.trim(),
      remark: currentBatchApproval.taskRemark || taskRemark.trim(),
      sceneType,
      status: 'pending_approval',
      seedCount: currentBatchApproval.seedCount,
      seedIds: currentBatchApproval.seedIds,
      filterConditions: { ...filterConditions },
      createdAt: formatDate(new Date()),
      updatedAt: formatDate(new Date()),
      batchApproval: nextApproval,
    };

    setTasks((prev) => [nextTask, ...prev]);
    setShowBatchApprovalModal(false);
    setCurrentBatchApproval(null);
    message.success('任务已发起，等待量级审批');
  };

  const handleApproveBatch = (approvalId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.batchApproval?.id !== approvalId) return task;
        return {
          ...task,
          updatedAt: formatDate(new Date()),
          batchApproval: {
            ...task.batchApproval,
            status: 'approved',
            approvedBy: '运营 Leader',
            approvedAt: formatDate(new Date()),
          },
        };
      }),
    );
    message.success('量级审批已通过');
  };

  const handleRejectBatch = (approvalId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.batchApproval?.id !== approvalId) return task;
        return {
          ...task,
          status: 'abandoned',
          updatedAt: formatDate(new Date()),
          batchApproval: {
            ...task.batchApproval,
            status: 'rejected',
            approvedBy: '运营 Leader',
            approvedAt: formatDate(new Date()),
            rejectReason: '审批未通过',
          },
        };
      }),
    );
    message.success('任务已拒绝');
  };

  const handleExecuteTaskModel = () => {
    const task = tasks.find((item) => item.id === selectedExecuteTaskId);
    if (!task) {
      message.warning('请先选择要执行模型的任务');
      return;
    }
    if (task.batchApproval?.status !== 'approved') {
      message.warning('该任务尚未通过量级审批');
      return;
    }
    if (!executionConfig.capability || !executionConfig.tagId) {
      message.warning('请先选择执行能力和 Tag');
      return;
    }

    const targetSeedIds = task.seedIds || [];
    const modelResults = new Map<string, Seed['modelResult']>();
    let suggestClear = 0;
    let suggestKeep = 0;
    targetSeedIds.forEach((seedId) => {
      const result = generateMockModelResult();
      modelResults.set(seedId, result);
      if (result.conclusion === 'suggest_clear') suggestClear += 1;
      if (result.conclusion === 'suggest_keep') suggestKeep += 1;
    });

    setSeeds((prev) =>
      prev.map((seed) => {
        const modelResult = modelResults.get(seed.id);
        if (!modelResult) return seed;
        const newLog: OperationLog = {
          id: generateId('log'),
          time: formatDate(new Date()),
          action: '任务批次模型执行',
          operator: 'operator',
          detail: `${task.name} / ${capabilityLabels[executionConfig.capability!]} - ${executionConfig.tagId}`,
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
      }),
    );

    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== task.id) return item;
        return {
          ...item,
          status: 'model_completed',
          updatedAt: formatDate(new Date()),
          executionConfig: { ...executionConfig, batchName: item.name },
          modelResultStats: {
            suggestClear,
            suggestKeep,
          },
        };
      }),
    );
    setExecutionConfig((prev) => ({ ...prev, description: '', onlySelected: false }));
    message.success('模型执行完成');
  };

  const openDisposalModal = (task: Task) => {
    setCurrentDisposalTask(task);
    setDisposalReason('');
    setShowDisposalModal(true);
  };

  const handleSubmitDisposalApproval = () => {
    if (!currentDisposalTask || !disposalReason.trim()) {
      message.warning('请填写处置审批原因');
      return;
    }

    const targetSeeds = seeds.filter((seed) => currentDisposalTask.seedIds?.includes(seed.id));
    const clearSuggestedCount = targetSeeds.filter((seed) => seed.modelResult?.conclusion === 'suggest_clear').length;
    const keepSuggestedCount = targetSeeds.filter((seed) => seed.modelResult?.conclusion === 'suggest_keep').length;

    const approval: ApprovalRequest = {
      id: generateId('approval'),
      batchId: currentDisposalTask.id,
      seedIds: currentDisposalTask.seedIds || [],
      reason: disposalReason.trim(),
      sceneType: currentDisposalTask.sceneType,
      totalCount: targetSeeds.length,
      clearSuggestedCount,
      keepSuggestedCount,
      status: 'pending',
      feishuApprovalUrl: 'https://bytedance.larkoffice.com',
      createdAt: formatDate(new Date()),
    };

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== currentDisposalTask.id) return task;
        return {
          ...task,
          status: 'disposal_pending',
          updatedAt: formatDate(new Date()),
          disposalApproval: approval,
        };
      }),
    );
    setShowDisposalModal(false);
    message.success('已提交处置审批');
  };

  const handleApproveDisposal = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task?.disposalApproval) return;

    const shouldDispose = (conclusion?: ModelConclusion) => {
      if (task.sceneType === 'relax') return conclusion === 'suggest_clear';
      return conclusion === 'suggest_keep';
    };

    setSeeds((prev) =>
      prev.map((seed) => {
        if (!task.seedIds?.includes(seed.id) || !shouldDispose(seed.modelResult?.conclusion)) return seed;
        const newLog: OperationLog = {
          id: generateId('log'),
          time: formatDate(new Date()),
          action: '审批通过后自动处置',
          operator: 'system',
          detail: task.sceneType === 'relax' ? '模型建议清除，移除种子结果' : '模型建议保留，收严场景下剔除种子结果',
        };
        return {
          ...seed,
          seedStatus: 'cleared',
          clearedAt: formatDate(new Date()),
          updatedAt: formatDate(new Date()),
          operationLogs: [...seed.operationLogs, newLog],
        };
      }),
    );

    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== taskId || !item.disposalApproval) return item;
        return {
          ...item,
          status: 'disposal_completed',
          updatedAt: formatDate(new Date()),
          disposalApproval: {
            ...item.disposalApproval,
            status: 'approved',
            approvedBy: '运营 Leader',
            approvedAt: formatDate(new Date()),
          },
        };
      }),
    );
    message.success('处置审批已通过，并已自动处置对应种子');
  };

  const handleTableChange: TableProps<Seed>['onChange'] = (pagination) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  const renderTaskStatus = (status: TaskStatus) => {
    const colorMap: Record<TaskStatus, string> = {
      draft: 'default',
      pending_approval: 'orange',
      model_executing: 'blue',
      model_completed: 'purple',
      disposal_pending: 'gold',
      disposal_completed: 'green',
      abandoned: 'default',
    };
    return <Tag color={colorMap[status]}>{taskStatusLabels[status]}</Tag>;
  };

  const renderScene = (scene: SceneType) => (
    <Tag color={scene === 'relax' ? 'green' : 'orange'}>
      {scene === 'relax' ? '政策放宽' : '政策收严'}
    </Tag>
  );

  const renderExecutionStatus = (status: Seed['executionStatus']) => {
    if (status === 'success') return <Badge status="success" text="执行成功" />;
    if (status === 'failed') return <Badge status="error" text="执行失败" />;
    if (status === 'executing') return <Badge status="processing" text="执行中" />;
    return <Badge status="default" text="未执行" />;
  };

  const renderModelConclusion = (conclusion?: ModelConclusion) => {
    if (!conclusion) return '-';
    const className =
      conclusion === 'suggest_clear'
        ? 'tag-suggest-clear'
        : conclusion === 'suggest_keep'
          ? 'tag-suggest-keep'
          : 'tag-no-result';
    return <Tag className={className}>{modelConclusionLabels[conclusion]}</Tag>;
  };

  const seedColumns: TableProps<Seed>['columns'] = [
    { title: '种子 ID', dataIndex: 'id', key: 'id', width: 150 },
    { title: 'Object ID', dataIndex: 'objectId', key: 'objectId', width: 160 },
    {
      title: '种子类型',
      dataIndex: 'seedType',
      key: 'seedType',
      width: 100,
      render: (value: Seed['seedType']) => seedTypeLabels[value],
    },
    {
      title: '国家/地区',
      dataIndex: 'country',
      key: 'country',
      width: 110,
      render: (value: Seed['country']) => countryLabels[value],
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 110,
      render: (value: Seed['industry']) => industryLabels[value],
    },
    {
      title: '审核来源',
      dataIndex: 'auditSource',
      key: 'auditSource',
      width: 110,
      render: (value: Seed['auditSource']) => auditSourceLabels[value],
    },
    { title: 'Policy', dataIndex: 'policyCode', key: 'policyCode', width: 120 },
    { title: 'Provision', dataIndex: 'provision', key: 'provision', width: 100 },
    {
      title: '执行状态',
      dataIndex: 'executionStatus',
      key: 'executionStatus',
      width: 120,
      render: (value: Seed['executionStatus']) => renderExecutionStatus(value),
    },
    {
      title: '模型结论',
      dataIndex: 'modelResult',
      key: 'modelResult',
      width: 120,
      render: (value: Seed['modelResult']) => renderModelConclusion(value?.conclusion),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_value, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => { setDetailSeed(record); setShowSeedDetail(true); }}>
          详情
        </Button>
      ),
    },
  ];

  const taskFilterSummary = (task: Task) => {
    const parts: string[] = [];
    if (task.filterConditions.country?.length) parts.push(`市场：${task.filterConditions.country.map((item) => countryLabels[item]).join(' / ')}`);
    if (task.filterConditions.policyCode?.length) parts.push(`Policy：${task.filterConditions.policyCode.join(' / ')}`);
    if (task.filterConditions.provision?.length) parts.push(`Provision：${task.filterConditions.provision.join(' / ')}`);
    if (task.filterConditions.secondaryCCR?.length) parts.push(`CCR：${task.filterConditions.secondaryCCR.map((item) => secondaryCCRLabels[item]).join(' / ')}`);
    if (task.filterConditions.auditSource?.length) parts.push(`审核来源：${task.filterConditions.auditSource.map((item) => auditSourceLabels[item]).join(' / ')}`);
    return parts.length > 0 ? parts.join(' | ') : '未记录筛选摘要';
  };

  const taskCenterContent = (
    <>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card className="stat-card"><Statistic title="任务总数" value={taskStats.total} /></Card></Col>
        <Col span={6}><Card className="stat-card"><Statistic title="审批中" value={taskStats.pending} /></Card></Col>
        <Col span={6}><Card className="stat-card"><Statistic title="可执行任务" value={taskStats.approved} /></Card></Col>
        <Col span={6}><Card className="stat-card"><Statistic title="已处置完成" value={taskStats.completed} /></Card></Col>
      </Row>

      <Card title="任务中心">
        <Table
          rowKey="id"
          dataSource={tasks}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '任务名称', dataIndex: 'name', key: 'name' },
            {
              title: '场景',
              dataIndex: 'sceneType',
              key: 'sceneType',
              render: (value: SceneType) => renderScene(value),
            },
            { title: '种子数', dataIndex: 'seedCount', key: 'seedCount', width: 100 },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              width: 160,
              render: (value: TaskStatus) => renderTaskStatus(value),
            },
            {
              title: '审批状态',
              key: 'approval',
              width: 140,
              render: (_, record: Task) => record.batchApproval
                ? <Tag color={record.batchApproval.status === 'approved' ? 'green' : record.batchApproval.status === 'pending_review' ? 'gold' : 'default'}>{batchApprovalStatusLabels[record.batchApproval.status]}</Tag>
                : <Tag>未提交</Tag>,
            },
            { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
            {
              title: '操作',
              key: 'action',
              width: 120,
              render: (_, record: Task) => (
                <Button type="link" onClick={() => { setSelectedTask(record); setShowTaskDetail(true); }}>
                  查看详情
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </>
  );

  const createTaskContent = (
    <div>
      <Card title="发起任务" className="scene-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ marginRight: 16, fontWeight: 500, color: '#334155' }}>处理场景：</span>
          <Segmented
            value={sceneType}
            onChange={(value) => handleSceneChange(value as SceneType)}
            options={[
              { label: '政策放宽', value: 'relax' },
              { label: '政策收严', value: 'tighten' },
            ]}
          />
        </div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: '#1d1d1f' }}>任务名称</div>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder={getTaskNameExample()} />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: '#1d1d1f' }}>任务备注</div>
            <Input.TextArea value={taskRemark} onChange={(e) => setTaskRemark(e.target.value)} rows={2} placeholder="说明本次任务背景、市场范围、审批原因" />
          </Col>
        </Row>
        <Alert message={`命名格式要求：包含场景（放宽/收严）、日期、市场。示例：${getTaskNameExample()}`} type="info" showIcon style={{ marginBottom: 16 }} />
        {sceneType === 'relax' ? (
          <Alert
            type="success"
            showIcon={false}
            message={(
              <>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                放宽场景下，可基于 policy / provision / 审核环节来源等条件圈定历史拒绝类种子。<br />
                <strong>模型通过 → 移除种子结果 | 模型拒绝 → 继续保留</strong>
              </>
            )}
          />
        ) : (
          <Alert
            type="warning"
            showIcon={false}
            message={(
              <>
                <WarningOutlined style={{ marginRight: 8 }} />
                收严场景下，优先基于 P0/P1 CCR、二级 CCR、国家和行业筛选高优先级种子。<br />
                <strong>模型拒绝 → 剔除种子结果 | 模型通过 → 不动</strong>
              </>
            )}
          />
        )}
      </Card>

      <Collapse defaultActiveKey={['filters']}>
        <Panel header="筛选条件" key="filters">
          <Row gutter={16}>
            <Col span={8}>
              <label>Object ID</label>
              <Input.TextArea
                value={filterConditions.objectId}
                onChange={(e) => updateFilter('objectId', e.target.value)}
                rows={3}
                placeholder="支持手动输入多个 Object ID，用逗号、空格或换行分隔"
              />
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                <Upload accept=".csv,.txt,.xlsx,.xls" showUploadList={false} beforeUpload={handleObjectIdUpload}>
                  <Button>上传 Object ID 表格</Button>
                </Upload>
                <span style={{ color: '#86868b', fontSize: 12 }}>
                  已导入 {filterConditions.objectIds?.length || 0} 个 Object ID
                </span>
              </Space>
            </Col>
            <Col span={8}>
              <label>Object Type</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.objectType} onChange={(value) => updateFilter('objectType', value)}>
                {Object.entries(objectTypeLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <label>种子类型</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.seedType} onChange={(value) => updateFilter('seedType', value)}>
                {Object.entries(seedTypeLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <label>国家/地区</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.country} onChange={(value) => updateFilter('country', value)}>
                {Object.entries(countryLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <label>行业</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.industry} onChange={(value) => updateFilter('industry', value)}>
                {Object.entries(industryLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <label>投放状态</label>
              <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.deliveryStatus} onChange={(value) => updateFilter('deliveryStatus', value)}>
                {Object.entries(deliveryStatusLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
              </Select>
            </Col>
          </Row>

          {sceneType === 'relax' && (
            <>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <label>审核环节来源</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.auditSource} onChange={(value) => updateFilter('auditSource', value)}>
                    {Object.entries(auditSourceLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={8}>
                  <label>Policy Code</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.policyCode} onChange={(value) => updateFilter('policyCode', value)}>
                    {policyCodes.map((value) => <Select.Option key={value} value={value}>{value}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={8}>
                  <label>Provision</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.provision} onChange={(value) => updateFilter('provision', value)}>
                    {provisions.map((value) => <Select.Option key={value} value={value}>{value}</Select.Option>)}
                  </Select>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <label>当前种子状态</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.seedStatus} onChange={(value) => updateFilter('seedStatus', value)}>
                    {Object.entries(seedStatusLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                  </Select>
                </Col>
              </Row>
            </>
          )}

          {sceneType === 'tighten' && (
            <>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <label>P0 CCR 区间</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.p0CCRArea} onChange={(value) => updateFilter('p0CCRArea', value as CCRArea[])}>
                    {Object.entries(ccrAreaLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={8}>
                  <label>P1 CCR 区间</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.p1CCRArea} onChange={(value) => updateFilter('p1CCRArea', value as CCRArea[])}>
                    {Object.entries(ccrAreaLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={8}>
                  <label>二级 CCR</label>
                  <Select mode="multiple" style={{ width: '100%' }} value={filterConditions.secondaryCCR} onChange={(value) => updateFilter('secondaryCCR', value)}>
                    {Object.entries(secondaryCCRLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                  </Select>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col span={24} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={handleResetFilter}>重置条件</Button>
              <Button onClick={handleSaveFilter}>保存条件</Button>
              <Button type="primary" onClick={handleGenerateBatch}>生成筛选结果</Button>
            </Col>
          </Row>
        </Panel>
      </Collapse>

      <Card style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {isBatchGenerated && (
            <div>
              <span style={{ color: '#64748b' }}>筛选种子数量：</span>
              <span style={{ fontWeight: 700, fontSize: 20, color: '#1d1d1f' }}>{visibleSeeds.length}</span>
            </div>
          )}
          {isBatchGenerated && visibleSeeds.length > 0 && (
            <Button type="primary" onClick={handleSubmitBatchApproval}>
              提交量级审批
            </Button>
          )}
        </div>
        {!isBatchGenerated ? (
          <Alert
            type="info"
            showIcon
            message="生成筛选结果后展示种子数量和明细"
            description="未发起任务前不展示种子数量和明细。确认任务名称、备注和筛选条件后点击“生成筛选结果”。"
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={paginatedSeeds}
            columns={seedColumns}
            scroll={{ x: 1400 }}
            pagination={{
              current: currentPage,
              pageSize,
              total: visibleSeeds.length,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={handleTableChange}
          />
        )}
      </Card>
    </div>
  );

  const executeModelContent = (
    <div>
      <Card title="执行模型" style={{ marginBottom: 24 }}>
        <Alert message="只有量级审批通过的任务才能执行模型" type="info" showIcon />
      </Card>

      <Table
        rowKey="id"
        dataSource={tasks}
        pagination={{ pageSize: 6 }}
        columns={[
          { title: '任务名称', dataIndex: 'name', key: 'name' },
          {
            title: '场景',
            dataIndex: 'sceneType',
            key: 'sceneType',
            render: (value: SceneType) => renderScene(value),
          },
          { title: '种子数量', dataIndex: 'seedCount', key: 'seedCount', width: 100 },
          {
            title: '任务状态',
            dataIndex: 'status',
            key: 'status',
            render: (value: TaskStatus) => renderTaskStatus(value),
          },
          {
            title: '审批状态',
            key: 'approval',
            render: (_, record: Task) =>
              record.batchApproval
                ? <Tag color={record.batchApproval.status === 'approved' ? 'green' : record.batchApproval.status === 'pending_review' ? 'gold' : 'default'}>{batchApprovalStatusLabels[record.batchApproval.status]}</Tag>
                : <Tag>未提交</Tag>,
          },
          {
            title: '操作',
            key: 'action',
            render: (_, record: Task) => (
              <Space>
                <Button size="small" onClick={() => { setSelectedTask(record); setShowTaskDetail(true); }}>查看</Button>
                {record.batchApproval?.status === 'pending_review' && (
                  <>
                    <Button size="small" type="primary" onClick={() => handleApproveBatch(record.batchApproval?.id || '')}>审批通过</Button>
                    <Button size="small" danger onClick={() => handleRejectBatch(record.batchApproval?.id || '')}>拒绝</Button>
                  </>
                )}
                {record.batchApproval?.status === 'approved' && record.status !== 'disposal_completed' && (
                  <Button size="small" type="primary" onClick={() => setSelectedExecuteTaskId(record.id)}>选择任务</Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Card title="执行配置" style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <label>选择任务</label>
            <Select
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={selectedExecuteTaskId || undefined}
              onChange={setSelectedExecuteTaskId}
              placeholder="请选择任务"
            >
              {tasks
                .filter((task) => task.batchApproval?.status === 'approved' && task.status !== 'disposal_completed')
                .map((task) => (
                  <Select.Option key={task.id} value={task.id}>
                    {task.name}（{task.seedCount} 条）
                  </Select.Option>
                ))}
            </Select>
          </Col>
          <Col span={8}>
            <label>执行能力</label>
            <Select
              style={{ width: '100%' }}
              value={executionConfig.capability || undefined}
              onChange={(value) => setExecutionConfig((prev) => ({ ...prev, capability: value as ExecutionCapability, tagId: '' }))}
              placeholder="请选择能力"
            >
              {Object.entries(capabilityLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <label>{executionConfig.capability === 'workflow' ? 'Workflow Tag ID' : 'Hermes Tag ID'}</label>
            <Select
              style={{ width: '100%' }}
              value={executionConfig.tagId || undefined}
              onChange={(value) => setExecutionConfig((prev) => ({ ...prev, tagId: value }))}
              placeholder="请选择 Tag"
            >
              {availableTags.map((item) => (
                <Select.Option key={item.id} value={item.id}>
                  {item.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={18}>
            <label>备注说明</label>
            <Input.TextArea
              value={executionConfig.description}
              onChange={(e) => setExecutionConfig((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="补充执行说明，例如本次使用的模型策略、业务背景"
            />
          </Col>
          <Col span={6} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecuteTaskModel}>
              执行模型
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );

  const disposeTaskRows = tasks.filter((task) => ['model_completed', 'disposal_pending', 'disposal_completed'].includes(task.status));
  const disposeSeedsContent = (
    <div>
      <Card title="处置种子" style={{ marginBottom: 24 }}>
        <Alert
          type="info"
          showIcon
          message="模型执行完毕的任务可在此发起处置审批，审批通过后系统自动完成种子处置。"
        />
      </Card>

      <Table
        rowKey="id"
        dataSource={disposeTaskRows}
        pagination={{ pageSize: 6 }}
        columns={[
          { title: '任务名称', dataIndex: 'name', key: 'name' },
          {
            title: '场景',
            dataIndex: 'sceneType',
            key: 'sceneType',
            render: (value: SceneType) => renderScene(value),
          },
          {
            title: '模型结果摘要',
            key: 'stats',
            render: (_, record: Task) => (
              <span>
                建议清除 {record.modelResultStats?.suggestClear || 0} / 建议保留 {record.modelResultStats?.suggestKeep || 0}
              </span>
            ),
          },
          {
            title: '处置审批',
            key: 'disposal',
            render: (_, record: Task) =>
              record.disposalApproval
                ? <Tag color={record.disposalApproval.status === 'approved' ? 'green' : 'gold'}>{approvalStatusLabels[record.disposalApproval.status]}</Tag>
                : <Tag>未提交</Tag>,
          },
          {
            title: '操作',
            key: 'action',
            render: (_, record: Task) => (
              <Space>
                <Button size="small" onClick={() => { setSelectedTask(record); setShowTaskDetail(true); }}>查看</Button>
                {record.status === 'model_completed' && (
                  <Button size="small" type="primary" icon={<DeleteOutlined />} onClick={() => openDisposalModal(record)}>
                    发起处置审批
                  </Button>
                )}
                {record.status === 'disposal_pending' && record.disposalApproval?.status === 'pending' && (
                  <Button size="small" type="primary" onClick={() => handleApproveDisposal(record.id)}>
                    审批通过并处置
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );

  const currentContent = {
    taskCenter: taskCenterContent,
    createTask: createTaskContent,
    executeModel: executeModelContent,
    disposeSeeds: disposeSeedsContent,
  }[currentNav];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider width={260} theme="light">
        <div style={{ padding: '24px 20px 16px' }}>
          <div className="page-title">素材种子批量更新工具</div>
          <div style={{ color: '#6e6e73', fontSize: 13, marginTop: 8 }}>
            面向机审运营的 Demo，覆盖任务发起、审批、执行模型、处置闭环。
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentNav]}
          onClick={(item) => setCurrentNav(item.key as NavKey)}
          items={[
            { key: 'taskCenter', icon: <HistoryOutlined />, label: '任务中心' },
            { key: 'createTask', icon: <PlusCircleOutlined />, label: '发起任务' },
            { key: 'executeModel', icon: <PlayCircleOutlined />, label: '执行模型' },
            { key: 'disposeSeeds', icon: <DeleteOutlined />, label: '处置种子' },
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="header-title">
            {currentNav === 'taskCenter' && '任务中心'}
            {currentNav === 'createTask' && '发起任务'}
            {currentNav === 'executeModel' && '执行模型'}
            {currentNav === 'disposeSeeds' && '处置种子'}
          </div>
          <Tag color="blue">Demo / Mock Data</Tag>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          {currentContent}
        </Layout.Content>
      </Layout>

      <Drawer
        width={720}
        title="任务详情"
        open={showTaskDetail}
        onClose={() => setShowTaskDetail(false)}
      >
        {selectedTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务名称" span={2}>{selectedTask.name}</Descriptions.Item>
              <Descriptions.Item label="任务备注" span={2}>{selectedTask.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="场景类型">{selectedTask.sceneType === 'relax' ? '政策放宽' : '政策收严'}</Descriptions.Item>
              <Descriptions.Item label="任务状态">{taskStatusLabels[selectedTask.status]}</Descriptions.Item>
              <Descriptions.Item label="种子数量">{selectedTask.seedCount}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedTask.createdAt}</Descriptions.Item>
              <Descriptions.Item label="筛选摘要" span={2}>{taskFilterSummary(selectedTask)}</Descriptions.Item>
            </Descriptions>

            {selectedTask.batchApproval && (
              <Card size="small" title="量级审批">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="审批状态">{batchApprovalStatusLabels[selectedTask.batchApproval.status]}</Descriptions.Item>
                  <Descriptions.Item label="审批原因">{selectedTask.batchApproval.reason || '-'}</Descriptions.Item>
                  <Descriptions.Item label="审批人">{selectedTask.batchApproval.approvedBy || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {selectedTask.executionConfig && (
              <Card size="small" title="执行配置">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="执行能力">{selectedTask.executionConfig.capability ? capabilityLabels[selectedTask.executionConfig.capability] : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tag ID">{selectedTask.executionConfig.tagId || '-'}</Descriptions.Item>
                  <Descriptions.Item label="备注">{selectedTask.executionConfig.description || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {selectedTask.disposalApproval && (
              <Card size="small" title="处置审批">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="审批状态">{approvalStatusLabels[selectedTask.disposalApproval.status]}</Descriptions.Item>
                  <Descriptions.Item label="处置原因">{selectedTask.disposalApproval.reason}</Descriptions.Item>
                  <Descriptions.Item label="审批人">{selectedTask.disposalApproval.approvedBy || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      <Drawer
        width={680}
        title="种子详情"
        open={showSeedDetail}
        onClose={() => setShowSeedDetail(false)}
      >
        {detailSeed && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="种子 ID">{detailSeed.id}</Descriptions.Item>
              <Descriptions.Item label="Object ID">{detailSeed.objectId}</Descriptions.Item>
              <Descriptions.Item label="种子类型">{seedTypeLabels[detailSeed.seedType]}</Descriptions.Item>
              <Descriptions.Item label="审核来源">{auditSourceLabels[detailSeed.auditSource]}</Descriptions.Item>
              <Descriptions.Item label="国家/地区">{countryLabels[detailSeed.country]}</Descriptions.Item>
              <Descriptions.Item label="行业">{industryLabels[detailSeed.industry]}</Descriptions.Item>
              <Descriptions.Item label="Policy">{detailSeed.policyCode}</Descriptions.Item>
              <Descriptions.Item label="Provision">{detailSeed.provision}</Descriptions.Item>
              <Descriptions.Item label="执行状态">{renderExecutionStatus(detailSeed.executionStatus)}</Descriptions.Item>
              <Descriptions.Item label="模型结论">{renderModelConclusion(detailSeed.modelResult?.conclusion)}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      <Modal
        title="量级审批"
        open={showBatchApprovalModal}
        onCancel={() => setShowBatchApprovalModal(false)}
        onOk={handleConfirmBatchApproval}
        okText="提交审批"
        cancelText="取消"
      >
        {currentBatchApproval && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="场景类型">{sceneType === 'relax' ? '政策放宽' : '政策收严'}</Descriptions.Item>
              <Descriptions.Item label="筛选种子数量">{currentBatchApproval.seedCount}</Descriptions.Item>
              <Descriptions.Item label="审核环节来源">{filterConditions.auditSource?.map((item) => auditSourceLabels[item]).join(' / ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="Policy Code">{filterConditions.policyCode?.join(' / ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="Provision">{filterConditions.provision?.join(' / ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="CCR 条件">{filterConditions.secondaryCCR?.map((item) => secondaryCCRLabels[item]).join(' / ') || '-'}</Descriptions.Item>
            </Descriptions>
            <Input.TextArea
              value={batchApprovalReason}
              onChange={(e) => setBatchApprovalReason(e.target.value)}
              rows={4}
              placeholder="请说明本次量级审批原因"
            />
            <Alert
              type="warning"
              showIcon
              message="提交后将触发飞书审批流，需运营 Leader 审批通过后方可执行模型。"
            />
          </Space>
        )}
      </Modal>

      <Modal
        title="处置审批"
        open={showDisposalModal}
        onCancel={() => setShowDisposalModal(false)}
        onOk={handleSubmitDisposalApproval}
        okText="提交审批"
        cancelText="取消"
      >
        {currentDisposalTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="任务名称" span={2}>{currentDisposalTask.name}</Descriptions.Item>
              <Descriptions.Item label="场景类型">{currentDisposalTask.sceneType === 'relax' ? '政策放宽' : '政策收严'}</Descriptions.Item>
              <Descriptions.Item label="种子数量">{currentDisposalTask.seedCount}</Descriptions.Item>
              <Descriptions.Item label="建议清除">{currentDisposalTask.modelResultStats?.suggestClear || 0}</Descriptions.Item>
              <Descriptions.Item label="建议保留">{currentDisposalTask.modelResultStats?.suggestKeep || 0}</Descriptions.Item>
            </Descriptions>
            <Input.TextArea
              value={disposalReason}
              onChange={(e) => setDisposalReason(e.target.value)}
              rows={4}
              placeholder="请填写处置审批原因"
            />
          </Space>
        )}
      </Modal>
    </Layout>
  );
}

export default App;

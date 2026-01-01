const DEFAULT_META_FIELDS = [
  'name', 'documentation',
  'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
];

export const BPMN_PROPERTY_MAP = {
  '*': DEFAULT_META_FIELDS,
  'bpmn:Task': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:UserTask': [
    ...DEFAULT_META_FIELDS,
    'assignee'
  ],
  'bpmn:ServiceTask': [
    ...DEFAULT_META_FIELDS,
    'implementation'
  ],
  'bpmn:ScriptTask': [
    ...DEFAULT_META_FIELDS,
    'script', 'scriptFormat'
  ],
  'bpmn:CallActivity': [
    ...DEFAULT_META_FIELDS,
    'calledElement'
  ],
  'bpmn:SubProcess': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:StartEvent': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:EndEvent': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:IntermediateCatchEvent': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:IntermediateThrowEvent': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:BoundaryEvent': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:ExclusiveGateway': [
    ...DEFAULT_META_FIELDS,
    'default'
  ],
  'bpmn:InclusiveGateway': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:ParallelGateway': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:ComplexGateway': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:EventBasedGateway': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:SequenceFlow': [
    ...DEFAULT_META_FIELDS,
    'conditionExpression'
  ],
  'bpmn:DataObjectReference': [
    ...DEFAULT_META_FIELDS,
    'itemSubjectRef'
  ],
  'bpmn:DataStoreReference': [
    ...DEFAULT_META_FIELDS,
    'itemSubjectRef'
  ],
  'bpmn:Participant': [
    ...DEFAULT_META_FIELDS,
    'processRef'
  ],
  'bpmn:Lane': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:TextAnnotation': [
    ...DEFAULT_META_FIELDS,
    'text'
  ],
  'bpmn:Group': [
    ...DEFAULT_META_FIELDS,
    'categoryValueRef'
  ],
  'bpmn:Message': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:Signal': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:Error': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:Escalation': [
    ...DEFAULT_META_FIELDS
  ],
  'bpmn:EndPoint': [
    ...DEFAULT_META_FIELDS
  ]
};

export const FIELD_DEFINITIONS = [
  { key: 'name',              label: 'Name',                type: 'text' },
  { key: 'documentation',     label: 'Documentation',       type: 'textarea' },
  { key: 'assignee',          label: 'Assignee',            type: 'text' },
  { key: 'calledElement',     label: 'Called Element',      type: 'text' },
  { key: 'script',            label: 'Script Content',      type: 'textarea' },
  { key: 'scriptFormat',      label: 'Script Format',       type: 'text' },
  { key: 'implementation',    label: 'Implementation',      type: 'text' },
  { key: 'default',           label: 'Default Flow ID',     type: 'text' },
  { key: 'conditionExpression', label: 'Condition (for flow)', type: 'textarea' },
  { key: 'variables',        label: 'Variables',           type: 'array' },
  { key: 'inputMappings',    label: 'Input Mappings',      type: 'array' },
  { key: 'outputMappings',   label: 'Output Mappings',     type: 'array' },
  { key: 'itemSubjectRef',    label: 'Data Type (ItemRef)', type: 'text' },
  { key: 'processRef',        label: 'Linked Process ID',   type: 'text' },
  { key: 'text',              label: 'Annotation Text',     type: 'textarea' },
  { key: 'processOwner',      label: 'Process Owner',       type: 'text' },
  { key: 'creator',           label: 'Creator',             type: 'text' },
  { key: 'categoryValueRef',  label: 'Category Reference',  type: 'text' },
  { key: 'estimatedDuration',  label: 'Estimated Duration (mins)', type: 'text' },
  { key: 'actualDuration',     label: 'Actual Duration (mins)',    type: 'text' },
  { key: 'costEstimate',       label: 'Estimated Cost ($)',        type: 'text' },
  { key: 'ownerRole',          label: 'Responsible Role',          type: 'text' },
  { key: 'inputQuality',       label: 'Input Quality Score',       type: 'text' },
  { key: 'outputQuality',      label: 'Output Quality Score',      type: 'text' },
  { key: 'downTime',           label: 'Down Time',                 type: 'text' },
  { key: 'upTime',             label: 'Up Time',                   type: 'text' },
  { key: 'changeOverTime',     label: 'Change Over Time',          type: 'text' },
  { key: 'perCompleteAccurate', label: 'Percent Complete and Accurate',          type: 'text' },
  { key: 'availability ',       label: 'Availability',            type: 'text' },
  { key: 'leadTime ',           label: 'Lead Time',               type: 'text' },
  { key: 'kpiNotes',           label: 'KPI Notes',                 type: 'textarea' },
  { key: 'responsible',       label: 'Responsible',             type: 'text' },
  { key: 'accountable',       label: 'Accountable',             type: 'text' },
  { key: 'consulted',         label: 'Consulted',               type: 'text' },
  { key: 'informed',          label: 'Informed',                type: 'text' },
];

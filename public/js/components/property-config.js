export const BPMN_PROPERTY_MAP = {
  'bpmn:Task': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:UserTask': [
    'name', 'documentation', 'assignee',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ServiceTask': [
    'name', 'documentation', 'implementation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ScriptTask': [
    'name', 'documentation', 'script', 'scriptFormat',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:CallActivity': [
    'name', 'documentation', 'calledElement',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:SubProcess': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:StartEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:EndEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:IntermediateCatchEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:IntermediateThrowEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:BoundaryEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ExclusiveGateway': [
    'name', 'documentation', 'default',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:InclusiveGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ParallelGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ComplexGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:EventBasedGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'variables', 'inputMappings', 'outputMappings',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:SequenceFlow': [
    'name', 'documentation', 'conditionExpression',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:DataObjectReference': [
    'name', 'itemSubjectRef',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:DataStoreReference': [
    'name', 'itemSubjectRef',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Participant': [
    'name', 'processRef',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Lane': [
    'name',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:TextAnnotation': [
    'text',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Group': [
    'name', 'categoryValueRef',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Message': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Signal': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Error': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Escalation': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:EndPoint': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
    'costEstimate', 'ownerRole',
    'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
    'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
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

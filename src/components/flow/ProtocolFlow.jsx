import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from '@xyflow/react';
import StepNode from './StepNode';

const nodeTypes = {
  stepNode: StepNode,
};

function FlowContent({ nodes, edges, onNodeClick }) {
  const onNodeClickWrapped = useCallback(
    (_event, node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClickWrapped}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 300 }}
      minZoom={0.3}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="#e2e8f0" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          if (node.data?.isActive) return '#2563eb';
          return '#cbd5e1';
        }}
        maskColor="rgba(255,255,255,0.8)"
        className="!w-16 !h-12"
      />
    </ReactFlow>
  );
}

export default function ProtocolFlow({
  protocolSequence,
  activeStepId,
  onSelectStep,
  protocolWarnings,
}) {
  const { nodes, edges } = useMemo(() => {
    const nodeWidth = 140;
    const nodeHeight = 56;
    const gapY = 24;
    const startX = 80;
    const startY = 20;

    const ns = protocolSequence.map((step, index) => {
      const warning = protocolWarnings.find((w) => w.stepId === step.id);
      return {
        id: step.id,
        type: 'stepNode',
        position: {
          x: startX - nodeWidth / 2,
          y: startY + index * (nodeHeight + gapY),
        },
        data: {
          step,
          isActive: step.id === activeStepId,
          hasWarning: !!warning,
          onClick: () => onSelectStep(step.id),
        },
      };
    });

    const es = protocolSequence.slice(0, -1).map((step, index) => ({
      id: `e-${step.id}-${protocolSequence[index + 1].id}`,
      source: step.id,
      target: protocolSequence[index + 1].id,
      type: 'smoothstep',
      style: { stroke: '#cbd5e1', strokeWidth: 2 },
    }));

    return { nodes: ns, edges: es };
  }, [protocolSequence, activeStepId, protocolWarnings, onSelectStep]);

  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <FlowContent nodes={nodes} edges={edges} onNodeClick={onSelectStep} />
      </ReactFlowProvider>
    </div>
  );
}

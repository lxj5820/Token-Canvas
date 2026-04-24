import { NodeData, Connection, CanvasTransform, NodeType } from '../types';

/**
 * 工作流导入数据校验
 * 防止恶意构造的工作流文件注入非法数据
 */

const VALID_NODE_TYPES = new Set<string>(Object.values(NodeType));

const REQUIRED_NODE_FIELDS = ['id', 'type', 'x', 'y', 'width', 'height', 'title'];
const REQUIRED_CONNECTION_FIELDS = ['id', 'sourceId', 'targetId'];

/** 校验单个节点数据 */
function isValidNode(node: any): node is NodeData {
  if (!node || typeof node !== 'object') return false;
  // 检查必要字段
  for (const field of REQUIRED_NODE_FIELDS) {
    if (node[field] === undefined || node[field] === null) return false;
  }
  // 校验 NodeType 白名单
  if (!VALID_NODE_TYPES.has(node.type)) return false;
  // 校验数值字段
  if (typeof node.x !== 'number' || typeof node.y !== 'number') return false;
  if (typeof node.width !== 'number' || typeof node.height !== 'number') return false;
  if (node.width <= 0 || node.height <= 0) return false;
  // 校验 id 格式
  if (typeof node.id !== 'string' || node.id.length === 0 || node.id.length > 100) return false;
  // 校验标题
  if (typeof node.title !== 'string' || node.title.length > 200) return false;
  // 校验可选字符串字段
  if (node.prompt !== undefined && typeof node.prompt !== 'string') return false;
  if (node.imageSrc !== undefined && typeof node.imageSrc !== 'string') return false;
  if (node.videoSrc !== undefined && typeof node.videoSrc !== 'string') return false;
  if (node.audioSrc !== undefined && typeof node.audioSrc !== 'string') return false;
  if (node.model !== undefined && typeof node.model !== 'string') return false;
  // 校验可选数值字段
  if (node.count !== undefined && (typeof node.count !== 'number' || node.count < 1 || node.count > 10)) return false;
  return true;
}

/** 校验单个连接数据 */
function isValidConnection(conn: any): conn is Connection {
  if (!conn || typeof conn !== 'object') return false;
  for (const field of REQUIRED_CONNECTION_FIELDS) {
    if (typeof conn[field] !== 'string' || conn[field].length === 0 || conn[field].length > 100) return false;
  }
  // sourceId 和 targetId 不能相同
  if (conn.sourceId === conn.targetId) return false;
  return true;
}

/** 校验 CanvasTransform */
function isValidTransform(transform: any): transform is CanvasTransform {
  if (!transform || typeof transform !== 'object') return false;
  if (typeof transform.x !== 'number' || typeof transform.y !== 'number' || typeof transform.k !== 'number') return false;
  if (transform.k <= 0 || transform.k > 10) return false;
  return true;
}

export interface ValidatedWorkflow {
  nodes: NodeData[];
  connections: Connection[];
  transform?: CanvasTransform;
  projectName?: string;
}

export interface ValidationResult {
  valid: boolean;
  data: ValidatedWorkflow | null;
  errors: string[];
}

/**
 * 校验导入的工作流数据
 * @param rawData - JSON.parse 后的原始数据
 * @param maxNodes - 最大节点数限制，默认 200
 * @param maxConnections - 最大连接数限制，默认 500
 */
export function validateWorkflow(rawData: any, maxNodes = 200, maxConnections = 500): ValidationResult {
  const errors: string[] = [];

  if (!rawData || typeof rawData !== 'object') {
    return { valid: false, data: null, errors: ['无效的工作流数据格式'] };
  }

  // 校验 nodes
  if (!Array.isArray(rawData.nodes)) {
    return { valid: false, data: null, errors: ['缺少 nodes 数组'] };
  }
  if (rawData.nodes.length > maxNodes) {
    return { valid: false, data: null, errors: [`节点数量超过限制 (${rawData.nodes.length} > ${maxNodes})`] };
  }

  const validNodes: NodeData[] = [];
  const nodeIds = new Set<string>();
  rawData.nodes.forEach((node: any, index: number) => {
    if (isValidNode(node)) {
      if (nodeIds.has(node.id)) {
        errors.push(`节点 #${index}: 重复的 id "${node.id}"`);
      } else {
        nodeIds.add(node.id);
        validNodes.push(node);
      }
    } else {
      errors.push(`节点 #${index}: 数据格式不合法`);
    }
  });

  // 校验 connections
  if (!Array.isArray(rawData.connections)) {
    return { valid: false, data: null, errors: ['缺少 connections 数组'] };
  }
  if (rawData.connections.length > maxConnections) {
    return { valid: false, data: null, errors: [`连接数量超过限制 (${rawData.connections.length} > ${maxConnections})`] };
  }

  const validConnections: Connection[] = [];
  const connIds = new Set<string>();
  rawData.connections.forEach((conn: any, index: number) => {
    if (isValidConnection(conn)) {
      if (connIds.has(conn.id)) {
        errors.push(`连接 #${index}: 重复的 id "${conn.id}"`);
      } else if (!nodeIds.has(conn.sourceId)) {
        errors.push(`连接 #${index}: sourceId "${conn.sourceId}" 不存在`);
      } else if (!nodeIds.has(conn.targetId)) {
        errors.push(`连接 #${index}: targetId "${conn.targetId}" 不存在`);
      } else {
        connIds.add(conn.id);
        validConnections.push(conn);
      }
    } else {
      errors.push(`连接 #${index}: 数据格式不合法`);
    }
  });

  // 校验 transform（可选）
  let transform: CanvasTransform | undefined;
  if (rawData.transform) {
    if (isValidTransform(rawData.transform)) {
      transform = rawData.transform;
    } else {
      errors.push('transform 数据格式不合法，已忽略');
    }
  }

  // 校验 projectName（可选）
  let projectName: string | undefined;
  if (rawData.projectName !== undefined) {
    if (typeof rawData.projectName === 'string' && rawData.projectName.length <= 100) {
      projectName = rawData.projectName;
    } else {
      errors.push('projectName 格式不合法，已忽略');
    }
  }

  // 如果有校验错误但还有有效数据，允许部分导入
  if (validNodes.length === 0 && validConnections.length === 0) {
    return { valid: false, data: null, errors: errors.length > 0 ? errors : ['没有有效的工作流数据'] };
  }

  return {
    valid: true,
    data: { nodes: validNodes, connections: validConnections, transform, projectName },
    errors
  };
}

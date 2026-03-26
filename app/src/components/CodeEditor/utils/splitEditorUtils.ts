import type { EditorPane, EditorPaneNode, EditorSplitGroup } from '../types'

/**
 * Check if a node is a split group
 */
export function isSplitGroup(node: EditorPaneNode): node is EditorSplitGroup {
  return 'children' in node && 'orientation' in node
}

/**
 * Check if a node is a pane
 */
export function isPane(node: EditorPaneNode): node is EditorPane {
  return !isSplitGroup(node)
}

/**
 * Find a pane by ID in the tree
 */
export function findPaneInTree(root: EditorPaneNode, paneId: string): EditorPane | null {
  if (isPane(root)) {
    return root.id === paneId ? root : null
  }
  
  for (const child of root.children) {
    const found = findPaneInTree(child, paneId)
    if (found) return found
  }
  
  return null
}

/**
 * Find the parent group of a pane
 */
export function findParentGroup(
  root: EditorPaneNode,
  paneId: string,
  parent: EditorSplitGroup | null = null
): { group: EditorSplitGroup; childIndex: number } | null {
  if (isPane(root)) {
    return null
  }
  
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]
    if (isPane(child) && child.id === paneId) {
      return { group: root, childIndex: i }
    }
    if (isSplitGroup(child)) {
      const found = findParentGroup(child, paneId, root)
      if (found) return found
    }
  }
  
  return null
}

/**
 * Get all panes from the tree (flattened)
 */
export function getAllPanes(root: EditorPaneNode): EditorPane[] {
  if (isPane(root)) {
    return [root]
  }
  
  const panes: EditorPane[] = []
  for (const child of root.children) {
    panes.push(...getAllPanes(child))
  }
  return panes
}

/**
 * Split a pane into a group with two panes
 */
export function splitPane(
  root: EditorPaneNode,
  paneId: string,
  orientation: 'horizontal' | 'vertical'
): EditorPaneNode {
  // If splitting the root pane
  if (isPane(root) && root.id === paneId) {
    const newPaneId = `pane-${Date.now()}`
    const newPane: EditorPane = {
      id: newPaneId,
      activeTab: '',
      tabs: []
    }
    
    return {
      id: `group-${Date.now()}`,
      orientation,
      sizes: [50, 50],
      children: [root, newPane]
    }
  }
  
  // If splitting a pane within a group
  if (isSplitGroup(root)) {
    const newChildren = root.children.map(child => {
      if (isPane(child) && child.id === paneId) {
        const newPaneId = `pane-${Date.now()}`
        const newPane: EditorPane = {
          id: newPaneId,
          activeTab: '',
          tabs: []
        }
        
        // Create a new split group for this pane
        const newGroup: EditorSplitGroup = {
          id: `group-${Date.now()}`,
          orientation,
          sizes: [50, 50],
          children: [child, newPane]
        }
        
        return newGroup
      }
      if (isSplitGroup(child)) {
        return splitPane(child, paneId, orientation)
      }
      return child
    })
    
    return {
      ...root,
      children: newChildren
    }
  }
  
  return root
}

/**
 * Close a pane (remove it from the tree)
 */
export function closePane(root: EditorPaneNode, paneId: string): EditorPaneNode | null {
  // Can't close the root if it's a single pane
  if (isPane(root) && root.id === paneId) {
    return null // Return null to indicate we can't close the last pane
  }
  
  // If it's a group, try to find and remove the pane
  if (isSplitGroup(root)) {
    const newChildren = root.children
      .map(child => {
        if (isPane(child) && child.id === paneId) {
          return null // Mark for removal
        }
        if (isSplitGroup(child)) {
          const result = closePane(child, paneId)
          return result
        }
        return child
      })
      .filter((child): child is EditorPaneNode => child !== null)
    
    // If only one child remains, return that child (collapse the group)
    if (newChildren.length === 1) {
      return newChildren[0]
    }
    
    // Recalculate sizes
    const newSizes = newChildren.map(() => 100 / newChildren.length)
    
    return {
      ...root,
      children: newChildren,
      sizes: newSizes
    }
  }
  
  return root
}

/**
 * Update a pane in the tree
 */
export function updatePaneInTree(
  root: EditorPaneNode,
  paneId: string,
  updater: (pane: EditorPane) => EditorPane
): EditorPaneNode {
  if (isPane(root)) {
    return root.id === paneId ? updater(root) : root
  }
  
  return {
    ...root,
    children: root.children.map(child => updatePaneInTree(child, paneId, updater))
  }
}

/**
 * Update sizes in a split group
 */
export function updateGroupSizes(
  root: EditorPaneNode,
  groupId: string,
  sizes: number[]
): EditorPaneNode {
  if (isPane(root)) {
    return root
  }
  
  if (root.id === groupId) {
    return {
      ...root,
      sizes
    }
  }
  
  return {
    ...root,
    children: root.children.map(child => updateGroupSizes(child, groupId, sizes))
  }
}

import { useState, useEffect } from 'react'
import './DesignDocs.css'

interface DesignDoc {
  id: string
  title: string
  content: string
  projectId?: string
  projectName?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  author: string
}

export function DesignDocs() {
  const [docs, setDocs] = useState<DesignDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DesignDoc | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDocs()
  }, [selectedProject])

  const loadDocs = async () => {
    setLoading(true)
    try {
      const { designDocsApi } = await import('../services/api')
      const response = await designDocsApi.listDocs(selectedProject === 'all' ? undefined : selectedProject)
      if (response.success) {
        setDocs(response.docs || [])
      }
    } catch (err) {
      console.error('Failed to load design docs:', err)
      // If API fails, just show empty list
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDoc = async () => {
    setIsCreating(true)
    setSelectedDoc(null)
  }

  const handleSaveDoc = async (doc: Partial<DesignDoc>) => {
    try {
      const { designDocsApi } = await import('../services/api')
      let savedDoc: DesignDoc
      if (doc.id) {
        // Update existing
        const response = await designDocsApi.updateDoc(doc.id, doc)
        savedDoc = response.doc
      } else {
        // Create new
        const response = await designDocsApi.createDoc(doc)
        savedDoc = response.doc
      }
      await loadDocs()
      setIsEditing(false)
      setIsCreating(false)
      setSelectedDoc(savedDoc)
    } catch (err) {
      console.error('Failed to save doc:', err)
      alert('Failed to save document. Please try again.')
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this design document?')) return
    
    try {
      const { designDocsApi } = await import('../services/api')
      await designDocsApi.deleteDoc(docId)
      await loadDocs()
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null)
      }
    } catch (err) {
      console.error('Failed to delete doc:', err)
    }
  }

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  return (
    <div className="design-docs-container">
      <div className="design-docs-sidebar">
        <div className="design-docs-header">
          <h2>📚 Design Documents</h2>
          <button className="btn-create" onClick={handleCreateDoc}>
            + New Doc
          </button>
        </div>

        <div className="design-docs-filters">
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="project-filter"
          >
            <option value="all">All Projects</option>
            {/* Projects will be loaded from API */}
          </select>
        </div>

        <div className="design-docs-list">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="empty-state">
              <p>No design documents found</p>
              <button onClick={handleCreateDoc} className="btn-create-small">
                Create your first doc
              </button>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                className={`doc-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDoc(doc)
                  setIsEditing(false)
                  setIsCreating(false)
                }}
              >
                <div className="doc-item-header">
                  <h3>{doc.title}</h3>
                  <div className="doc-item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDoc(doc)
                        setIsEditing(true)
                        setIsCreating(false)
                      }}
                      className="btn-edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDoc(doc.id)
                      }}
                      className="btn-delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="doc-item-meta">
                  <span className="doc-date">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  {doc.projectName && (
                    <span className="doc-project">{doc.projectName}</span>
                  )}
                </div>
                {doc.tags.length > 0 && (
                  <div className="doc-tags">
                    {doc.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="design-docs-content">
        {isCreating ? (
          <DocEditor
            doc={null}
            onSave={handleSaveDoc}
            onCancel={() => {
              setIsCreating(false)
              setSelectedDoc(null)
            }}
          />
        ) : selectedDoc ? (
          isEditing ? (
            <DocEditor
              doc={selectedDoc}
              onSave={handleSaveDoc}
              onCancel={() => {
                setIsEditing(false)
              }}
            />
          ) : (
            <DocViewer doc={selectedDoc} onEdit={() => setIsEditing(true)} />
          )
        ) : (
          <div className="empty-content">
            <div className="empty-icon">📚</div>
            <h2>Select a design document</h2>
            <p>Choose a document from the sidebar or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DocViewer({ doc, onEdit }: { doc: DesignDoc; onEdit: () => void }) {
  return (
    <div className="doc-viewer">
      <div className="doc-viewer-header">
        <div>
          <h1>{doc.title}</h1>
          <div className="doc-viewer-meta">
            <span>By {doc.author}</span>
            <span>•</span>
            <span>Updated {new Date(doc.updatedAt).toLocaleString()}</span>
            {doc.projectName && (
              <>
                <span>•</span>
                <span>Project: {doc.projectName}</span>
              </>
            )}
          </div>
          {doc.tags.length > 0 && (
            <div className="doc-viewer-tags">
              {doc.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={onEdit} className="btn-edit-doc">
          ✏️ Edit
        </button>
      </div>
      <div className="doc-viewer-content">
        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: formatMarkdown(doc.content) }} />
      </div>
    </div>
  )
}

function DocEditor({ doc, onSave, onCancel }: { doc: DesignDoc | null; onSave: (doc: Partial<DesignDoc>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(doc?.title || '')
  const [content, setContent] = useState(doc?.content || '')
  const [tags, setTags] = useState(doc?.tags.join(', ') || '')
  const [projectId, setProjectId] = useState(doc?.projectId || '')

  const handleSave = () => {
    onSave({
      id: doc?.id,
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      projectId: projectId || undefined
    })
  }

  return (
    <div className="doc-editor">
      <div className="doc-editor-header">
        <input
          type="text"
          placeholder="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="doc-title-input"
        />
        <div className="doc-editor-actions">
          <button onClick={handleSave} className="btn-save" disabled={!title.trim()}>
            💾 Save
          </button>
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </div>
      <div className="doc-editor-meta">
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="doc-tags-input"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="doc-project-select"
        >
          <option value="">No Project</option>
          {/* Projects will be loaded from API */}
        </select>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your design document here... (Markdown supported)"
        className="doc-content-textarea"
      />
      <div className="doc-editor-preview">
        <h3>Preview</h3>
        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  )
}

function formatMarkdown(text: string): string {
  // Simple markdown to HTML converter
  let html = text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>')
  
  return html
}

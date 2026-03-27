// Use Vite proxy in development, or direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Web Coder API client (projects, editor, LLM, GPUs, etc.)

export interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
  address?: string;
  profile_image?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
}

export const authApi = {
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    const data = await response.json();
    return data.user;
  },

  async register(username: string, password: string, email?: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }));
      console.error('Registration error:', error);
      throw new Error(error.error || 'Registration failed');
    }
    const data = await response.json();
    return data.user;
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

export interface WindowLayout {
  sidebarWidth?: number;
  aiPanelWidth?: number;
  terminalHeight?: number;
  aiPanelPosition?: 'left' | 'right';
  sidebarCollapsed?: boolean;
  aiPanelVisible?: boolean;
  showTerminal?: boolean;
  openTabs?: Array<{ path: string; name: string; content: string; modified: boolean }>;
  activeTab?: string;
}

export interface UserSettings {
  id: number;
  user_id: string;
  editor_theme: string;
  editor_font_size: number;
  editor_font_family: string;
  editor_tab_size: number;
  editor_word_wrap: string;
  editor_minimap: boolean;
  editor_line_numbers: string;
  ai_default_model: string;
  ai_temperature: number;
  ai_max_tokens: number;
  ai_auto_apply?: boolean;
  selected_agent_id?: number | null;
  git_use_git: boolean;
  git_repo_path?: string;
  git_repo_url?: string;
  git_auto_commit: boolean;
  use_file_system: boolean;
  additional_settings: Record<string, any>;
  window_layout?: WindowLayout;
  created_at: string;
  updated_at: string;
}

function getCurrentUserId(): string | null {
  // Try multiple sources for user ID
  // First, try currentUserId from localStorage (set by CodeEditor or App)
  const currentUserId = localStorage.getItem('currentUserId');
  if (currentUserId) {
    const trimmed = currentUserId.trim();
    // Accept any non-empty string (UUIDs or other formats)
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  
  // Fallback: try to get from currentUser object
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user && user.id) {
        const userId = String(user.id).trim();
        // Accept any non-empty user ID
        if (userId.length > 0) {
          // Also store it for next time
          localStorage.setItem('currentUserId', userId);
          return userId;
        }
      }
    } catch (e) {
      console.error('Failed to parse currentUser:', e);
      return null;
    }
  }
  return null;
}

function getAuthHeaders(includeContentType: boolean = true): HeadersInit {
  const headers: HeadersInit = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const userId = getCurrentUserId();
  if (userId) {
    headers['X-User-Id'] = String(userId);
  }
  return headers;
}

export const userApi = {
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async searchUsers(query: string): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search users');
    return response.json();
  },

  async toggleUserActive(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/toggle-active`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle user status');
    const data = await response.json();
    return data.user;
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete user');
  },

  async getUserSettings(userId: string): Promise<{ success: boolean; settings: UserSettings }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/settings`, {
      headers: getAuthHeaders(false), // GET request doesn't need Content-Type
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user settings' }));
      throw new Error(errorData.error || 'Failed to fetch user settings');
    }
    return response.json();
  },

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<{ success: boolean; settings: UserSettings }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update user settings' }));
      throw new Error(errorData.error || 'Failed to update user settings');
    }
    return response.json();
  },

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async uploadProfileImage(userId: string, file: File): Promise<{ success: boolean; profile_image: string; user: User }> {
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {};
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      headers['X-User-Id'] = currentUserId.toString();
    }
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile-image`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload profile image');
    }
    return response.json();
  },
};

export interface GPU {
  id: number;
  device_id: string;
  name: string;
  vendor?: string;
  memory_total: number | null;
  memory_used: number | null;
  memory_free: number | null;
  compute_capability?: string;
  driver_version?: string;
  temperature: number | null;
  power_usage: number | null;
  utilization: number | null;
  is_available: boolean;
  current_task: string;
  host_system?: string;
  last_seen?: string;
  created_at?: string;
}

export interface GPUTask {
  id: number;
  gpu_id: number;
  user_id?: number;
  task_type: string;
  task_name?: string;
  status: string;
  start_time: string;
  end_time?: string;
  config?: string;
  progress?: number;
  error_message?: string;
}

export const gpuApi = {
  async detectGPUs(): Promise<{ success: boolean; gpus: GPU[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to detect GPUs');
    return response.json();
  },

  async getGPUs(): Promise<GPU[]> {
    const response = await fetch(`${API_BASE_URL}/api/gpus`);
    if (!response.ok) throw new Error('Failed to fetch GPUs');
    return response.json();
  },

  async getAvailableGPUs(): Promise<GPU[]> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/available`);
    if (!response.ok) throw new Error('Failed to fetch available GPUs');
    return response.json();
  },

  async getGPU(gpuId: number): Promise<GPU> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/${gpuId}`);
    if (!response.ok) throw new Error('Failed to fetch GPU');
    return response.json();
  },

  async updateGPUStatus(gpuId: number, status: Partial<GPU>): Promise<GPU> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/${gpuId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status),
    });
    if (!response.ok) throw new Error('Failed to update GPU status');
    return response.json();
  },

  async assignTask(gpuId: number, taskType: string, taskName?: string, config?: any): Promise<GPUTask> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/${gpuId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_type: taskType, task_name: taskName, config }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to assign task');
    }
    return response.json();
  },

  async getTasks(gpuId?: number, status?: string): Promise<GPUTask[]> {
    const params = new URLSearchParams();
    if (gpuId) params.append('gpu_id', gpuId.toString());
    if (status) params.append('status', status);
    
    const response = await fetch(`${API_BASE_URL}/api/gpus/tasks?${params}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  async getTask(taskId: number): Promise<GPUTask> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/tasks/${taskId}`);
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  },

  async stopTask(taskId: number): Promise<GPUTask> {
    const response = await fetch(`${API_BASE_URL}/api/gpus/tasks/${taskId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to stop task');
    return response.json();
  },

    async updateTaskProgress(taskId: number, progress: number, errorMessage?: string): Promise<GPUTask> {
        const response = await fetch(`${API_BASE_URL}/api/gpus/tasks/${taskId}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress, error_message: errorMessage }),
        });
        if (!response.ok) throw new Error('Failed to update task progress');
        return response.json();
    },
};

export interface LLMQuery {
    id: number;
    query_id: string;
    user_id?: number;
    prompt: string;
    model: string;
    response?: string;
    gpu_id?: number;
    task_id?: number;
    status: string;
    created_at: string;
    completed_at?: string;
    task_progress?: number;
    task_status?: string;
}

export interface OllamaModel {
    name: string;
    size: number;
    description?: string;
}

export const llmApi = {
    async getAvailableModels(): Promise<{ success: boolean; models: OllamaModel[]; note?: string }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/models`);
        if (!response.ok) throw new Error('Failed to fetch models');
        return response.json();
    },

    async createQuery(prompt: string, model: string, gpuId?: number, maxTokens?: number, temperature?: number): Promise<{ success: boolean; query_id: string; query: LLMQuery; task: GPUTask }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                model,
                gpu_id: gpuId,
                max_tokens: maxTokens,
                temperature: temperature
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create query');
        }
        return response.json();
    },

    async getQuery(queryId: string): Promise<LLMQuery> {
        const response = await fetch(`${API_BASE_URL}/api/llm/query/${queryId}`);
        if (!response.ok) throw new Error('Failed to fetch query');
        return response.json();
    },

    async getQueries(userId?: number, status?: string, limit?: number): Promise<LLMQuery[]> {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId.toString());
        if (status) params.append('status', status);
        if (limit) params.append('limit', limit.toString());
        
        const response = await fetch(`${API_BASE_URL}/api/llm/queries?${params}`);
        if (!response.ok) throw new Error('Failed to fetch queries');
        return response.json();
    },

    async deleteQuery(queryId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/llm/query/${queryId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete query');
    },
};

export const llmManagerApi = {
    async getAvailableModels(): Promise<{ success: boolean; models: OllamaModel[] }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/manager/models`);
        if (!response.ok) throw new Error('Failed to fetch available models');
        return response.json();
    },

    async getInstalledModels(): Promise<{ success: boolean; installed_models: Record<string, any[]> }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/manager/installed`);
        if (!response.ok) throw new Error('Failed to fetch installed models');
        return response.json();
    },

    async installModel(modelName: string, gpuId?: number, clientHost?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/manager/install/${modelName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpu_id: gpuId, client_host: clientHost }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to install model');
        }
        return response.json();
    },

    async removeModel(modelName: string, gpuId?: number, clientHost?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/llm/manager/remove/${modelName}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpu_id: gpuId, client_host: clientHost }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove model');
        }
        return response.json();
    },
};

export interface CodeEditorAgent {
    id: number;
    name: string;
    agent_type: 'local' | 'remote' | 'cloud' | 'client';
    user_id?: number;
    gpu_id?: number;
    host?: string;
    port?: number;
    api_key?: string;
    endpoint?: string;
    model: string;
    max_tokens: number;
    temperature: number;
    config?: string;
    is_active: boolean;
    is_available: boolean;
    last_used?: string;
    created_at: string;
    updated_at?: string;
    gpu?: GPU;
}

export const codeEditorApi = {
    async getAgents(userId?: string, type?: 'local' | 'remote' | 'cloud' | 'client'): Promise<{ success: boolean; agents: CodeEditorAgent[] }> {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId);
        if (type) params.append('type', type);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/code-editor/agents?${params}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            // Return empty agents list instead of throwing
            return { success: false, agents: [], error: 'Failed to fetch agents' };
          }
          return response.json();
        } catch (err: any) {
          clearTimeout(timeoutId);
          // Handle network errors gracefully (CORS, network failure, timeout, etc.)
          if (err.name === 'AbortError' || err.name === 'TypeError' || err.message?.includes('fetch')) {
            return { success: false, agents: [], error: 'Network error - backend may not be available' };
          }
          // Re-throw unexpected errors
          throw err;
        }
    },

    async createAgent(agentData: {
        name: string;
        agent_type: 'local' | 'remote' | 'cloud' | 'client';
        gpu_id?: number;
        host?: string;
        port?: number;
        endpoint?: string;
        api_key?: string;
        model?: string;
        max_tokens?: number;
        temperature?: number;
        config?: any;
    }): Promise<{ success: boolean; agent: CodeEditorAgent }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agentData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create agent');
        }
        return response.json();
    },

    async getAgent(agentId: number): Promise<{ success: boolean; agent: CodeEditorAgent }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/${agentId}`);
        if (!response.ok) throw new Error('Failed to fetch agent');
        return response.json();
    },

    async updateAgent(agentId: number, updates: Partial<CodeEditorAgent>): Promise<{ success: boolean; agent: CodeEditorAgent }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/${agentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update agent');
        }
        return response.json();
    },

    async deleteAgent(agentId: number): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/${agentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete agent');
        }
        return response.json();
    },

    async testAgent(agentId: number): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/${agentId}/test`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to test agent');
        }
        return response.json();
    },

    async getAvailableGPUs(type?: 'local' | 'client' | 'all'): Promise<{ success: boolean; gpus: GPU[] }> {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        
        const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/available-gpus?${params}`);
        if (!response.ok) throw new Error('Failed to fetch available GPUs');
        return response.json();
    },

    async executeWithAgent(agentId: number, payload: any, timeout: number = 30000): Promise<{ success: boolean; query_id?: string; query?: LLMQuery; task?: GPUTask; response?: string }> {
        // Use AbortController for timeout (default 30 seconds for agent execution)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/code-editor/agents/${agentId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to execute with agent');
            }
            return response.json();
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error(`Request timeout: Agent execution took longer than ${timeout / 1000} seconds. The request may still be processing on the server.`);
            }
            throw err;
        }
    },

    async listFiles(path?: string, workingDir?: string, projectId?: string): Promise<{ success: boolean; files: Array<{ name: string; path: string; type: 'file' | 'folder'; size: number }> }> {
        const params = new URLSearchParams();
        if (path) params.append('path', path);
        if (workingDir) params.append('working_dir', workingDir);
        if (projectId) params.append('project_id', projectId);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/files?${params}`, {
            headers: getAuthHeaders(false), // GET request doesn't need Content-Type
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list files');
        }
        return response.json();
    },

    async readFile(path: string, workingDir?: string, projectId?: string): Promise<{ success: boolean; content: string; path: string }> {
        const params = new URLSearchParams();
        params.append('path', path);
        if (workingDir) params.append('working_dir', workingDir);
        if (projectId) params.append('project_id', projectId);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/files/read?${params}`, {
            headers: getAuthHeaders(false), // GET request doesn't need Content-Type
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to read file');
        }
        return response.json();
    },

    async writeFile(path: string, content: string, workingDir?: string, projectId?: string, encoding: 'text' | 'base64' = 'text', options?: { isDirectory?: boolean }): Promise<{ success: boolean; path: string }> {
        const uid = getCurrentUserId();
        const response = await fetch(`${API_BASE_URL}/api/code-editor/files/write`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                path,
                content,
                working_dir: workingDir,
                project_id: projectId,
                encoding,
                ...(uid ? { user_id: uid } : {}),
                ...(options?.isDirectory ? { is_directory: true } : {}),
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to write file');
        }
        return response.json();
    },

    async deleteFile(path: string, workingDir?: string, projectId?: string): Promise<{ success: boolean }> {
        const params = new URLSearchParams();
        params.append('path', path);
        if (workingDir) params.append('working_dir', workingDir);
        if (projectId) params.append('project_id', projectId);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/files?${params}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete file');
        }
        return response.json();
    },

    async gitStatus(path?: string): Promise<{ success: boolean; is_git_repo: boolean; status?: string[]; has_changes?: boolean; message?: string }> {
        const params = new URLSearchParams();
        if (path) params.append('path', path);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/status?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get git status');
        }
        return response.json();
    },

    async gitInit(path?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to initialize git repository');
        }
        return response.json();
    },

    async gitClone(url: string, targetPath?: string): Promise<{ success: boolean; path: string; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, path: targetPath }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to clone repository');
        }
        return response.json();
    },

    async gitPull(path?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to pull from repository');
        }
        return response.json();
    },

    async gitPush(path?: string, remote?: string, branch?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, remote, branch }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to push to repository');
        }
        return response.json();
    },

    async gitCommit(path?: string, message?: string, files?: string[]): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, message, files }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to commit changes');
        }
        return response.json();
    },

    async gitAdd(path?: string, files?: string[]): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/git/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, files }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add files');
        }
        return response.json();
    },

    async analyzeCodebase(workingDir?: string, maxFiles?: number, includeContent: boolean = true, forceRefresh?: boolean, timeout: number = 60000): Promise<{ success: boolean; analysis: any; cached?: boolean; cache_id?: number; updated_at?: string }> {
        // Use AbortController for timeout (60 seconds for full analysis)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/code-editor/analyze`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ 
                    working_dir: workingDir, 
                    max_files: maxFiles, // undefined = analyze all files
                    include_content: includeContent,
                    force_refresh: forceRefresh || false
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to analyze codebase');
            }
            return response.json();
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Analysis timeout: Codebase analysis took longer than 60 seconds');
            }
            throw err;
        }
    },

    async getCachedAnalysis(workingDir?: string): Promise<{ success: boolean; analysis: any }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/analysis/cache?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get cached analysis');
        }
        return response.json();
    },

    async clearCachedAnalysis(workingDir?: string): Promise<{ success: boolean; message: string }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/analysis/cache?${params}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to clear cache');
        }
        return response.json();
    },

    async getAnalysisSummary(workingDir?: string, projectId?: string): Promise<{ success: boolean; summary: any }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        if (projectId) params.append('project_id', projectId);
        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/code-editor/analysis/summary${queryString ? `?${queryString}` : ''}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(false),
        });
        if (!response.ok) {
            // If 404, it means no analysis exists yet - return a success response with empty summary
            // This allows the caller to gracefully fall back to using current files
            if (response.status === 404) {
                return { success: false, summary: null };
            }
            const error = await response.json();
            throw new Error(error.error || 'Failed to get analysis summary');
        }
        return response.json();
    },

    // Virtual Environment Management
    async detectVenv(workingDir?: string): Promise<{ success: boolean; venv: any }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/detect?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to detect virtual environment');
        }
        return response.json();
    },

    async createVenv(workingDir: string, name: string = 'venv', pythonVersion?: string): Promise<{ success: boolean; venv: any; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ working_dir: workingDir, name, python_version: pythonVersion }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create virtual environment');
        }
        return response.json();
    },

    async listVenvPackages(workingDir?: string, venvPath?: string): Promise<{ success: boolean; packages: any[] }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        if (venvPath) params.append('venv_path', venvPath);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/packages?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list packages');
        }
        return response.json();
    },

    async installVenvPackage(workingDir: string, packageName: string, upgrade: boolean = false, venvPath?: string): Promise<{ success: boolean; message: string; output: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ working_dir: workingDir, package: packageName, upgrade, venv_path: venvPath }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to install package');
        }
        return response.json();
    },

    async installVenvRequirements(workingDir: string, requirementsFile?: string, venvPath?: string): Promise<{ success: boolean; message: string; output: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/install-requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ working_dir: workingDir, requirements_file: requirementsFile, venv_path: venvPath }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to install requirements');
        }
        return response.json();
    },

    async uninstallVenvPackage(workingDir: string, packageName: string, venvPath?: string): Promise<{ success: boolean; message: string; output: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/uninstall`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ working_dir: workingDir, package: packageName, venv_path: venvPath }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to uninstall package');
        }
        return response.json();
    },

    async getVenvPythonPath(workingDir?: string, venvPath?: string): Promise<{ success: boolean; python_path: string; activation_command: string }> {
        const params = new URLSearchParams();
        if (workingDir) params.append('working_dir', workingDir);
        if (venvPath) params.append('venv_path', venvPath);
        const response = await fetch(`${API_BASE_URL}/api/code-editor/venv/python-path?${params}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get Python path');
        }
        return response.json();
    },

    async analyzeImprovements(workingDir?: string, maxFiles?: number, projectName?: string): Promise<{ success: boolean; analysis: any }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/improvements/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                working_dir: workingDir,
                max_files: maxFiles || 100,
                project_name: projectName || ''
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to analyze improvements');
        }
        return response.json();
    },

    async applyImprovements(workingDir?: string, improvements?: any[], autoApplyAll?: boolean): Promise<{ success: boolean; results: any }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/improvements/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                working_dir: workingDir,
                improvements: improvements || [],
                auto_apply_all: autoApplyAll || false
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to apply improvements');
        }
        return response.json();
    },

    async autoImproveCodebase(workingDir?: string, maxFiles?: number, maxImprovements?: number, projectName?: string): Promise<{ success: boolean; analysis: any; results: any; message: string }> {
        const response = await fetch(`${API_BASE_URL}/api/code-editor/improvements/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                working_dir: workingDir,
                max_files: maxFiles || 50,
                max_improvements: maxImprovements || 10,
                project_name: projectName || ''
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to auto-improve codebase');
        }
        return response.json();
    },
};

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  settings?: {
    language?: string;
    theme?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DesignDoc {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  projectName?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
}

export const projectApi = {
  async getProjects(): Promise<{ success: boolean; projects: Project[] }> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async getProject(projectId: string): Promise<{ success: boolean; project: Project }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  async createProject(projectData: { name: string; description?: string; settings?: any }): Promise<{ success: boolean; project: Project }> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('Project creation error:', error);
      if (error.traceback) {
        console.error('Traceback:', error.traceback);
      }
      throw new Error(error.error || 'Failed to create project');
    }
    return response.json();
  },

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<{ success: boolean; project: Project }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }
    return response.json();
  },

  async deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
    return response.json();
  },

  async getProjectUsers(projectId: string): Promise<{ success: boolean; users: Array<{ user_id: string; username: string; email?: string; name?: string; role: string; is_creator: boolean }> }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project users');
    }
    return response.json();
  },

  async addProjectUser(projectId: string, userId: string, role: 'admin' | 'member' | 'viewer'): Promise<{ success: boolean; message: string; user: any }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add user to project');
    }
    return response.json();
  },

  async updateProjectUserRole(projectId: string, userId: string, role: 'admin' | 'member' | 'viewer'): Promise<{ success: boolean; message: string; user: any }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user role');
    }
    return response.json();
  },

  async removeProjectUser(projectId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove user from project');
    }
    return response.json();
  },
};

export const designDocsApi = {
  async listDocs(projectId?: string): Promise<{ success: boolean; docs: DesignDoc[] }> {
    const url = projectId 
      ? `${API_BASE_URL}/api/design-docs?project_id=${projectId}`
      : `${API_BASE_URL}/api/design-docs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch design docs');
    return response.json();
  },

  async getDoc(docId: string): Promise<{ success: boolean; doc: DesignDoc }> {
    const response = await fetch(`${API_BASE_URL}/api/design-docs/${docId}`);
    if (!response.ok) throw new Error('Failed to fetch design doc');
    return response.json();
  },

  async createDoc(doc: Partial<DesignDoc>): Promise<{ success: boolean; doc: DesignDoc }> {
    const response = await fetch(`${API_BASE_URL}/api/design-docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!response.ok) throw new Error('Failed to create design doc');
    return response.json();
  },

  async updateDoc(docId: string, doc: Partial<DesignDoc>): Promise<{ success: boolean; doc: DesignDoc }> {
    const response = await fetch(`${API_BASE_URL}/api/design-docs/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!response.ok) throw new Error('Failed to update design doc');
    return response.json();
  },

  async deleteDoc(docId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/design-docs/${docId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete design doc');
    return response.json();
  },
};

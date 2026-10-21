/**
 * ==========================================================================
 * TECNO SYSTEM - HUB DE DEMANDAS (QUADRO KANBAN)
 * Script Principal: Vanilla JavaScript & HTML5 Drag and Drop API
 * ==========================================================================
 */

// Chave para armazenamento permanente no LocalStorage
const STORAGE_KEY = 'tecnosystem_kanban_tasks';

// --------------------------------------------------------------------------
// 1. SEED DATA AUTOMÁTICO (6 Demandas Corporativas Realistas)
// --------------------------------------------------------------------------
const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Troca de Notebook - TI',
    department: 'TI',
    priority: 'Alta',
    columnId: 1, // Backlog
    commentsCount: 4,
    attachmentsCount: 2,
    assigneeName: 'Carlos Eduardo',
    assigneeAvatar: 'CE'
  },
  {
    id: 'task-2',
    title: 'Admissão de Estagiário - RH',
    department: 'RH',
    priority: 'Média',
    columnId: 2, // Priorizado
    commentsCount: 2,
    attachmentsCount: 3,
    assigneeName: 'Mariana Souza',
    assigneeAvatar: 'MS'
  },
  {
    id: 'task-3',
    title: 'Aprovação de Reembolso - Financeiro',
    department: 'Financeiro',
    priority: 'Alta',
    columnId: 2, // Priorizado
    commentsCount: 5,
    attachmentsCount: 1,
    assigneeName: 'Felipe Rocha',
    assigneeAvatar: 'FR'
  },
  {
    id: 'task-4',
    title: 'Revisão de SLA de Servidores - TI',
    department: 'TI',
    priority: 'Média',
    columnId: 3, // Em Desenvolvimento
    commentsCount: 3,
    attachmentsCount: 0,
    assigneeName: 'Lucas Moura',
    assigneeAvatar: 'LM'
  },
  {
    id: 'task-5',
    title: 'Treinamento de Onboarding Q4 - Operações',
    department: 'Operações',
    priority: 'Baixa',
    columnId: 4, // Teste / Validação
    commentsCount: 1,
    attachmentsCount: 4,
    assigneeName: 'Beatriz Lima',
    assigneeAvatar: 'BL'
  },
  {
    id: 'task-6',
    title: 'Fechamento Mensal e Balanço - Financeiro',
    department: 'Financeiro',
    priority: 'Alta',
    columnId: 5, // Finalizado
    commentsCount: 6,
    attachmentsCount: 5,
    assigneeName: 'Renato Alves',
    assigneeAvatar: 'RA'
  }
];

// Paleta de gradientes para os Avatares de Colaboradores
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
  'linear-gradient(135deg, #64748b, #334155)'
];

// --------------------------------------------------------------------------
// 2. ESTADO DA APLICAÇÃO
// --------------------------------------------------------------------------
let tasks = [];
let taskToDeleteId = null;
let currentDeptFilter = 'all';
let currentSearchQuery = '';

// --------------------------------------------------------------------------
// 3. SELETORES DO DOM
// --------------------------------------------------------------------------
const kanbanBoard = document.getElementById('kanbanBoard');
const totalTasksCountEl = document.getElementById('totalTasksCount');

// Form de Criação
const createTaskForm = document.getElementById('createTaskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDeptSelect = document.getElementById('taskDeptSelect');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');
const taskColumnSelect = document.getElementById('taskColumnSelect');

// Barra de Filtros e Busca
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterPills = document.querySelectorAll('.filter-pill');

// Modal de Edição
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskIdInput = document.getElementById('editTaskId');
const editTaskTitleInput = document.getElementById('editTaskTitle');
const editTaskDeptSelect = document.getElementById('editTaskDept');
const editTaskPrioritySelect = document.getElementById('editTaskPriority');
const editTaskColumnSelect = document.getElementById('editTaskColumn');
const editAssigneeNameInput = document.getElementById('editAssigneeName');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Modal de Exclusão
const deleteModal = document.getElementById('deleteModal');
const deleteTaskTitlePreview = document.getElementById('deleteTaskTitlePreview');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// --------------------------------------------------------------------------
// 4. FUNÇÕES DE UTILIDADE E PERSISTÊNCIA
// --------------------------------------------------------------------------

/**
 * Carrega as tarefas do localStorage ou inicializa com o seed corporativo
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      tasks = JSON.parse(stored);
      // Garantir compatibilidade de tipos
      tasks.forEach(task => {
        task.columnId = parseInt(task.columnId, 10);
      });
    } else {
      tasks = [...INITIAL_TASKS];
      saveTasks();
    }
  } catch (error) {
    console.error('Erro ao ler tarefas do localStorage:', error);
    tasks = [...INITIAL_TASKS];
  }
}

/**
 * Salva a lista de tarefas no localStorage
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Erro ao gravar tarefas no localStorage:', error);
    showToast('Erro ao salvar dados localmente.', 'danger');
  }
}

/**
 * Gera iniciais do colaborador com base no nome
 */
function getInitials(name) {
  if (!name) return 'TS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Gera gradiente de fundo determinístico a partir do nome
 */
function getAvatarGradient(name) {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

/**
 * Sistema de Notificações Toast Moderno
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'danger') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger para animação de entrada
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remover após 3.5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}

// --------------------------------------------------------------------------
// 5. RENDERIZAÇÃO DO QUADRO KANBAN (READ)
// --------------------------------------------------------------------------

/**
 * Renderiza todos os cartões nas colunas corretas e atualiza contadores
 */
function renderBoard() {
  const columnContainers = {
    1: document.getElementById('cards-col-1'),
    2: document.getElementById('cards-col-2'),
    3: document.getElementById('cards-col-3'),
    4: document.getElementById('cards-col-4'),
    5: document.getElementById('cards-col-5')
  };

  const columnCounters = {
    1: document.getElementById('count-1'),
    2: document.getElementById('count-2'),
    3: document.getElementById('count-3'),
    4: document.getElementById('count-4'),
    5: document.getElementById('count-5')
  };

  // Limpar os containers
  for (let colId = 1; colId <= 5; colId++) {
    if (columnContainers[colId]) {
      columnContainers[colId].innerHTML = '';
    }
  }

  // Filtragem (busca de texto e filtro de departamento)
  const filteredTasks = tasks.filter(task => {
    const matchesDept = (currentDeptFilter === 'all' || task.department === currentDeptFilter);
    const query = currentSearchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      task.title.toLowerCase().includes(query) ||
      task.assigneeName.toLowerCase().includes(query) ||
      task.department.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });

  // Contadores por coluna
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Criar e posicionar os cartões
  filteredTasks.forEach(task => {
    const colId = task.columnId;
    if (columnContainers[colId]) {
      counts[colId] = (counts[colId] || 0) + 1;
      const cardElement = createCardElement(task);
      columnContainers[colId].appendChild(cardElement);
    }
  });

  // Atualizar os contadores de cada coluna
  for (let colId = 1; colId <= 5; colId++) {
    if (columnCounters[colId]) {
      columnCounters[colId].textContent = counts[colId];
    }

    // Se a coluna estiver vazia, exibir aviso sutil
    if (counts[colId] === 0 && columnContainers[colId]) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-column-msg';
      emptyMsg.innerHTML = `
        <i class="fa-regular fa-folder-open"></i>
        <span>Nenhuma demanda aqui</span>
      `;
      columnContainers[colId].appendChild(emptyMsg);
    }
  }

  // Atualizar contador total
  if (totalTasksCountEl) {
    totalTasksCountEl.textContent = tasks.length;
  }
}

/**
 * Cria a estrutura DOM de um cartão Kanban
 */
function createCardElement(task) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-id', task.id);
  card.id = `card-${task.id}`;

  // Mapeamento de classes de estilo para prioridade
  let priorityClass = 'badge-medium';
  if (task.priority === 'Baixa') priorityClass = 'badge-low';
  if (task.priority === 'Alta') priorityClass = 'badge-high';

  // Mapeamento de classes para departamento
  let deptClass = 'badge-dept-ti';
  if (task.department === 'RH') deptClass = 'badge-dept-rh';
  if (task.department === 'Financeiro') deptClass = 'badge-dept-fin';
  if (task.department === 'Operações') deptClass = 'badge-dept-ops';

  const initials = task.assigneeAvatar || getInitials(task.assigneeName);
  const avatarBg = getAvatarGradient(task.assigneeName);

  card.innerHTML = `
    <div class="card-header-tags">
      <div class="card-badges">
        <span class="badge-dept ${deptClass}">${escapeHtml(task.department)}</span>
        <span class="badge-priority ${priorityClass}">
          <i class="fa-solid fa-circle-dot"></i> ${escapeHtml(task.priority)}
        </span>
      </div>
      <button class="card-edit-hint" title="Editar tarefa" aria-label="Editar">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
    </div>

    <div class="card-body" title="Clique para editar detalhes">
      <h3 class="card-title">${escapeHtml(task.title)}</h3>
    </div>

    <div class="card-footer">
      <div class="card-footer-left">
        <span class="card-metric" title="${task.commentsCount} comentários">
          <i class="fa-regular fa-comment"></i> ${task.commentsCount}
        </span>
        <span class="card-metric" title="${task.attachmentsCount} anexos">
          <i class="fa-solid fa-paperclip"></i> ${task.attachmentsCount}
        </span>
      </div>

      <div class="card-footer-right">
        <div class="card-avatar" style="background: ${avatarBg};" title="Responsável: ${escapeHtml(task.assigneeName)}">
          ${escapeHtml(initials)}
        </div>
        <button class="card-delete-btn" title="Excluir tarefa" aria-label="Excluir tarefa">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;

  // Anexar eventos específicos do cartão
  attachCardEvents(card, task);

  return card;
}

/**
 * Escapa HTML para prevenir injeção de scripts
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --------------------------------------------------------------------------
// 6. EVENTOS DE CARTÃO: DRAG & DROP NATIVO, EDIT E DELETE
// --------------------------------------------------------------------------

/**
 * Anexa listeners ao cartão (Drag events, clique para editar, clique para excluir)
 */
function attachCardEvents(card, task) {
  // Drag Start
  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
  });

  // Drag End
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    // Remove qualquer destaque de hover remanescente em todas as colunas
    document.querySelectorAll('.kanban-cards').forEach(container => {
      container.classList.remove('cards-hover');
    });
  });

  // Clique no corpo/título ou no botão de editar -> Abre Modal de Edição (UPDATE)
  const cardBody = card.querySelector('.card-body');
  const editHintBtn = card.querySelector('.card-edit-hint');

  const openEditHandler = (e) => {
    e.stopPropagation();
    openEditModal(task.id);
  };

  cardBody.addEventListener('click', openEditHandler);
  if (editHintBtn) {
    editHintBtn.addEventListener('click', openEditHandler);
  }

  // Clique no botão da lixeira -> Abre Modal de Confirmação (DELETE)
  const deleteBtn = card.querySelector('.card-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(task.id);
    });
  }
}

// --------------------------------------------------------------------------
// 7. DRAG & DROP NATIVO NAS COLUNAS (HTML5 API)
// --------------------------------------------------------------------------

/**
 * Inicializa os ouvintes das colunas para gerenciar DragOver, DragLeave e Drop
 */
function initColumnDragAndDrop() {
  const columnContainers = document.querySelectorAll('.kanban-cards');

  columnContainers.forEach(container => {
    // DRAGOVER: Necessário e.preventDefault() para permitir o drop
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!container.classList.contains('cards-hover')) {
        container.classList.add('cards-hover');
      }

      // Cálculo de posição para inserção visual dinâmica (como no Trello/Jira)
      const draggingCard = document.querySelector('.kanban-card.dragging');
      if (draggingCard) {
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
          container.appendChild(draggingCard);
        } else {
          container.insertBefore(draggingCard, afterElement);
        }
      }
    });

    // DRAGLEAVE: Remove o destaque visual ao sair da coluna
    container.addEventListener('dragleave', (e) => {
      // Evita disparar se estiver passando por elementos filhos dentro do container
      if (e.relatedTarget && container.contains(e.relatedTarget)) {
        return;
      }
      container.classList.remove('cards-hover');
    });

    // DROP: Executa a troca de coluna e atualiza o estado
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('cards-hover');

      const taskId = e.dataTransfer.getData('text/plain');
      const targetColumnId = parseInt(container.getAttribute('data-column-id'), 10);

      if (!taskId || !targetColumnId) return;

      const task = tasks.find(t => t.id.toString() === taskId.toString());
      if (task) {
        const previousColId = task.columnId;
        task.columnId = targetColumnId;

        // Se mudou de coluna, notifica com toast
        if (previousColId !== targetColumnId) {
          const colNames = {
            1: 'Backlog',
            2: 'Priorizado',
            3: 'Em Desenvolvimento',
            4: 'Teste / Validação',
            5: 'Finalizado'
          };
          showToast(`Demanda movida para "${colNames[targetColumnId]}".`, 'info');
        }

        saveTasks();
        renderBoard();
      }
    });
  });
}

/**
 * Determina o elemento abaixo do cursor para ordenação natural de cartões
 */
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --------------------------------------------------------------------------
// 8. OPERAÇÃO CREATE (Cadastro de Tarefas na Barra Superior)
// --------------------------------------------------------------------------

/**
 * Cadastra uma nova tarefa
 */
function handleCreateTask(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const department = taskDeptSelect.value;
  const priority = taskPrioritySelect.value;
  const columnId = parseInt(taskColumnSelect.value, 10);

  if (!title) {
    showToast('Por favor, informe o título da tarefa.', 'danger');
    taskTitleInput.focus();
    return;
  }

  // Nomes de colaboradores sugeridos por departamento
  const deptAssignees = {
    'TI': ['Lucas Moura', 'Carlos Eduardo', 'Juliana Costa'],
    'RH': ['Mariana Souza', 'Patrícia Prado', 'Camila Dias'],
    'Financeiro': ['Felipe Rocha', 'Renato Alves', 'Fernanda Lima'],
    'Operações': ['Beatriz Lima', 'Thiago Mendes', 'Gabriel Silva']
  };

  const pool = deptAssignees[department] || ['Equipe Tecno'];
  const randomAssignee = pool[Math.floor(Math.random() * pool.length)];

  const newTask = {
    id: `task-${Date.now()}`,
    title: title,
    department: department,
    priority: priority,
    columnId: columnId,
    commentsCount: 0,
    attachmentsCount: 0,
    assigneeName: randomAssignee,
    assigneeAvatar: getInitials(randomAssignee)
  };

  // Insere a nova tarefa no início
  tasks.unshift(newTask);
  saveTasks();
  renderBoard();

  // Reset do formulário de criação
  taskTitleInput.value = '';
  taskTitleInput.focus();

  showToast(`Demanda "${title}" adicionada com sucesso!`, 'success');
}

// --------------------------------------------------------------------------
// 9. OPERAÇÃO UPDATE (Modal de Edição)
// --------------------------------------------------------------------------

/**
 * Abre o modal de edição preenchido com os dados da tarefa
 */
function openEditModal(taskId) {
  const task = tasks.find(t => t.id.toString() === taskId.toString());
  if (!task) return;

  editTaskIdInput.value = task.id;
  editTaskTitleInput.value = task.title;
  editTaskDeptSelect.value = task.department;
  editTaskPrioritySelect.value = task.priority;
  editTaskColumnSelect.value = task.columnId;
  editAssigneeNameInput.value = task.assigneeName;

  editModal.classList.add('active');
  editModal.setAttribute('aria-hidden', 'false');
  editTaskTitleInput.focus();
}

/**
 * Fecha o modal de edição
 */
function closeEditModal() {
  editModal.classList.remove('active');
  editModal.setAttribute('aria-hidden', 'true');
  editTaskForm.reset();
}

/**
 * Salva as alterações feitas no modal de edição
 */
function handleSaveEdit(e) {
  e.preventDefault();

  const taskId = editTaskIdInput.value;
  const task = tasks.find(t => t.id.toString() === taskId.toString());

  if (!task) {
    showToast('Tarefa não encontrada.', 'danger');
    closeEditModal();
    return;
  }

  const updatedTitle = editTaskTitleInput.value.trim();
  const updatedAssignee = editAssigneeNameInput.value.trim();

  if (!updatedTitle) {
    showToast('O título não pode estar em branco.', 'danger');
    editTaskTitleInput.focus();
    return;
  }

  task.title = updatedTitle;
  task.department = editTaskDeptSelect.value;
  task.priority = editTaskPrioritySelect.value;
  task.columnId = parseInt(editTaskColumnSelect.value, 10);
  task.assigneeName = updatedAssignee || 'Equipe Tecno';
  task.assigneeAvatar = getInitials(task.assigneeName);

  saveTasks();
  renderBoard();
  closeEditModal();

  showToast('Demanda atualizada com sucesso!', 'success');
}

// --------------------------------------------------------------------------
// 10. OPERAÇÃO DELETE (Modal de Confirmação de Exclusão)
// --------------------------------------------------------------------------

/**
 * Abre o modal de confirmação de exclusão
 */
function openDeleteModal(taskId) {
  const task = tasks.find(t => t.id.toString() === taskId.toString());
  if (!task) return;

  taskToDeleteId = task.id;
  deleteTaskTitlePreview.textContent = task.title;

  deleteModal.classList.add('active');
  deleteModal.setAttribute('aria-hidden', 'false');
  confirmDeleteBtn.focus();
}

/**
 * Fecha o modal de confirmação de exclusão
 */
function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deleteModal.setAttribute('aria-hidden', 'true');
  taskToDeleteId = null;
}

/**
 * Confirma a exclusão definitiva da tarefa
 */
function handleConfirmDelete() {
  if (!taskToDeleteId) return;

  const taskIndex = tasks.findIndex(t => t.id.toString() === taskToDeleteId.toString());
  if (taskIndex !== -1) {
    const deletedTaskTitle = tasks[taskIndex].title;
    tasks.splice(taskIndex, 1);
    saveTasks();
    renderBoard();
    showToast(`Demanda "${deletedTaskTitle}" excluída!`, 'danger');
  }

  closeDeleteModal();
}

// --------------------------------------------------------------------------
// 11. FILTRAGEM, BUSCA E INTERATIVIDADE
// --------------------------------------------------------------------------

/**
 * Inicializa a barra de pesquisa rápida e filtros por departamento
 */
function initFiltersAndSearch() {
  // Input de Busca
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    clearSearchBtn.style.display = currentSearchQuery ? 'flex' : 'none';
    renderBoard();
  });

  // Botão para limpar a busca
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderBoard();
  });

  // Pílulas de filtro de departamento
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentDeptFilter = pill.getAttribute('data-filter');
      renderBoard();
    });
  });
}

// --------------------------------------------------------------------------
// 12. INICIALIZAÇÃO GERAL E EVENT LISTENERS GLOBAIS
// --------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Carregar dados e renderizar
  loadTasks();
  renderBoard();
  initColumnDragAndDrop();
  initFiltersAndSearch();

  // Formulário de Criação
  createTaskForm.addEventListener('submit', handleCreateTask);

  // Modal de Edição
  editTaskForm.addEventListener('submit', handleSaveEdit);
  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // Modal de Exclusão
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Fechar modais ao clicar no backdrop escuro
  window.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Fechar modais com tecla ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal.classList.contains('active')) closeEditModal();
      if (deleteModal.classList.contains('active')) closeDeleteModal();
    }
  });
});

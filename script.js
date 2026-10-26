/**
 * ==========================================================================
 * TECNO SYSTEM - HUB DE DEMANDAS (QUADRO KANBAN)
 * Script Principal: Vanilla JavaScript & HTML5 Drag and Drop API
 * ==========================================================================
 *
 * @file script.js
 * @description Módulo central de controle e gerenciamento do quadro Kanban corporativo.
 * Implementa todo o ciclo de vida das demandas (CRUD), armazenamento local via
 * LocalStorage, drag-and-drop nativo com a API HTML5, renderização reativa da interface,
 * filtros por departamento e mecanismo de busca textual em tempo real.
 * @author Equipe Tecno System
 * @version 1.0.0
 */

// --------------------------------------------------------------------------
// 1. CONSTANTES GLOBAIS E SEED DATA
// --------------------------------------------------------------------------

/**
 * Chave de armazenamento persistente no LocalStorage do navegador.
 * Isola as demandas deste quadro evitando colisões com outros módulos do domínio.
 * @type {string}
 */
const STORAGE_KEY = 'tecnosystem_kanban_tasks';

/**
 * Definição da estrutura de dados de uma demanda corporativa (Tarefa).
 * @typedef {Object} Task
 * @property {string} id - Identificador único alfanumérico da demanda.
 * @property {string} title - Título descritivo da tarefa.
 * @property {string} description - Descrição da tarefa.
 * @property {('TI'|'RH'|'Financeiro'|'Operações')} department - Departamento encarregado.
 * @property {('Baixa'|'Média'|'Alta')} priority - Severidade de prioridade da demanda.
 * @property {number} columnId - Coluna do fluxo onde a demanda reside (1 a 5).
 * @property {number} commentsCount - Total de comentários corporativos registrados.
 * @property {Array<Comment>} [comments] - Comentários registrados na tarefa.
 * @property {number} attachmentsCount - Total de arquivos anexos vinculados.
 * @property {string} assigneeName - Nome do profissional responsável pela execução.
 * @property {string} assigneeAvatar - Iniciais para renderização no avatar circular.
 */

/**
 * @typedef {Object} Comment
 * @property {string} id - Identificador único do comentário.
 * @property {string} text - Conteúdo do comentário.
 * @property {string} author - Autor do comentário.
 * @property {string} createdAt - Data e hora em formato ISO.
 */

/**
 * Dados de semente inicial (seed data) com 6 demandas corporativas realistas.
 * Utilizado para popular a aplicação no primeiro acesso ou caso o LocalStorage esteja limpo.
 * @type {Array<Task>}
 */
const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Troca de Notebook - TI',
    description: 'Um notebook encontra-se defeituoso, favor trocar o quanto antes!',
    department: 'TI',
    priority: 'Alta',
    columnId: 1, // Coluna 1: Backlog
    commentsCount: 4,
    attachmentsCount: 2,
    assigneeName: 'Carlos Eduardo',
    assigneeAvatar: 'CE'
  },
  {
    id: 'task-2',
    title: 'Admissão de Estagiário - RH',
    description: 'Conferir a documentação enviada pelo candidato e finalizar o cadastro no sistema para início imediato.',
    department: 'RH',
    priority: 'Média',
    columnId: 2, // Coluna 2: Priorizado
    commentsCount: 2,
    attachmentsCount: 3,
    assigneeName: 'Mariana Souza',
    assigneeAvatar: 'MS'
  },
  {
    id: 'task-3',
    title: 'Aprovação de Reembolso - Financeiro',
    description: 'Solicitação de reembolso de despesas de viagem aguardando validação do comprovante e liberação do pagamento.',
    department: 'Financeiro',
    priority: 'Alta',
    columnId: 2, // Coluna 2: Priorizado
    commentsCount: 5,
    attachmentsCount: 1,
    assigneeName: 'Felipe Rocha',
    assigneeAvatar: 'FR'
  },
  {
    id: 'task-4',
    title: 'Revisão de SLA de Servidores - TI',
    description: 'Analisar os indicadores de disponibilidade e tempo de resposta dos servidores para atualizar as metas de SLA.',
    department: 'TI',
    priority: 'Média',
    columnId: 3, // Coluna 3: Em Desenvolvimento
    commentsCount: 3,
    attachmentsCount: 0,
    assigneeName: 'Lucas Moura',
    assigneeAvatar: 'LM'
  },
  {
    id: 'task-5',
    title: 'Treinamento de Onboarding Q4 - Operações',
    description: 'Revisar as apresentações e validar o cronograma de integração para os novos colaboradores do quarto trimestre.',
    department: 'Operações',
    priority: 'Baixa',
    columnId: 4, // Coluna 4: Teste / Validação
    commentsCount: 1,
    attachmentsCount: 4,
    assigneeName: 'Beatriz Lima',
    assigneeAvatar: 'BL'
  },
  {
    id: 'task-6',
    title: 'Fechamento Mensal e Balanço - Financeiro',
    description: 'Consolidação das movimentações financeiras, conciliação bancária e emissão dos relatórios contábeis do mês.',
    department: 'Financeiro',
    priority: 'Alta',
    columnId: 5, // Coluna 5: Finalizado
    commentsCount: 6,
    attachmentsCount: 5,
    assigneeName: 'Renato Alves',
    assigneeAvatar: 'RA'
  }
];

/**
 * Paleta corporativa de gradientes para os avatares dos colaboradores.
 * O gradiente é atribuído de forma determinística por meio de um cálculo de hash sobre o nome.
 * @type {Array<string>}
 */
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
// 2. ESTADO DA APLICAÇÃO (STATE MANAGEMENT)
// --------------------------------------------------------------------------

/**
 * Lista em memória das tarefas ativas gerenciadas pelo quadro.
 * @type {Array<Task>}
 */
let tasks = [];

/**
 * ID da tarefa temporariamente selecionada para confirmação de exclusão no modal.
 * @type {string|null}
 */
let taskToDeleteId = null;

/**
 * Filtro departamental e de prioridade atualmente ativo na barra de ferramentas ('all' exibe todos).
 * @type {string}
 */
let currentDeptFilter = 'all';
let currentPriorityFilter = 'all';

/**
 * Termo de busca textual aplicado em tempo real na listagem.
 * @type {string}
 */
let currentSearchQuery = '';

// --------------------------------------------------------------------------
// 3. SELETORES E REFERÊNCIAS DO DOM (CACHE)
// --------------------------------------------------------------------------

// Contêiner principal e contador geral do quadro
const kanbanBoard = document.getElementById('kanbanBoard');
const totalTasksCountEl = document.getElementById('totalTasksCount');

// Formulário superior de inclusão rápida de demandas (Create)
const createTaskForm = document.getElementById('createTaskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDescInput = document.getElementById('taskDescInput');
const taskDeptSelect = document.getElementById('taskDeptSelect');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');

// Barra de busca e filtros departamentais
const searchInput = document.getElementById('searchInput');
const filterPills = document.querySelectorAll('.filter-pill[data-filter]');
const priorityPills = document.querySelectorAll('.filter-pill[data-priority]');

// Componentes do modal de edição de tarefas (Update)
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskIdInput = document.getElementById('editTaskId');
const editTaskTitleInput = document.getElementById('editTaskTitle');
const editTaskDescriptionInput = document.getElementById('editTaskDescription');
const editTaskDeptSelect = document.getElementById('editTaskDept');
const editTaskPrioritySelect = document.getElementById('editTaskPriority');
const editTaskColumnSelect = document.getElementById('editTaskColumn');
const editAssigneeNameInput = document.getElementById('editAssigneeName');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Componentes do modal de comentários
const commentsModal = document.getElementById('commentsModal');
const commentsTaskTitle = document.getElementById('commentsTaskTitle');
const commentsList = document.getElementById('commentsList');
const commentForm = document.getElementById('commentForm');
const commentTextInput = document.getElementById('commentText');
const closeCommentsModalBtn = document.getElementById('closeCommentsModalBtn');
const cancelCommentsBtn = document.getElementById('cancelCommentsBtn');
let taskWithOpenCommentsId = null;
let editingCommentId = null;

// Componentes do modal de confirmação de exclusão (Delete)
const deleteModal = document.getElementById('deleteModal');
const deleteTaskTitlePreview = document.getElementById('deleteTaskTitlePreview');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Contêiner global para notificações flutuantes (Toasts)
const toastContainer = document.getElementById('toastContainer');

// --------------------------------------------------------------------------
// 4. FUNÇÕES DE UTILIDADE E PERSISTÊNCIA
// --------------------------------------------------------------------------

/**
 * Carrega a coleção de tarefas do LocalStorage ou injeta o seed corporativo padrão.
 * Executa conversão expressa de columnId para inteiro, prevenindo divergências de tipagem estrita.
 *
 * @function loadTasks
 * @returns {void}
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      tasks = JSON.parse(stored);
      // Garantir compatibilidade de tipos: assegura que columnId seja sempre numérico
      tasks.forEach(task => {
        task.columnId = parseInt(task.columnId, 10);
        if (!Array.isArray(task.comments)) task.comments = [];
      });
    } else {
      // Primeiro carregamento: inicializa o estado com sementes corporativas
      tasks = [...INITIAL_TASKS];
      saveTasks();
    }
  } catch (error) {
    // Tratamento defensivo em caso de corrupção do JSON ou bloqueio de storage no navegador
    console.error('Erro ao ler tarefas do localStorage:', error);
    tasks = [...INITIAL_TASKS];
  }
}

/**
 * Persiste o estado atual das tarefas no LocalStorage como string JSON serializada.
 *
 * @function saveTasks
 * @returns {void}
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
 * Extrai as iniciais de exibição a partir do nome completo de um colaborador.
 * - Caso nome simples: retorna os 2 primeiros caracteres.
 * - Caso composto: retorna a inicial do primeiro nome somada à do último sobrenome.
 *
 * @function getInitials
 * @param {string} name - Nome completo do colaborador.
 * @returns {string} Iniciais em maiúsculas (máximo 2 caracteres).
 */
function getInitials(name) {
  if (!name) return 'TS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retorna um gradiente visualmente determinístico derivado de um hash da string do nome.
 * Garante que o mesmo colaborador mantenha sempre a mesma identidade cromática no quadro.
 *
 * @function getAvatarGradient
 * @param {string} name - Nome do colaborador utilizado como semente de hash.
 * @returns {string} Expressão CSS do gradiente linear correspondente.
 */
function getAvatarGradient(name) {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  // Algoritmo clássico de dispersão bitwise (DJB2) para mapeamento uniforme
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

/**
 * Exibe uma notificação temporária do tipo Toast na área inferior da interface.
 * Controla os gatilhos de entrada (requestAnimationFrame) e descarte assíncrono (transitionend).
 *
 * @function showToast
 * @param {string} message - Texto informativo a ser apresentado.
 * @param {('info'|'success'|'danger')} [type='info'] - Tipo visual que define ícone e cor da borda.
 * @returns {void}
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Seleção de ícone semântico via FontAwesome
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'danger') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger para animação fluida de transição CSS
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Temporizador para desvanecimento e remoção física do nó do DOM
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
 * Renderiza integralmente todos os cartões nas colunas correspondentes e atualiza contadores.
 * Aplica os critérios de busca textual e filtragem por departamento de forma reativa.
 *
 * @function renderBoard
 * @returns {void}
 */
function renderBoard() {
  // Mapeamento dos contêineres de cartões por ID de coluna
  const columnContainers = {
    1: document.getElementById('cards-col-1'),
    2: document.getElementById('cards-col-2'),
    3: document.getElementById('cards-col-3'),
    4: document.getElementById('cards-col-4'),
    5: document.getElementById('cards-col-5')
  };

  // Mapeamento dos elementos de contadores numéricos
  const columnCounters = {
    1: document.getElementById('count-1'),
    2: document.getElementById('count-2'),
    3: document.getElementById('count-3'),
    4: document.getElementById('count-4'),
    5: document.getElementById('count-5')
  };

  // Limpar os contêineres antes da reinserção
  for (let colId = 1; colId <= 5; colId++) {
    if (columnContainers[colId]) {
      columnContainers[colId].innerHTML = '';
    }
  }

   // Pipeline de filtragem: combina departamento, prioridade e busca textual
  const filteredTasks = tasks.filter(task => {    const matchesDept = (currentDeptFilter === 'all' || task.department === currentDeptFilter);
    const matchesPriority = (currentPriorityFilter === 'all' || task.priority === currentPriorityFilter);
    const query = currentSearchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      task.title.toLowerCase().includes(query) ||
      task.assigneeName.toLowerCase().includes(query) ||
      task.department.toLowerCase().includes(query) ||
      task.priority.toLowerCase().includes(query);

    return matchesDept && matchesPriority && matchesSearch;});

  // Acumuladores de contagem de demandas por coluna
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Construção e posicionamento dos cartões no DOM
  filteredTasks.forEach(task => {
    const colId = task.columnId;
    if (columnContainers[colId]) {
      counts[colId] = (counts[colId] || 0) + 1;
      const cardElement = createCardElement(task);
      columnContainers[colId].appendChild(cardElement);
    }
  });

  // Atualização dos indicadores de cada coluna e inserção de mensagem quando vazia
  for (let colId = 1; colId <= 5; colId++) {
    if (columnCounters[colId]) {
      columnCounters[colId].textContent = counts[colId];
    }

    // Se a coluna estiver vazia, exibe placeholder informativo
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

  // Atualizar contador cumulativo no topo do cabeçalho
  if (totalTasksCountEl) {
    totalTasksCountEl.textContent = tasks.length;
  }
}

/**
 * Cria a estrutura DOM completa de um cartão Kanban com suporte a Drag & Drop.
 *
 * @function createCardElement
 * @param {Task} task - Objeto da tarefa a ser renderizada.
 * @returns {HTMLDivElement} Elemento DOM do cartão Kanban pronto para inserção.
 */
function createCardElement(task) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-id', task.id);
  card.id = `card-${task.id}`;

  // Resolução de classes de badge para prioridade
  let priorityClass = 'badge-medium';
  if (task.priority === 'Baixa') priorityClass = 'badge-low';
  if (task.priority === 'Alta') priorityClass = 'badge-high';

  // Resolução de classes de badge para departamento
  let deptClass = 'badge-dept-ti';
  if (task.department === 'RH') deptClass = 'badge-dept-rh';
  if (task.department === 'Financeiro') deptClass = 'badge-dept-fin';
  if (task.department === 'Operações') deptClass = 'badge-dept-ops';

  const initials = task.assigneeAvatar || getInitials(task.assigneeName);
  const avatarBg = getAvatarGradient(task.assigneeName);
  const commentsCount = Array.isArray(task.comments) ? task.comments.length : 0;

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
        <button type="button" class="card-metric card-comments-btn" title="Ver ou adicionar comentários" aria-label="${commentsCount} comentários. Abrir conversa">
          <i class="fa-regular fa-comment"></i> ${commentsCount}
        </button>
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

  // Anexar ouvintes de eventos interativos ao cartão recém-criado
  attachCardEvents(card, task);

  return card;
}

/**
 * Sanitiza sequências de caracteres para prevenir ataques de Cross-Site Scripting (XSS).
 *
 * @function escapeHtml
 * @param {string|number|null|undefined} text - Valor textual de entrada.
 * @returns {string} String com entidades HTML sensíveis devidamente codificadas.
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
 * Anexa listeners ao cartão (ciclo de arraste, clique para edição e exclusão).
 *
 * @function attachCardEvents
 * @param {HTMLElement} card - Elemento DOM do cartão.
 * @param {Task} task - Objeto de dados correspondente à demanda.
 * @returns {void}
 */
function attachCardEvents(card, task) {
  // DRAGSTART: Inicia a transferência de dados e define o feedback visual de arraste
  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
  });

  // DRAGEND: Finaliza o arraste e restaura os estilos normais dos contêineres
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

  const commentsBtn = card.querySelector('.card-comments-btn');
  commentsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCommentsModal(task.id);
  });
}

// --------------------------------------------------------------------------
// 7. DRAG & DROP NATIVO NAS COLUNAS (HTML5 API)
// --------------------------------------------------------------------------

/**
 * Inicializa os ouvintes das colunas para gerenciar os eventos dragover, dragleave e drop.
 *
 * @function initColumnDragAndDrop
 * @returns {void}
 */
function initColumnDragAndDrop() {
  const columnContainers = document.querySelectorAll('.kanban-cards');

  columnContainers.forEach(container => {
    // DRAGOVER: e.preventDefault() é mandatório pela especificação HTML5 para permitir a queda (drop)
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
 * Determina geometricamente o elemento abaixo do cursor para ordenação natural de cartões.
 *
 * @function getDragAfterElement
 * @param {HTMLElement} container - O contêiner de cartões da coluna.
 * @param {number} y - Posição Y do cursor (e.clientY).
 * @returns {HTMLElement|undefined} O elemento subsequente de referência para ordenação.
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
 * Processa o cadastro de uma nova demanda vinda do formulário superior.
 *
 * @function handleCreateTask
 * @param {SubmitEvent} e - Evento de envio do formulário.
 * @returns {void}
 */
function handleCreateTask(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const department = taskDeptSelect.value;
  const priority = taskPrioritySelect.value;
  const columnId = 1; // Toda nova tarefa nasce no Backlog

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
    description: description,
    department: department,
    priority: priority,
    columnId: columnId,
    commentsCount: 0,
    comments: [],
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
 * Abre o modal de edição preenchido com os dados da tarefa selecionada.
 *
 * @function openEditModal
 * @param {string} taskId - Identificador da tarefa.
 * @returns {void}
 */
function openEditModal(taskId) {
  const task = tasks.find(t => t.id.toString() === taskId.toString());
  if (!task) return;

  editTaskIdInput.value = task.id;
  editTaskTitleInput.value = task.title;
  editTaskDescriptionInput.value = task.description;
  editTaskDeptSelect.value = task.department;
  editTaskPrioritySelect.value = task.priority;
  editTaskColumnSelect.value = task.columnId;
  editAssigneeNameInput.value = task.assigneeName;

  editModal.classList.add('active');
  editModal.setAttribute('aria-hidden', 'false');
  editTaskTitleInput.focus();
}

/**
 * Fecha o modal de edição e limpa os campos do formulário.
 *
 * @function closeEditModal
 * @returns {void}
 */
function closeEditModal() {
  editModal.classList.remove('active');
  editModal.setAttribute('aria-hidden', 'true');
  editTaskForm.reset();
}

function openCommentsModal(taskId) {
  const task = tasks.find(t => t.id.toString() === taskId.toString());
  if (!task) {
    showToast('Tarefa não encontrada.', 'danger');
    return;
  }

  taskWithOpenCommentsId = task.id;
  commentsTaskTitle.textContent = task.title;
  renderComments(task);
  commentsModal.classList.add('active');
  commentsModal.setAttribute('aria-hidden', 'false');
  commentTextInput.focus();
}

function renderComments(task) {
  const comments = Array.isArray(task.comments) ? task.comments : [];
  if (comments.length === 0) {
    commentsList.innerHTML = '';
    return;
  }

  commentsList.innerHTML = comments.map(comment => {
    const date = new Date(comment.createdAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const isEditing = comment.id === editingCommentId;
    return `
      <article class="comment-item">
        <div class="comment-meta">
          <strong>${escapeHtml(comment.author || 'Você')}</strong>
          <time>${escapeHtml(dateLabel)}</time>
        </div>
        ${isEditing ? `
          <form class="comment-edit-form" data-comment-id="${escapeHtml(comment.id)}">
            <textarea rows="3" maxlength="1000" required aria-label="Editar comentário">${escapeHtml(comment.text)}</textarea>
            <div class="comment-edit-actions">
              <button type="button" class="btn-secondary" data-comment-action="cancel-edit">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar</button>
            </div>
          </form>
        ` : `
          <p>${escapeHtml(comment.text)}</p>
          <div class="comment-actions">
            <button type="button" data-comment-action="edit" data-comment-id="${escapeHtml(comment.id)}" aria-label="Editar comentário">
              <i class="fa-regular fa-pen-to-square"></i> Editar
            </button>
            <button type="button" class="comment-delete-action" data-comment-action="delete" data-comment-id="${escapeHtml(comment.id)}" aria-label="Excluir comentário">
              <i class="fa-regular fa-trash-can"></i> Excluir
            </button>
          </div>
        `}
      </article>
    `;
  }).join('');
  commentsList.scrollTop = commentsList.scrollHeight;
}

function closeCommentsModal() {
  commentsModal.classList.remove('active');
  commentsModal.setAttribute('aria-hidden', 'true');
  commentForm.reset();
  taskWithOpenCommentsId = null;
  editingCommentId = null;
}

function handleCommentListClick(e) {
  const actionButton = e.target.closest('[data-comment-action]');
  if (!actionButton) return;

  const task = tasks.find(t => t.id === taskWithOpenCommentsId);
  if (!task || !Array.isArray(task.comments)) return;

  const action = actionButton.dataset.commentAction;
  const commentId = actionButton.dataset.commentId;

  if (action === 'cancel-edit') {
    editingCommentId = null;
    renderComments(task);
    return;
  }

  const comment = task.comments.find(item => item.id === commentId);
  if (!comment) {
    showToast('Comentário não encontrado.', 'danger');
    renderComments(task);
    return;
  }

  if (action === 'edit') {
    editingCommentId = comment.id;
    renderComments(task);
    commentsList.querySelector('.comment-edit-form textarea').focus();
    return;
  }

  if (action === 'delete' && window.confirm('Tem certeza de que deseja excluir este comentário?')) {
    task.comments = task.comments.filter(item => item.id !== commentId);
    task.commentsCount = task.comments.length;
    editingCommentId = null;
    saveTasks();
    renderComments(task);
    renderBoard();
    showToast('Comentário excluído.', 'success');
  }
}

function handleEditComment(e) {
  const form = e.target.closest('.comment-edit-form');
  if (!form) return;
  e.preventDefault();

  const task = tasks.find(t => t.id === taskWithOpenCommentsId);
  const comment = task?.comments?.find(item => item.id === form.dataset.commentId);
  if (!task || !comment) {
    showToast('Comentário não encontrado.', 'danger');
    if (task) renderComments(task);
    return;
  }

  const updatedText = form.querySelector('textarea').value.trim();
  if (!updatedText) {
    showToast('O comentário não pode ficar em branco.', 'danger');
    form.querySelector('textarea').focus();
    return;
  }

  comment.text = updatedText;
  editingCommentId = null;
  saveTasks();
  renderComments(task);
  showToast('Comentário atualizado.', 'success');
}

function handleAddComment(e) {
  e.preventDefault();
  const text = commentTextInput.value.trim();
  if (!text) {
    showToast('Digite um comentário antes de enviar.', 'danger');
    commentTextInput.focus();
    return;
  }

  const task = tasks.find(t => t.id === taskWithOpenCommentsId);
  if (!task) {
    showToast('Tarefa não encontrada.', 'danger');
    closeCommentsModal();
    return;
  }

  if (!Array.isArray(task.comments)) task.comments = [];
  task.comments.push({
    id: `comment-${Date.now()}`,
    text,
    author: 'Você',
    createdAt: new Date().toISOString()
  });
  task.commentsCount = task.comments.length;

  saveTasks();
  renderComments(task);
  renderBoard();
  commentForm.reset();
  commentTextInput.focus();
  showToast('Comentário adicionado com sucesso!', 'success');
}

/**
 * Salva as alterações feitas no modal de edição, persistindo as atualizações.
 *
 * @function handleSaveEdit
 * @param {SubmitEvent} e - Evento de envio do formulário.
 * @returns {void}
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
  const updatedDescription = editTaskDescriptionInput.value.trim();

  if (!updatedTitle) {
    showToast('O título não pode estar em branco.', 'danger');
    editTaskTitleInput.focus();
    return;
  }

  task.title = updatedTitle;
  task.description = updatedDescription;
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
 * Abre o modal de confirmação de exclusão da demanda.
 *
 * @function openDeleteModal
 * @param {string} taskId - Identificador da tarefa a ser excluída.
 * @returns {void}
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
 * Fecha o modal de confirmação de exclusão sem remover a demanda.
 *
 * @function closeDeleteModal
 * @returns {void}
 */
function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deleteModal.setAttribute('aria-hidden', 'true');
  taskToDeleteId = null;
}

/**
 * Confirma a exclusão definitiva da tarefa do estado e do armazenamento local.
 *
 * @function handleConfirmDelete
 * @returns {void}
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
 * Inicializa a barra de pesquisa rápida e filtros por departamento.
 *
 * @function initFiltersAndSearch
 * @returns {void}
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
  priorityPills.forEach(pill => {
    pill.addEventListener('click', () => {
      priorityPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentPriorityFilter = pill.getAttribute('data-priority');
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

  // Modal de Comentários
  commentForm.addEventListener('submit', handleAddComment);
  closeCommentsModalBtn.addEventListener('click', closeCommentsModal);
  cancelCommentsBtn.addEventListener('click', closeCommentsModal);
  commentsList.addEventListener('click', handleCommentListClick);
  commentsList.addEventListener('submit', handleEditComment);

  // Modal de Exclusão
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Fechar modais ao clicar no backdrop escuro
  window.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
    if (e.target === commentsModal) closeCommentsModal();
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Fechar modais com tecla ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal.classList.contains('active')) closeEditModal();
      if (commentsModal.classList.contains('active')) closeCommentsModal();
      if (deleteModal.classList.contains('active')) closeDeleteModal();
    }
  });
});

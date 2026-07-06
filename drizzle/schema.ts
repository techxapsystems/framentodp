import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique().notNull().default(''),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email"),
  role: mysqlEnum("role", ["user", "admin", "gestor"]).default("user").notNull(),
  department: varchar("department", { length: 100 }).default("geral"),
  modules: text("modules"), // JSON array de módulos permitidos
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Email allowlist para OAuth - controla quem pode acessar o sistema
 */
export const emailAllowlist = mysqlTable(
  "email_allowlist",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_email").on(table.email)]
);

export type EmailAllowlist = typeof emailAllowlist.$inferSelect;
export type InsertEmailAllowlist = typeof emailAllowlist.$inferInsert;

/**
 * Importações de Excel - rastreia cada upload e row_count para detecção incremental
 */
export const imports = mysqlTable(
  "imports",
  {
    id: int("id").autoincrement().primaryKey(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileHash: varchar("fileHash", { length: 64 }).notNull(),
    rowCount: int("rowCount").notNull(), // Total de linhas processadas
    newRowsCount: int("newRowsCount").notNull(), // Linhas novas nesta importação
    importedBy: varchar("importedBy", { length: 64 }).notNull(),
    importedAt: timestamp("importedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_fileName").on(table.fileName),
    index("idx_importedAt").on(table.importedAt),
  ]
);

export type Import = typeof imports.$inferSelect;
export type InsertImport = typeof imports.$inferInsert;

/**
 * Jornadas de trabalho - dados normalizados do Excel
 */
export const journeys = mysqlTable(
  "journeys",
  {
    id: int("id").autoincrement().primaryKey(),
    importId: int("importId").notNull(),
    
    // Dados do motorista
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    gestorName: varchar("gestorName", { length: 255 }),
    operacao: varchar("operacao", { length: 255 }),
    cargo: varchar("cargo", { length: 255 }),
    placa: varchar("placa", { length: 50 }),
    
    // Data e tempos (normalizados)
    data: timestamp("data").notNull(), // Data da jornada
    inicioJornada: timestamp("inicioJornada"),
    fimJornada: timestamp("fimJornada"),
    
    // Tempos em minutos (normalizados)
    dirigidoMin: int("dirigidoMin").notNull().default(0), // Tempo Total Dirigido
    he50Min: int("he50Min").notNull().default(0), // Horas Extras 50%
    he100Min: int("he100Min").notNull().default(0), // Horas Extras 100%
    heMin: int("heMin").notNull().default(0), // Total HE (he50 + he100)
    tempoEsperaMin: int("tempoEsperaMin").notNull().default(0),
    tempoDescansoMin: int("tempoDescansoMin").notNull().default(0),
    
    // Flags automáticas
    poucoRodado: boolean("poucoRodado").notNull().default(false),
    temHe: boolean("temHe").notNull().default(false),
    heAlerta: boolean("heAlerta").notNull().default(false),
    
    // Metadados
    tratativaOperacional: text("tratativaOperacional"),
    rawData: text("rawData"), // JSON com dados brutos para auditoria
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_data").on(table.data),
    index("idx_conductorName").on(table.conductorName),
    index("idx_gestorName").on(table.gestorName),
    index("idx_poucoRodado").on(table.poucoRodado),
    index("idx_temHe").on(table.temHe),
    index("idx_heAlerta").on(table.heAlerta),
  ]
);

export type Journey = typeof journeys.$inferSelect;
export type InsertJourney = typeof journeys.$inferInsert;

/**
 * Reincidências - cache calculado para performance
 * Armazena contagem de ocorrências em janelas móveis
 */
export const recurrences = mysqlTable(
  "recurrences",
  {
    id: int("id").autoincrement().primaryKey(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    data: timestamp("data").notNull(), // Data de referência
    
    // Pouco rodado
    ocorPoucoJanela: int("ocorPoucoJanela").notNull().default(0), // Últimos 7 dias
    ocorPouco30d: int("ocorPouco30d").notNull().default(0), // Últimos 30 dias
    
    // Horas extras
    ocorHeJanela: int("ocorHeJanela").notNull().default(0), // Últimos 7 dias
    ocorHe30d: int("ocorHe30d").notNull().default(0), // Últimos 30 dias
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_conductorData").on(table.conductorName, table.data),
    unique("uq_conductor_data").on(table.conductorName, table.data),
  ]
);

export type Recurrence = typeof recurrences.$inferSelect;
export type InsertRecurrence = typeof recurrences.$inferInsert;

/**
 * Ações sugeridas - geradas automaticamente baseado em regras
 */
export const suggestedActions = mysqlTable(
  "suggested_actions",
  {
    id: int("id").autoincrement().primaryKey(),
    journeyId: int("journeyId").notNull(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    data: timestamp("data").notNull(),
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao", "pouco_rodado", "horas_extras"]).notNull(),
    acao: text("acao").notNull(), // Descrição da ação sugerida
    severidade: mysqlEnum("severidade", ["info", "warning", "critical"]).notNull(),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conductorData").on(table.conductorName, table.data),
    index("idx_tipo").on(table.tipo),
  ]
);

export type SuggestedAction = typeof suggestedActions.$inferSelect;
export type InsertSuggestedAction = typeof suggestedActions.$inferInsert;

/**
 * Tratativas - persistência de status e observações por infração
 */
export const treatments = mysqlTable(
  "treatments",
  {
    id: int("id").autoincrement().primaryKey(),
    journeyId: int("journeyId").notNull(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    data: timestamp("data").notNull(),
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao", "pouco_rodado", "horas_extras"]).notNull(),
    
    status: mysqlEnum("status", ["pendente", "em_andamento", "resolvido", "ignorado"])
      .notNull()
      .default("pendente"),
    observacao: text("observacao"),
    
    atualizadoPor: int("atualizadoPor"),
    atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conductorData").on(table.conductorName, table.data),
    index("idx_status").on(table.status),
    index("idx_tipo").on(table.tipo),
    unique("uq_journey_tipo").on(table.journeyId, table.tipo),
  ]
);

export type Treatment = typeof treatments.$inferSelect;
export type InsertTreatment = typeof treatments.$inferInsert;

/**
 * Configurações do sistema - limites e janelas ajustáveis
 */
export const configurations = mysqlTable("configurations", {
  id: int("id").autoincrement().primaryKey(),
  
  // Limites (em minutos)
  limitePoucoRodadoMin: int("limitePoucoRodadoMin").notNull().default(120), // 2h
  limiteHeAlertaMin: int("limiteHeAlertaMin").notNull().default(90), // 1.5h
  
  // Janelas (em dias)
  janelaReincidenciaDias: int("janelaReincidenciaDias").notNull().default(7),
  janelaCronicoDias: int("janelaCronicoDias").notNull().default(30),
  
  // Thresholds para ações
  thresholdPoucoRodado1: int("thresholdPoucoRodado1").notNull().default(1),
  thresholdPoucoRodado2: int("thresholdPoucoRodado2").notNull().default(2),
  thresholdPoucoRodado3: int("thresholdPoucoRodado3").notNull().default(3),
  thresholdPouco30d: int("thresholdPouco30d").notNull().default(5),
  thresholdHe30d: int("thresholdHe30d").notNull().default(5),
  
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = typeof configurations.$inferInsert;

/**
 * Log de notificações enviadas
 */
export const emailLogs = mysqlTable(
  "email_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    gestorEmail: varchar("gestorEmail", { length: 320 }).notNull(),
    tipo: mysqlEnum("tipo", ["pouco_rodado", "horas_extras", "insight"]).notNull(),
    assunto: varchar("assunto", { length: 255 }).notNull(),
    conteudo: text("conteudo").notNull(),
    status: mysqlEnum("status", ["enviado", "falha", "pendente"])
      .notNull()
      .default("pendente"),
    tentativas: int("tentativas").notNull().default(0),
    proximaTentativa: timestamp("proximaTentativa"),
    
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
    enviadoEm: timestamp("enviadoEm"),
  },
  (table) => [
    index("idx_gestorEmail").on(table.gestorEmail),
    index("idx_status").on(table.status),
    index("idx_criadoEm").on(table.criadoEm),
  ]
);

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Insights gerados por IA
 */
export const aiInsights = mysqlTable(
  "ai_insights",
  {
    id: int("id").autoincrement().primaryKey(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    dataInicio: timestamp("dataInicio").notNull(),
    dataFim: timestamp("dataFim").notNull(),
    
    titulo: varchar("titulo", { length: 255 }).notNull(),
    conteudo: text("conteudo").notNull(),
    tipo: mysqlEnum("tipo", ["comportamento", "alerta", "recomendacao"]).notNull(),
    
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conductorData").on(table.conductorName, table.dataInicio),
  ]
);

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = typeof aiInsights.$inferInsert;

/**
 * Orientações - registro de orientações antes de advertência
 * Na 3ª orientação, gera automaticamente uma Advertência (Aviso 1)
 */
export const orientations = mysqlTable(
  "orientations",
  {
    id: int("id").autoincrement().primaryKey(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    licensePlate: varchar("licensePlate", { length: 20 }).notNull(),
    operacao: varchar("operacao", { length: 255 }).notNull(),
    observacao: text("observacao").notNull(),
    usuarioId: int("usuarioId").notNull(),
    usuarioNome: varchar("usuarioNome", { length: 255 }).notNull(),
    usuarioEmail: varchar("usuarioEmail", { length: 320 }).notNull(),
    dataOrientacao: timestamp("dataOrientacao").defaultNow().notNull(),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
    advertenciaGerada: boolean("advertenciaGerada").notNull().default(false),
    warningId: int("warningId"), // Referencia a advertencia gerada apos 3 orientacoes
  },
  (table) => [
    index("idx_conductorName").on(table.conductorName),
    index("idx_dataOrientacao").on(table.dataOrientacao),
    index("idx_operacao").on(table.operacao),
  ]
);

export type Orientation = typeof orientations.$inferSelect;
export type InsertOrientation = typeof orientations.$inferInsert;

/**
 * Advertências - avisos formais com níveis (1, 2, 3)
 */
export const warnings = mysqlTable(
  "warnings",
  {
    id: int("id").autoincrement().primaryKey(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao"]).notNull(),
    categoria: mysqlEnum("categoria", ["pouco_rodado", "horas_extras", "outro"]).default("outro"),
    nivelAdvertencia: int("nivelAdvertencia").notNull(),
    motivo: text("motivo").notNull(),
    observacao: text("observacao"),
    aplicadoPor: varchar("aplicadoPor", { length: 320 }).notNull(),
    advertenciaGerada: boolean("advertenciaGerada").notNull().default(true),
    advertenciaAplicada: boolean("advertenciaAplicada").notNull().default(false),
    dataAplicacao: timestamp("dataAplicacao"),
    geradaAutomaticamente: boolean("geradaAutomaticamente").notNull().default(false),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
    tipoColaborador: varchar("tipoColaborador", { length: 100 }),
    dataAnotacao: timestamp("dataAnotacao"),
    sequencia: varchar("sequencia", { length: 20 }),
    tipoAnotacao: varchar("tipoAnotacao", { length: 100 }),
    codigoTreinamento: varchar("codigoTreinamento", { length: 50 }),
    numeroDocumento: varchar("numeroDocumento", { length: 50 }),
    empresaResponsavel: varchar("empresaResponsavel", { length: 255 }),
    tipoResponsavel: varchar("tipoResponsavel", { length: 100 }),
    responsavelAnotacao: varchar("responsavelAnotacao", { length: 255 }),
    // Campos específicos para suspensão
    dataInicio: timestamp("dataInicio"),
    dataFim: timestamp("dataFim"),
    dataRetorno: timestamp("dataRetorno"),
  },
  (table) => [
    index("idx_conductorTipo").on(table.conductorName, table.tipo),
    index("idx_criadoEm").on(table.criadoEm),
  ]
);

export type Warning = typeof warnings.$inferSelect;
export type InsertWarning = typeof warnings.$inferInsert;


/**
 * Histórico de PDFs de Advertências - armazena todas as versões geradas para auditoria
 */
export const warningPdfHistory = mysqlTable(
  "warning_pdf_history",
  {
    id: int("id").autoincrement().primaryKey(),
    warningId: int("warningId").notNull(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    licensePlate: varchar("licensePlate", { length: 20 }).notNull(),
    operacao: varchar("operacao", { length: 255 }).notNull(),
    pdfUrl: text("pdfUrl").notNull(),
    pdfKey: varchar("pdfKey", { length: 512 }).notNull(),
    fileSize: int("fileSize").notNull(),
    geradoPor: varchar("geradoPor", { length: 320 }).notNull(),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  },
  (table) => [
    index("idx_warningId").on(table.warningId),
    index("idx_conductorName").on(table.conductorName),
    index("idx_criadoEm").on(table.criadoEm),
  ]
);

export type WarningPdfHistory = typeof warningPdfHistory.$inferSelect;
export type InsertWarningPdfHistory = typeof warningPdfHistory.$inferInsert;


/**
 * Logs de Auditoria - registra todas as ações importantes dos usuários
 */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    userName: varchar("userName", { length: 255 }).notNull(),
    userEmail: varchar("userEmail", { length: 320 }).notNull(),
    
    // Tipo de ação
    action: varchar("action", { length: 100 }).notNull(), // login, logout, create_warning, edit_warning, delete_warning, etc
    resource: varchar("resource", { length: 100 }).notNull(), // users, warnings, orientations, etc
    resourceId: int("resourceId"), // ID do recurso afetado
    
    // Detalhes da ação
    description: text("description").notNull(),
    details: text("details"), // JSON com dados adicionais
    
    // IP e User Agent
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    
    // Status da ação
    status: mysqlEnum("status", ["success", "failed", "warning"]).notNull().default("success"),
    errorMessage: text("errorMessage"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_userId").on(table.userId),
    index("idx_action").on(table.action),
    index("idx_resource").on(table.resource),
    index("idx_createdAt").on(table.createdAt),
    index("idx_userIdCreatedAt").on(table.userId, table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Políticas de Retenção - configura quantos dias manter dados de cada tipo
 */
export const retentionPolicies = mysqlTable(
  "retention_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    resource: varchar("resource", { length: 100 }).notNull().unique(), // users, warnings, orientations, audit_logs, etc
    retentionDays: int("retentionDays").notNull().default(90), // Quantos dias manter
    enabled: boolean("enabled").notNull().default(true), // Se a política está ativa
    autoDelete: boolean("autoDelete").notNull().default(true), // Se deve deletar automaticamente
    description: text("description"), // Descrição da política
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_resource").on(table.resource)]
);

export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type InsertRetentionPolicy = typeof retentionPolicies.$inferInsert;

/**
 * Histórico de Limpeza - registra quando logs foram deletados
 */
export const cleanupHistory = mysqlTable(
  "cleanup_history",
  {
    id: int("id").autoincrement().primaryKey(),
    resource: varchar("resource", { length: 100 }).notNull(), // Tipo de dado deletado
    recordsDeleted: int("recordsDeleted").notNull(), // Quantos registros foram deletados
    deletedBefore: timestamp("deletedBefore").notNull(), // Data limite (deletou tudo antes dessa data)
    executedBy: varchar("executedBy", { length: 320 }), // Email do usuário que executou (null se job automático)
    isAutomatic: boolean("isAutomatic").notNull().default(true), // Se foi execução automática
    status: mysqlEnum("status", ["success", "failed", "partial"]).notNull().default("success"),
    errorMessage: text("errorMessage"), // Se falhou, qual foi o erro
    executedAt: timestamp("executedAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_resource").on(table.resource),
    index("idx_executedAt").on(table.executedAt),
  ]
);

export type CleanupHistory = typeof cleanupHistory.$inferSelect;
export type InsertCleanupHistory = typeof cleanupHistory.$inferInsert;

/**
 * Orientações - registra todas as orientações dadas aos motoristas
 * Utilizado para rastrear histórico de orientações e sugerir advertências após 3 orientações
 */


/**
 * Categorias de Modelos - agrupa modelos por tipo de infração
 */
export const modelCategories = mysqlTable(
  "model_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 200 }).notNull().unique(), // ex: "Excesso de Velocidade", "Falta Injustificada"
    description: text("description"), // Descrição da categoria
    type: mysqlEnum("type", ["advertencia", "suspensao"]).notNull(), // Tipo padrão
    icon: varchar("icon", { length: 50 }), // Ícone para UI
    color: varchar("color", { length: 7 }), // Cor para UI
    order: int("order").default(0), // Ordem de exibição
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_type").on(table.type),
    index("idx_isActive").on(table.isActive),
  ]
);

export type ModelCategory = typeof modelCategories.$inferSelect;
export type InsertModelCategory = typeof modelCategories.$inferInsert;

/**
 * Modelos de Advertências e Suspensões - templates pré-configurados
 */
export const warningTemplates = mysqlTable(
  "warning_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("categoryId").notNull(), // Referência para categoria
    title: varchar("title", { length: 255 }).notNull(), // Título do modelo
    type: mysqlEnum("type", ["advertencia", "suspensao"]).notNull(), // Tipo
    content: text("content").notNull(), // Conteúdo do modelo (texto completo)
    summary: varchar("summary", { length: 500 }), // Resumo para preview
    tags: varchar("tags", { length: 500 }), // Tags para busca (JSON array)
    sourceFile: varchar("sourceFile", { length: 255 }), // Nome do arquivo original
    isActive: boolean("isActive").notNull().default(true),
    usageCount: int("usageCount").default(0), // Quantas vezes foi usado
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_categoryId").on(table.categoryId),
    index("idx_type").on(table.type),
    index("idx_isActive").on(table.isActive),
  ]
);

export type WarningTemplate = typeof warningTemplates.$inferSelect;
export type InsertWarningTemplate = typeof warningTemplates.$inferInsert;

/**
 * Histórico de Uso de Modelos - rastreia qual modelo foi usado em cada advertência
 */
export const templateUsageHistory = mysqlTable(
  "template_usage_history",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId").notNull(), // Modelo usado
    warningId: int("warningId"), // Advertência criada (pode ser null se ainda não foi criada)
    userId: int("userId").notNull(), // Usuário que usou o modelo
    usedAt: timestamp("usedAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_templateId").on(table.templateId),
    index("idx_userId").on(table.userId),
    index("idx_usedAt").on(table.usedAt),
  ]
);

export type TemplateUsageHistory = typeof templateUsageHistory.$inferSelect;
export type InsertTemplateUsageHistory = typeof templateUsageHistory.$inferInsert;


/**
 * Uploads de PDF de Banco de Horas - rastreia cada upload semanal
 */
export const hourlyUploads = mysqlTable(
  "hourly_uploads",
  {
    id: int("id").autoincrement().primaryKey(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    uploadedBy: int("uploadedBy").notNull(), // ID do usuário que fez upload
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"), // Quando foi processado
    periodStart: timestamp("periodStart").notNull(), // Data inicial do período (ex: 01/03/2026)
    periodEnd: timestamp("periodEnd").notNull(), // Data final do período (ex: 09/03/2026)
    totalRecords: int("totalRecords").default(0), // Total de registros processados
    status: mysqlEnum("status", ["pendente", "processado", "erro"]).default("pendente"),
    errorMessage: text("errorMessage"), // Mensagem de erro se houver
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_uploadedAt").on(table.uploadedAt),
    index("idx_periodStart").on(table.periodStart),
  ]
);

export type HourlyUpload = typeof hourlyUploads.$inferSelect;
export type InsertHourlyUpload = typeof hourlyUploads.$inferInsert;

/**
 * Registros de Banco de Horas - dados diários de cada motorista
 */
export const hourlyRecords = mysqlTable(
  "hourly_records",
  {
    id: int("id").autoincrement().primaryKey(),
    uploadId: int("uploadId").notNull(), // Referência ao upload
    motoristaNome: varchar("motoristaNome", { length: 255 }).notNull(),
    cargo: varchar("cargo", { length: 100 }).notNull(), // Ex: MOTORISTA DE TRUCK, MOTORISTA DE CARRETA
    cpf: varchar("cpf", { length: 20 }), // CPF do motorista
    matricula: varchar("matricula", { length: 50 }), // Matrícula
    data: timestamp("data").notNull(), // Data do registro
    zeramento: varchar("zeramento", { length: 50 }), // Zeramento (se houver)
    credito: varchar("credito", { length: 50 }), // Crédito (formato HH:MM)
    debito: varchar("debito", { length: 50 }), // Débito (formato HH:MM)
    saldo: varchar("saldo", { length: 50 }).notNull(), // Saldo final (formato HH:MM)
    saldoMinutos: int("saldoMinutos").notNull(), // Saldo em minutos (para cálculos)
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_uploadId").on(table.uploadId),
    index("idx_motoristaNome").on(table.motoristaNome),
    index("idx_cargo").on(table.cargo),
    index("idx_data").on(table.data),
    index("idx_saldoMinutos").on(table.saldoMinutos),
  ]
);

export type HourlyRecord = typeof hourlyRecords.$inferSelect;
export type InsertHourlyRecord = typeof hourlyRecords.$inferInsert;

/**
 * Motoristas - cadastro de todos os motoristas da empresa
 */
export const conductors = mysqlTable(
  "conductors",
  {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    cpf: varchar("cpf", { length: 20 }).notNull().unique(),
    ctps: varchar("ctps", { length: 50 }),
    matricula: varchar("matricula", { length: 50 }).notNull(),
    operacao: varchar("operacao", { length: 255 }).notNull(),
    cargo: varchar("cargo", { length: 255 }).notNull(),
    placa: varchar("placa", { length: 50 }).notNull(),
    status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
    atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_cpf").on(table.cpf),
    index("idx_operacao").on(table.operacao),
    index("idx_nome").on(table.nome),
  ]
);

export type Conductor = typeof conductors.$inferSelect;
export type InsertConductor = typeof conductors.$inferInsert;


/**
 * Funcionários Administrativos - cadastro de funcionários não-motoristas
 */
export const administrativeEmployees = mysqlTable(
  "administrative_employees",
  {
    id: int("id").autoincrement().primaryKey(),
    cadastro: varchar("cadastro", { length: 50 }).notNull(),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    admissao: varchar("admissao", { length: 50 }).notNull(),
    cargo: varchar("cargo", { length: 255 }).notNull(),
    situacao: varchar("situacao", { length: 100 }).notNull(),
    cpf: varchar("cpf", { length: 20 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_cpf").on(table.cpf),
    index("idx_nome").on(table.nome),
    index("idx_cargo").on(table.cargo),
  ]
);

export type AdministrativeEmployee = typeof administrativeEmployees.$inferSelect;
export type InsertAdministrativeEmployee = typeof administrativeEmployees.$inferInsert;


/**
 * Histórico de Auditoria - rastreia todas as alterações em advertências e suspensões
 * Restrito a usuários administradores
 */
export const warningAuditLog = mysqlTable(
  "warning_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    warningId: int("warningId").notNull(),
    conductorName: varchar("conductorName", { length: 255 }).notNull(),
    acao: mysqlEnum("acao", ["criado", "editado", "deletado", "assinado"]).notNull(),
    camposAlterados: text("camposAlterados"), // JSON com campos que foram alterados
    valorAnterior: text("valorAnterior"), // JSON com valores anteriores
    valorNovo: text("valorNovo"), // JSON com valores novos
    usuarioId: int("usuarioId").notNull(),
    usuarioEmail: varchar("usuarioEmail", { length: 320 }).notNull(),
    usuarioNome: varchar("usuarioNome", { length: 255 }).notNull(),
    motivo: text("motivo"), // Motivo da alteração (opcional)
    ipAddress: varchar("ipAddress", { length: 45 }),
    criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  },
  (table) => [
    index("idx_warningId").on(table.warningId),
    index("idx_conductorName").on(table.conductorName),
    index("idx_usuarioId").on(table.usuarioId),
    index("idx_acao").on(table.acao),
    index("idx_criadoEm").on(table.criadoEm),
  ]
);

export type WarningAuditLog = typeof warningAuditLog.$inferSelect;
export type InsertWarningAuditLog = typeof warningAuditLog.$inferInsert;

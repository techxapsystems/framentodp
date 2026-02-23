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
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  department: varchar("department", { length: 100 }).default("geral"),
  modules: text("modules"), // JSON array de módulos permitidos
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
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao"]).notNull(),
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
    tipo: mysqlEnum("tipo", ["advertencia", "suspensao"]).notNull(),
    
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
 * Orientações - registra todas as orientações dadas aos motoristas
 * Utilizado para rastrear histórico de orientações e sugerir advertências após 3 orientações
 */

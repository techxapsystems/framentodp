/**
 * Warning Templates for Bulk Import
 * Contains pre-defined warning and suspension templates
 * Used for automatic template matching during bulk imports
 */

export type WarningType = 'advertencia' | 'suspensao';
export type WarningCategory = 
  | 'dissidia_insubordinacao'
  | 'ignicao_ligada'
  | 'cinto_seguranca'
  | 'falta_injustificada'
  | 'necessidades_local_proibido'
  | 'fumar_dirigindo'
  | 'marcacao_jornada_outra_pessoa'
  | 'marcar_ponto_sair_trabalho'
  | 'abandono_veiculo'
  | 'abastecimento_nao_credenciado'
  | 'autodeclaracao'
  | 'pane_seca_combustivel'
  | 'generico';

export interface WarningTemplate {
  id: string;
  nome: string;
  tipo: WarningType;
  categoria: WarningCategory;
  palavrasChave: string[];
  texto: string;
  diasSuspensao?: number;
}

export const warningTemplates: WarningTemplate[] = [
  {
    id: 'template_001',
    nome: 'Advertência - Dissidia e Insubordinação',
    tipo: 'advertencia',
    categoria: 'dissidia_insubordinacao',
    palavrasChave: ['dissidia', 'insubordinação', 'desobediência', 'orientação'],
    texto: `Por meio deste documento, notificamos formalmente que, no dia [DATA_INFRAÇÃO], foi identificado o descumprimento de orientação direta do gestor responsável. Especificamente, foi apurado que o conjunto de placas [PLACA], sob sua responsabilidade, deslocou-se para [LOCAL] sem a devida autorização.

Tal conduta gerou custos desnecessários para a empresa. Reforçamos que é imprescindível que todas as orientações sejam rigorosamente seguidas, a fim de garantir a eficiência operacional, o controle de custos e o alinhamento aos objetivos organizacionais.

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Considerando os prejuízos decorrentes da sua atitude, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de advertência, pela prática do disposto na alínea "E e H" do Art. 482 da CLT, desídia e indisciplina, no desempenho das respectivas funções.`,
  },
  {
    id: 'template_002',
    nome: 'Advertência - Ignição Ligada',
    tipo: 'advertencia',
    categoria: 'ignicao_ligada',
    palavrasChave: ['ignição', 'motor ligado', 'combustível', 'diesel'],
    texto: `Considerando que Vossa Pessoa, na condição de motorista profissional, foi negligente no desempenho das suas funções nos dias [DATA_INFRAÇÃO], por deixar o veículo placa [PLACA], com o motor ligado estando parado superior a 10 minutos, gerando consumo de óleo diesel, e custo desnecessários para a empresa, o que é contrário ás regras do empregador, atitude esta inaceitável e inadmissível por esta empresa.

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Considerando os prejuízos decorrentes da sua atitude, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de advertência, pela prática do disposto na alínea "E e H" do Art. 482 da CLT, desídia e indisciplina, no desempenho das respectivas funções.`,
  },
  {
    id: 'template_003',
    nome: 'Advertência - Cinto de Segurança',
    tipo: 'advertencia',
    categoria: 'cinto_seguranca',
    palavrasChave: ['cinto', 'segurança', 'cinto de segurança', 'bloqueio embarcador'],
    texto: `Na data de [DATA_INFRAÇÃO] foi constatado que, durante o exercício de suas funções como motorista profissional, o senhor conduziu o veículo de propriedade da empresa placa ([PLACA]), sem o uso do cinto de segurança, o que levou o bloqueio de vossa senhoria no embarcador e necessidade da reintegração, o que impede a realização de puxes para este embarcador.

Considerando também, que o não uso do cinto é um ato de descumprimento às normas internas da empresa e à legislação de trânsito vigente, conforme o artigo 65 do CTB, que estabelece o uso obrigatório do cinto de segurança por todos os ocupantes do veículo.

Ressaltamos que essa conduta coloca em risco sua segurança, a segurança de terceiros, e a integridade do patrimônio da empresa. Além disso, a não utilização do cinto de segurança é uma infração grave, sujeita a penalidades previstas em lei, incluindo multas e pontos na CNH.

Considerando as transgressões cometida, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de advertência, pela prática do disposto na alínea "E e H" do Art. 482 da CLT (Dissidia e Insubordinação)

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Solicitamos que Vossa Senhoria assine o recebimento desta advertência. Caso se recuse, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da advertência.`,
  },
  {
    id: 'template_004',
    nome: 'Advertência - Falta Injustificada',
    tipo: 'advertencia',
    categoria: 'falta_injustificada',
    palavrasChave: ['falta', 'ausência', 'injustificada', 'não comparecimento'],
    texto: `Conforme registro em nosso sistema de controle de presença, constatamos sua ausência ao trabalho no dia [DATA_INFRAÇÃO], sem devida comunicação ou justificativa formal.

De acordo com as normas estabelecidas no Regulamento Interno da Empresa/CLT, a ausência injustificada ao trabalho compromete a organização e o desempenho das atividades do setor, além de configurar descumprimento das obrigações contratuais

Tal conduta representa grave violação das normas internas da empresa e dos compromissos assumidos com nossos clientes, comprometendo a eficiência das operações e a confiabilidade dos nossos serviços.

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Considerando as faltas injustiçadas, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de advertência, pela prática do disposto na alínea "e" do Art. 482 da CLT (desídia no desempenho das respectivas funções).`,
  },
  {
    id: 'template_006',
    nome: 'Suspensão - Fumar Enquanto Dirige',
    tipo: 'suspensao',
    categoria: 'fumar_dirigindo',
    palavrasChave: ['fumar', 'cigarro', 'fumo', 'dirigindo'],
    diasSuspensao: 5,
    texto: `Informamos que, no dia [DATA_INFRAÇÃO], foi verificado, por meio de registro em câmera, que durante a condução do veículo de placa [PLACA] você estava fumando enquanto dirigia. Essa atitude infringe diretamente as normas de segurança estabelecidas pela nossa empresa e pelo cliente.

A prática de fumar enquanto dirige compromete a atenção e a segurança na condução, colocando em risco tanto a sua integridade quanto a de terceiros. Além disso, tal comportamento está em desacordo com as políticas de segurança da empresa.

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Considerando os riscos decorrentes da sua atitude, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de suspensão por 05 (cinco) dias, sem remuneração e DSR, pela prática do disposto na alínea "e" do Art. 482 da CLT (dissidia)`,
  },
  {
    id: 'template_generico',
    nome: 'Advertência Genérica',
    tipo: 'advertencia',
    categoria: 'generico',
    palavrasChave: [],
    texto: `Considerando que Vossa Pessoa, na condição de motorista profissional, foi negligente no desempenho das suas funções no dia [DATA_INFRAÇÃO], pela seguinte razão: [MOTIVO].

Tal conduta é contrária às regras do empregador, atitude esta inaceitável e inadmissível por esta empresa.

Considerando também, que este é o primeiro contato com Vossa Pessoa, após as diligências necessárias para apuramento dos fatos por esta empresa, com observância ao princípio da imediatidade da medida.

Considerando os prejuízos decorrentes da sua atitude, cientificamos Vossa Pessoa de que a empresa está aplicando penalidade disciplinar de advertência, pela prática do disposto na alínea "E e H" do Art. 482 da CLT, desídia e indisciplina, no desempenho das respectivas funções.`,
  },
];

/**
 * Match a warning reason to the most appropriate template
 * Uses keyword matching to find the best template
 * Falls back to generic template if no match found
 */
export function matchTemplate(motivo: string, tipo: WarningType = 'advertencia'): WarningTemplate {
  if (!motivo) {
    return warningTemplates.find(t => t.id === 'template_generico') || warningTemplates[0];
  }

  const motivoLower = motivo.toLowerCase();
  
  // Find template with matching keywords (check all templates, not just matching tipo)
  let matched = warningTemplates.find(t => 
    t.palavrasChave.some(keyword => motivoLower.includes(keyword.toLowerCase()))
  );

  if (matched) {
    return matched;
  }

  // Fallback to generic template
  return warningTemplates.find(t => t.id === 'template_generico') || warningTemplates[0];
}

/**
 * Get all available templates for a specific warning type
 */
export function getTemplatesByType(tipo: WarningType): WarningTemplate[] {
  return warningTemplates.filter(t => t.tipo === tipo);
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): WarningCategory[] {
  return Array.from(new Set(warningTemplates.map(t => t.categoria)));
}

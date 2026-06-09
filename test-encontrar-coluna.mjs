function encontrarColuna(headers, procurar) {
  const procurarNorm = procurar.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (let i = 0; i < headers.length; i++) {
    const headerNorm = headers[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (headerNorm === procurarNorm) {
      return i;
    }
  }
  
  return -1;
}

const headers = ['Condutor', 'CPF', 'Operação', 'Cargo', 'Placa', 'Interstício', 'Início Jornada', 'Fim Jornada', 'Total Refeição', 'Tempo Espera', 'Tempo Total Dirigido', 'Tempo Jornada s/ Refeição', 'Horas Extras 50%', 'Horas Extras 100%', 'GERENTE', 'Código Sistema'];

console.log('Procurando "inicio jornada":', encontrarColuna(headers, 'inicio jornada'));
console.log('Procurando "início jornada":', encontrarColuna(headers, 'início jornada'));
console.log('Procurando "Início Jornada":', encontrarColuna(headers, 'Início Jornada'));

// Teste de normalização
const test = 'Início Jornada';
const testNorm = test.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
console.log(`\nNormalização de "${test}": "${testNorm}"`);

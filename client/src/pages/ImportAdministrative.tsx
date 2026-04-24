'use client';
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';

interface AdministrativeEmployee {
  cadastro: string;
  tipo: string;
  nome: string;
  admissao: string;
  cargo: string;
  situacao: string;
  cpf: string;
}

export default function ImportAdministrative() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AdministrativeEmployee[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    imported: 0,
    ignored: 0,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx')) {
      toast.error('Por favor, selecione um arquivo XLSX');
      return;
    }

    setFile(selectedFile);
    await analyzeFile(selectedFile);
  };

  const analyzeFile = async (selectedFile: File) => {
    try {
      setLoading(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Usar a biblioteca XLSX se disponível
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      // Encontrar linha de cabeçalho (procura por "Cadastro")
      let headerRowIndex = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'Cadastro') {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        toast.error('Não foi possível encontrar a linha de cabeçalho (Cadastro)');
        setLoading(false);
        return;
      }

      // Processar dados
      const employees: AdministrativeEmployee[] = [];
      let ignoredCount = 0;

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) break; // Fim dos dados

        const cargo = String(row[4] || '').toUpperCase();
        
        // Ignorar motoristas e ajudantes
        if (cargo.includes('MOTORISTA') || cargo.includes('AJUDANTE')) {
          ignoredCount++;
          continue;
        }

        employees.push({
          cadastro: String(row[0] || ''),
          tipo: String(row[1] || ''),
          nome: String(row[2] || ''),
          admissao: String(row[3] || ''),
          cargo: cargo,
          situacao: String(row[6] || ''),
          cpf: String(row[7] || ''),
        });
      }

      setStats({
        total: employees.length + ignoredCount,
        imported: employees.length,
        ignored: ignoredCount,
      });

      setPreview(employees.slice(0, 10)); // Mostrar primeiros 10
      toast.success(`Arquivo analisado: ${employees.length} administrativos encontrados`);
    } catch (error) {
      console.error('Erro ao analisar arquivo:', error);
      toast.error('Erro ao analisar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Por favor, selecione um arquivo');
      return;
    }

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      // Encontrar linha de cabeçalho
      let headerRowIndex = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'Cadastro') {
          headerRowIndex = i;
          break;
        }
      }

      // Processar dados
      const employees: AdministrativeEmployee[] = [];
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) break;

        const cargo = String(row[4] || '').toUpperCase();
        if (cargo.includes('MOTORISTA') || cargo.includes('AJUDANTE')) {
          continue;
        }

        employees.push({
          cadastro: String(row[0] || ''),
          tipo: String(row[1] || ''),
          nome: String(row[2] || ''),
          admissao: String(row[3] || ''),
          cargo: cargo,
          situacao: String(row[6] || ''),
          cpf: String(row[7] || ''),
        });
      }

      // Chamar API para importar
      const response = await fetch('/api/import/administrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      });

      if (!response.ok) {
        throw new Error('Erro ao importar');
      }

      const result = await response.json();
      toast.success(`${result.imported} funcionários administrativos importados com sucesso!`);
      
      // Limpar
      setFile(null);
      setPreview([]);
      setStats({ total: 0, imported: 0, ignored: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar funcionários');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Funcionários Administrativos</h1>
        <p className="text-muted-foreground mt-2">
          Importe uma lista de funcionários administrativos em formato XLSX. Motoristas e ajudantes serão automaticamente ignorados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Arquivo</CardTitle>
          <CardDescription>
            Faça upload de um arquivo XLSX com a lista de funcionários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-center"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-semibold">Clique para selecionar ou arraste um arquivo</p>
              <p className="text-sm text-muted-foreground">Apenas arquivos XLSX</p>
            </button>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Importação</CardTitle>
            <CardDescription>
              Visualização dos dados que serão importados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Administrativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.imported}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Ignorados</p>
                <p className="text-2xl font-bold text-orange-600">{stats.ignored}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Cargo</th>
                    <th className="text-left p-2">CPF</th>
                    <th className="text-left p-2">Admissão</th>
                    <th className="text-left p-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((emp, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{emp.nome}</td>
                      <td className="p-2">
                        <Badge variant="outline">{emp.cargo}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{emp.cpf}</td>
                      <td className="p-2">{emp.admissao}</td>
                      <td className="p-2">{emp.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.length < stats.imported && (
              <p className="text-sm text-muted-foreground">
                Mostrando 10 de {stats.imported} registros
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleImport}
          disabled={!file || loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Importando...' : 'Importar Funcionários'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setPreview([]);
            setStats({ total: 0, imported: 0, ignored: 0 });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}

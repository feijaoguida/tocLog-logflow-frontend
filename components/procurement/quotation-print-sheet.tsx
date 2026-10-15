'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Mail, Loader2, Building, Calendar, FileText, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface QuotationPrintSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: any | null
  request: any | null
  onSendEmailSuccess?: () => void
}

export function QuotationPrintSheet({
  open,
  onOpenChange,
  quotation,
  request,
  onSendEmailSuccess,
}: QuotationPrintSheetProps) {
  const [sendingEmail, setSendingEmail] = React.useState(false)

  if (!quotation || !request) return null

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = async () => {
    if (!quotation.supplier?.email) {
      toast.error(`O fornecedor ${quotation.supplier?.name} não possui e-mail cadastrado.`)
      return
    }

    setSendingEmail(true)
    try {
      const res = await api.post(`/quotations/${quotation.id}/send-rfq`)
      toast.success(res.data?.message || 'Ficha de cotação enviada por e-mail com sucesso!')
      if (onSendEmailSuccess) onSendEmailSuccess()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar ficha por e-mail.')
    } finally {
      setSendingEmail(false)
    }
  }

  const todayStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const deadlineStr = request.desiredDate
    ? format(new Date(request.desiredDate), 'dd/MM/yyyy')
    : '5 dias úteis a contar do recebimento'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="print:hidden border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Ficha de Cotação de Preços (RFQ) — {quotation.supplier?.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Formulário corporativo padronizado para preenchimento comercial pelo fornecedor parceiro.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={sendingEmail || !quotation.supplier?.email}
                className="gap-1.5 text-xs font-semibold"
                title={quotation.supplier?.email ? `Enviar para ${quotation.supplier?.email}` : 'Fornecedor sem e-mail cadastrado'}
              >
                {sendingEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                <span>Enviar por E-mail</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground"
              >
                <Printer className="size-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ÁREA DE IMPRESSÃO / PRÉVIA DA FICHA */}
        <div className="flex-1 overflow-y-auto pr-2 py-4">
          <div
            id="rfq-print-area"
            className="bg-white text-slate-900 dark:bg-white dark:text-slate-900 p-8 rounded-lg border shadow-xs max-w-4xl mx-auto space-y-6 print:p-0 print:border-none print:shadow-none print:m-0"
          >
            {/* CABEÇALHO INSTITUCIONAL */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                    TL
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                      TOCLOG LOGÍSTICA
                    </h1>
                    <p className="text-[11px] font-medium text-slate-600 uppercase tracking-widest">
                      Departamento de Compras & Suprimentos
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 text-xs font-bold uppercase rounded text-slate-900">
                  SOLICITAÇÃO DE COTAÇÃO (RFQ)
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  Requisição: #{request.code}
                </p>
                <p className="text-[11px] text-slate-600">Emissão: {todayStr}</p>
              </div>
            </div>

            {/* DADOS DA REQUISIÇÃO E DO FORNECEDOR */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 border border-slate-200 p-4 rounded">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1 border-slate-200">
                  Dados do Solicitante / Estabelecimento
                </p>
                <p>
                  <strong className="text-slate-700">Comprador:</strong>{' '}
                  {request.requester?.user?.name || request.requester?.name || 'Setor de Compras'}
                </p>
                <p>
                  <strong className="text-slate-700">Departamento:</strong>{' '}
                  {request.department?.name || 'Operações'}
                </p>
                <p>
                  <strong className="text-slate-700">Prazo Máximo de Resposta:</strong>{' '}
                  <span className="text-red-700 font-bold">{deadlineStr}</span>
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1 border-slate-200">
                  Dados do Fornecedor Cotado
                </p>
                <p>
                  <strong className="text-slate-700">Razão Social:</strong>{' '}
                  <span className="font-semibold text-slate-900">{quotation.supplier?.name}</span>
                </p>
                <p>
                  <strong className="text-slate-700">CNPJ:</strong>{' '}
                  {quotation.supplier?.cnpj || 'Não informado'}
                </p>
                <p>
                  <strong className="text-slate-700">Contato / E-mail:</strong>{' '}
                  {quotation.supplier?.email || quotation.supplier?.phone || 'Não informado'}
                </p>
              </div>
            </div>

            {/* TABELA DE ITENS REQUERIDOS COM CAMPOS PARA PREENCHIMENTO */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Relação de Materiais ou Serviços para Cotação
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  Preencher os campos demarcados em branco abaixo
                </span>
              </div>

              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-left font-bold">
                    <th className="border border-slate-300 p-2 text-center w-10">Item</th>
                    <th className="border border-slate-300 p-2">Especificação Técnica</th>
                    <th className="border border-slate-300 p-2 text-center w-20">Qtd / Unid</th>
                    <th className="border border-slate-300 p-2 text-center w-28 bg-white">Marca / Modelo</th>
                    <th className="border border-slate-300 p-2 text-center w-28 bg-white">Preço Unit. (R$)</th>
                    <th className="border border-slate-300 p-2 text-center w-24 bg-white">Entrega (Dias)</th>
                    <th className="border border-slate-300 p-2 text-center w-20 bg-white">Atende?</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items?.map((item: any, idx: number) => {
                    const existingQuoteItem = quotation.items?.find(
                      (qi: any) => qi.requestItemId === item.id || qi.id === item.id
                    )
                    const unitPrice = Number(existingQuoteItem?.price || 0)
                    const isDenied = existingQuoteItem?.status === 'DENIED'

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <p className="font-semibold text-slate-900">
                            {item.product?.name || item.description}
                          </p>
                          {item.observation && (
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Obs: {item.observation}
                            </p>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">
                          {item.quantity} {item.unit?.symbol || 'un'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-slate-800 font-medium bg-slate-50/50">
                          {existingQuoteItem?.brand || '________________'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                          {unitPrice > 0 ? `R$ ${unitPrice.toFixed(2)}` : 'R$ ____________'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-slate-800 bg-slate-50/50">
                          {existingQuoteItem?.deliveryTime || '____ dias'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {isDenied ? (
                            <span className="text-red-700 font-bold">NÃO</span>
                          ) : unitPrice > 0 ? (
                            <span className="text-emerald-700 font-bold">SIM</span>
                          ) : (
                            '( ) S  ( ) N'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* FECHAMENTO COMERCIAL (CAMPOS PARA PREENCHIMENTO DO FORNECEDOR) */}
            <div className="border border-slate-300 p-4 rounded bg-slate-50/70 space-y-3 text-xs">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1 border-slate-200">
                Condições Comerciais Gerais (Preenchimento Obrigatório)
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-2 border border-slate-300 rounded bg-white">
                  <p className="font-bold text-slate-700">Valor do Frete (R$):</p>
                  <p className="text-slate-900 font-mono font-bold mt-1">
                    {Number(quotation.freightCost || 0) > 0
                      ? `R$ ${Number(quotation.freightCost).toFixed(2)}`
                      : 'R$ ____________________'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">( ) CIF (Incluso)  ( ) FOB (À parte)</p>
                </div>

                <div className="p-2 border border-slate-300 rounded bg-white">
                  <p className="font-bold text-slate-700">Condição de Pagamento:</p>
                  <p className="text-slate-900 font-medium mt-1">
                    {quotation.paymentTerms || '________________________'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Ex: Boleto 30 dias / À vista</p>
                </div>

                <div className="p-2 border border-slate-300 rounded bg-white">
                  <p className="font-bold text-slate-700">Validade da Proposta:</p>
                  <p className="text-slate-900 font-medium mt-1">
                    {quotation.validityDate
                      ? format(new Date(quotation.validityDate), 'dd/MM/yyyy')
                      : '_____/_____/2026'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Mínimo sugerido: 10 dias</p>
                </div>
              </div>

              {/* ASSINATURA E CARIMBO */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 items-end">
                <div>
                  <p className="text-[11px] text-slate-600">
                    Declaramos que os preços e prazos cotados acima são válidos e refletem nossas
                    condições de fornecimento para a demanda especificada.
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-2">
                    Data: ______ de ___________________ de 2026
                  </p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 pb-1 mb-1" />
                  <p className="font-bold text-slate-900 text-xs">
                    Assinatura / Carimbo do Fornecedor
                  </p>
                  <p className="text-[10px] text-slate-500">Nome Legível do Representante Comercial</p>
                </div>
              </div>
            </div>

            {/* INSTRUÇÃO FINAL */}
            <div className="text-center pt-2 text-[10px] text-slate-500 border-t">
              LogFlow Procurement System • Sistema Integrado de Gestão de Compras e Suprimentos
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden border-t pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

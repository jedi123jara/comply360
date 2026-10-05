'use client'

import { useId, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  Info,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ADVISOR_DISCLAIMER,
  CONTRACT_KIND_SUMMARIES,
  DESNATURALIZACION_WARNING,
  getAdvisorQuestions,
  recommendContract,
  type AdvisorAnswers,
  type AdvisorQuestionId,
  type AdvisorRecommendation,
} from './contract-advisor'

interface ContractTypeAdvisorProps {
  /** Se llama cuando el usuario acepta la sugerencia. */
  onChoose: (recommendation: AdvisorRecommendation) => void
  defaultOpen?: boolean
}

/**
 * Panel "¿Qué contrato necesito?": preguntas simples que sugieren el tipo de
 * contrato y explican cada opción en una línea. Es orientativo.
 */
export function ContractTypeAdvisor({ onChoose, defaultOpen = false }: ContractTypeAdvisorProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [answers, setAnswers] = useState<AdvisorAnswers>({})
  const baseId = useId()
  const titleId = `${baseId}-title`
  const panelId = `${baseId}-panel`

  const questions = getAdvisorQuestions(answers)
  const recommendation = recommendContract(answers)

  const setAnswer = (id: AdvisorQuestionId, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            ¿Qué contrato necesito?
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Responde unas preguntas simples y te sugerimos el tipo de contrato. Toma menos de un minuto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {open ? 'Ocultar guía' : 'Ayúdame a elegir'}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-5 space-y-5">
          <ol className="m-0 list-none space-y-4 p-0">
            {questions.map((question, index) => (
              <li key={question.id}>
                <fieldset>
                  <legend className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                    <span
                      className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    {question.question}
                  </legend>
                  {question.help && (
                    <p className="ml-7 mt-1 text-xs text-slate-500">{question.help}</p>
                  )}
                  <div className="ml-7 mt-2 grid gap-2 sm:grid-cols-2">
                    {question.options.map(option => {
                      const checked = answers[question.id] === option.value
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
                            checked
                              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white hover:border-emerald-300',
                          )}
                        >
                          <input
                            type="radio"
                            name={`${baseId}-${question.id}`}
                            value={option.value}
                            checked={checked}
                            onChange={() => setAnswer(question.id, option.value)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-emerald-600"
                          />
                          <span>
                            <span className="font-medium text-slate-900">{option.label}</span>
                            {option.hint && (
                              <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          <div aria-live="polite">
            {recommendation && (
              <div className="rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Te sugerimos</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{recommendation.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{recommendation.reason}</p>
                <ul className="mt-3 space-y-1.5">
                  {recommendation.tips.map(tip => (
                    <li key={tip} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                {recommendation.warning && (
                  <div
                    role="note"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
                    <span>{recommendation.warning}</span>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChoose(recommendation)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    Usar el modelo «{recommendation.templateLabel}»
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({})}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Empezar de nuevo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Los 4 contratos más comunes, en una línea</h3>
            <dl className="mt-2 space-y-1.5">
              {CONTRACT_KIND_SUMMARIES.map(summary => {
                const isSuggested = recommendation?.kind === summary.kind
                return (
                  <div
                    key={summary.kind}
                    className={cn(
                      'rounded-lg px-3 py-2',
                      isSuggested ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'bg-slate-50',
                    )}
                  >
                    <dt className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      {summary.title}
                      {isSuggested && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Sugerido
                        </span>
                      )}
                    </dt>
                    <dd className="mt-0.5 text-xs text-slate-600">
                      {summary.line}
                      {summary.kind === 'locacion' && recommendation?.kind !== 'locacion' && (
                        <span className="mt-1 flex items-start gap-1.5 text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span>{DESNATURALIZACION_WARNING}</span>
                        </span>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{ADVISOR_DISCLAIMER}</span>
          </p>
        </div>
      )}
    </section>
  )
}

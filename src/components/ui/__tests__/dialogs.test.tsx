// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Modal } from '../modal'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet'
import { ConfirmDialog, confirm } from '../confirm-dialog'

function pressEscape() {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
}

function ModalHarness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir liquidación
      </button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        title="Generar liquidación"
      >
        <input aria-label="Monto" />
      </Modal>
    </>
  )
}

function SheetHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir asistente
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle>Asistente</SheetTitle>
          <SheetDescription>Contexto del trabajador</SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  )
}

describe('Modal', () => {
  it('es un diálogo modal con título enlazado y capas con respaldo', () => {
    render(<ModalHarness />)
    const trigger = screen.getByText('Abrir liquidación')
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const titleId = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(titleId)?.textContent).toBe('Generar liquidación')
    // Sin descripción no queda un aria-describedby colgando.
    expect(dialog.hasAttribute('aria-describedby')).toBe(false)
    expect(dialog.className).toContain('z-[var(--z-modal,300)]')
    expect(document.querySelector('[class*="z-[var(--z-modal-backdrop,290)]"]')).not.toBeNull()
  })

  it('Escape cierra (onClose una sola vez) y el foco vuelve al botón que la abrió', async () => {
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    const trigger = screen.getByText('Abrir liquidación')
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true))

    pressEscape()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('Sheet', () => {
  it('controlado sin SheetTrigger: misma capa que Modal y devuelve el foco', async () => {
    render(<SheetHarness />)
    const trigger = screen.getByText('Abrir asistente')
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.className).toContain('z-[var(--z-modal,300)]')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Asistente')

    pressEscape()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('ConfirmDialog', () => {
  it('es un alertdialog modal con título y descripción enlazados', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="¿Eliminar trabajador?"
        description="Esta acción no se puede deshacer."
        tone="danger"
      />
    )
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe(
      '¿Eliminar trabajador?'
    )
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Esta acción no se puede deshacer.'
    )
    // La capa de fondo ya no depende de una variable sin respaldo.
    expect(document.querySelector('[class*="z-[var(--z-modal-backdrop,290)]"]')).not.toBeNull()
    expect(document.querySelector('[class*="z-[var(--z-modal-backdrop)]"]')).toBeNull()
  })

  it('confirm() imperativo resuelve true y devuelve el foco al disparador', async () => {
    render(
      <button type="button" onClick={() => {}}>
        Eliminar
      </button>
    )
    const trigger = screen.getByText('Eliminar')
    trigger.focus()

    let result: Promise<boolean> | undefined
    act(() => {
      result = confirm({ title: '¿Eliminar documento?', confirmLabel: 'Sí, eliminar', tone: 'danger' })
    })
    const confirmButton = await screen.findByText('Sí, eliminar')
    fireEvent.click(confirmButton)
    await expect(result).resolves.toBe(true)

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

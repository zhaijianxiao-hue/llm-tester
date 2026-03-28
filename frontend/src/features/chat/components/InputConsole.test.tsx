import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InputConsole } from './InputConsole'

describe('InputConsole', () => {
  it('calls onSend when Enter is pressed without Shift if input is non-empty', () => {
    const onSend = vi.fn()

    render(
      <InputConsole
        value="Speak, stage"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
        isLoading={false}
        canSend={true}
        providerLabel="openai"
        modelLabel="None"
        temperatureLabel="0.7"
      />,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: /player speech console/i }), {
      key: 'Enter',
      code: 'Enter',
    })

    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('does not call onSend on Enter when input is empty', () => {
    const onSend = vi.fn()

    render(
      <InputConsole
        value="   "
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
        isLoading={false}
        canSend={false}
        providerLabel="openai"
        modelLabel="gpt-test"
        temperatureLabel="0.7"
      />,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: /player speech console/i }), {
      key: 'Enter',
      code: 'Enter',
    })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('keeps the send button enabled for missing provider or model when input is non-empty', () => {
    render(
      <InputConsole
        value="Speak, stage"
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        isLoading={false}
        canSend={true}
        providerLabel="None"
        modelLabel="gpt-test"
        temperatureLabel="0.7"
      />,
    )

    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('calls onSend when the button is clicked for non-empty input', () => {
    const onSend = vi.fn()

    render(
      <InputConsole
        value="Speak, stage"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
        isLoading={false}
        canSend={true}
        providerLabel="None"
        modelLabel="None"
        temperatureLabel="0.7"
      />,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('blocks Enter and button click when disabled is true', () => {
    const onSend = vi.fn()

    render(
      <InputConsole
        value="Speak, stage"
        onChange={vi.fn()}
        onSend={onSend}
        disabled
        isLoading={false}
        canSend={true}
        providerLabel="openai"
        modelLabel="gpt-test"
        temperatureLabel="0.7"
      />,
    )

    const textbox = screen.getByRole('textbox', { name: /player speech console/i })
    const button = screen.getByRole('button')

    fireEvent.keyDown(textbox, {
      key: 'Enter',
      code: 'Enter',
    })
    fireEvent.click(button)

    expect(onSend).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
  })

  it('blocks Enter and button click when loading is true', () => {
    const onSend = vi.fn()

    render(
      <InputConsole
        value="Speak, stage"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
        isLoading
        canSend={true}
        providerLabel="openai"
        modelLabel="gpt-test"
        temperatureLabel="0.7"
      />,
    )

    const textbox = screen.getByRole('textbox', { name: /player speech console/i })
    const button = screen.getByRole('button')

    fireEvent.keyDown(textbox, {
      key: 'Enter',
      code: 'Enter',
    })
    fireEvent.click(button)

    expect(onSend).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
  })
})

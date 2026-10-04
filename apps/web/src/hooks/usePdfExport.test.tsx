/**
 * usePdfExport functionality tests — Pro gating, session handling, and the
 * UPGRADE_REQUIRED server fallback for the §14 PDF download.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PaywallContext } from '../components/paywall/PaywallContext'
import { usePdfExport } from './usePdfExport'
import { getSession } from '../lib/services/authService'
import { downloadReportPdf, ReportPdfError } from '../lib/services/reportService'

vi.mock('../lib/services/authService', () => ({ getSession: vi.fn() }))
vi.mock('../lib/services/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/services/reportService')>()
  return { ...actual, downloadReportPdf: vi.fn() }
})

const mockGetSession = vi.mocked(getSession)
const mockDownload = vi.mocked(downloadReportPdf)

function wrapperFor(tier: string, openUpgradeModal: (f: string) => void) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <PaywallContext.Provider value={{ tier, openUpgradeModal, openHardGate: () => undefined }}>
        {children}
      </PaywallContext.Provider>
    )
  }
}

describe('usePdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('free tier: PDF is unlocked during beta', async () => {
    mockGetSession.mockResolvedValue(null)
    mockDownload.mockResolvedValue(undefined)
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('free', openModal),
    })

    expect(result.current.isLocked).toBe(false)
    act(() => result.current.exportPdf())
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('tok-1', undefined))
    expect(openModal).not.toHaveBeenCalled()
  })

  it('pro tier without a token (demo route): no-op', () => {
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport(null), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    expect(openModal).not.toHaveBeenCalled()
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it('pro tier with a session: beta downloads with the report token alone', async () => {
    mockGetSession.mockResolvedValue({ access_token: 'jwt-1' } as never)
    mockDownload.mockResolvedValue(undefined)
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', vi.fn()),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith('tok-1', undefined)
    })
    expect(result.current.exporting).toBe(false)
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('server UPGRADE_REQUIRED (stale local tier) opens the modal', async () => {
    mockGetSession.mockResolvedValue({ access_token: 'jwt-1' } as never)
    mockDownload.mockRejectedValue(new ReportPdfError('UPGRADE_REQUIRED', 'Pro feature'))
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => {
      expect(openModal).toHaveBeenCalledWith('pdf')
    })
  })

  it('signed out (no session): downloads a live report PDF in beta', async () => {
    mockGetSession.mockResolvedValue(null)
    mockDownload.mockResolvedValue(undefined)
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('tok-1', undefined))
    expect(openModal).not.toHaveBeenCalled()
  })
})

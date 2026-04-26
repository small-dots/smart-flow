import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ToastManager.css'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const idRef = useRef(0)

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const confirm = useCallback((message, subMessage = '') => {
    return new Promise(resolve => {
      setConfirmState({ message, subMessage, resolve })
    })
  }, [])

  const handleConfirm = (result) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <ToastContext.Provider value={{ show, dismiss, confirm }}>
      {children}
      {createPortal(
        <>
          <div className="toast-stack">
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>
          {confirmState && (
            <ConfirmDialog
              message={confirmState.message}
              subMessage={confirmState.subMessage}
              onConfirm={() => handleConfirm(true)}
              onCancel={() => handleConfirm(false)}
            />
          )}
        </>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

const TOAST_ICON = { success: '[OK]', error: '[ERR]', info: '[INF]', warning: '[!]' }

function ToastItem({ toast, onDismiss }) {
  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">{TOAST_ICON[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  )
}

function ConfirmDialog({ message, subMessage, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-pixel-corner tl" />
        <div className="confirm-pixel-corner tr" />
        <div className="confirm-pixel-corner bl" />
        <div className="confirm-pixel-corner br" />
        <div className="confirm-icon-wrap">[!]</div>
        <div className="confirm-body">
          <div className="confirm-message">{message}</div>
          {subMessage && <div className="confirm-sub">{subMessage}</div>}
        </div>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>取消</button>
          <button className="btn btn-danger" onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  )
}

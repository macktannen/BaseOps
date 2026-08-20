import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', danger = false }: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, padding: '20px'
    }}>
      <div className="card" style={{ width: '420px', maxWidth: '100%', padding: '24px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onCancel}>{cancelText}</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

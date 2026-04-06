import { useState, useEffect } from 'react';
import './UserManagementModal.css';

export default function UserManagementModal({ isOpen, onClose, users, adminId, currentSocketId, onPermissionChange, socket, sessionId }) {
  const [usersLocal, setUsersLocal] = useState(users || []);

  useEffect(() => {
    if (users) {
      setUsersLocal(users);
    }
  }, [users]);

  if (!isOpen) return null;

  const handlePermissionToggle = (targetSocketId) => {
    const currentUser = usersLocal.find(u => u.socketId === targetSocketId);
    if (currentUser) {
      const newPermission = currentUser.permission === 'viewer' ? 'editor' : 'viewer';
      
      // Emit socket event to update permission
      socket.emit('setUserPermission', { sessionId, targetSocketId, permission: newPermission });
      
      // Update local state immediately for UI feedback
      const updatedUsers = usersLocal.map(u =>
        u.socketId === targetSocketId ? { ...u, permission: newPermission } : u
      );
      setUsersLocal(updatedUsers);
      onPermissionChange(targetSocketId, newPermission);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 User Permissions</h2>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {usersLocal.length === 0 ? (
            <div className="no-users">No active users</div>
          ) : (
            <div className="users-list">
              {usersLocal.map((user) => {
                const isCurrentUser = user.socketId === currentSocketId;
                const isAdmin = user.socketId === adminId;

                return (
                  <div key={user.socketId} className={`user-item ${isCurrentUser ? 'current-user' : ''}`}>
                    <div className="user-info">
                      <div className="user-avatar">
                        {isAdmin ? '👑' : '👤'}
                      </div>
                      <div className="user-details">
                        <div className="user-name-row">
                          <div className="user-name">
                            {isCurrentUser ? 'You' : user.username || `User ${user.socketId.slice(0, 6)}`}
                            {isAdmin && <span className="admin-badge">Admin</span>}
                          </div>
                          <div className="user-handle">{user.username || `Guest-${user.socketId.slice(0, 6)}`}</div>
                        </div>

                      </div>
                    </div>

                    <div className="user-permission">
                      {isAdmin ? (
                        <span className="permission-fixed">
                          {user.permission === 'editor' ? '✏️ Editor' : '👁️ Viewer'}
                        </span>
                      ) : (
                        <label className="permission-switch-small">
                          <input
                            type="checkbox"
                            checked={user.permission === 'editor'}
                            onChange={() => handlePermissionToggle(user.socketId)}
                            className="permission-switch-input-small"
                          />
                          <span className="permission-switch-slider-small">
                            {user.permission === 'editor' ? '✏️ Editor' : '👁️ Viewer'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p className="modal-info">
            {usersLocal.filter(u => u.permission === 'editor').length} editor{usersLocal.filter(u => u.permission === 'editor').length !== 1 ? 's' : ''},
            {' '}
            {usersLocal.filter(u => u.permission === 'viewer').length} viewer{usersLocal.filter(u => u.permission === 'viewer').length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

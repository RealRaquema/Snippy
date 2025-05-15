import React from 'react';

const CopySessionLink = ({ sessionId }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Session link copied!');
  };

  return <button onClick={copyToClipboard}>Copy Session Link</button>;
};

export default CopySessionLink;

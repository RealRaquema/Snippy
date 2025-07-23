import React, { useState } from 'react';

const CopySessionLink = ({ sessionId }) => {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    const url = `${window.location.origin}/code/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button className="copy-link-btn" onClick={copyToClipboard} title="Copy session link">
      {copied ? 'Copied!' : 'Copy Session Link'}
    </button>
  );
};

export default CopySessionLink;

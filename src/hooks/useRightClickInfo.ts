import { useState, useEffect } from 'react';

const RIGHT_CLICK_INFO_KEY = 'rightClickInfoDismissed';

export const useRightClickInfo = () => {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Check if the message was already dismissed
    const isDismissed = localStorage.getItem(RIGHT_CLICK_INFO_KEY) === 'true';
    setShowMessage(!isDismissed);
  }, []);

  const dismissMessage = () => {
    localStorage.setItem(RIGHT_CLICK_INFO_KEY, 'true');
    setShowMessage(false);
  };

  return {
    showMessage,
    dismissMessage
  };
}; 
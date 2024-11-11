import React, { useState, useEffect } from 'react';
import logo from './images/logo.png';

function App() {
  const [timers, setTimers] = useState([]);
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    function connectWebSocket() {
      console.log('Attempting to connect WebSocket...');
      const websocket = new WebSocket(`wss://${window.location.host}`);

      websocket.onopen = () => {
        console.log('WebSocket Connected Successfully');
        setConnectionStatus('연결됨');
        retryCount = 0;
        websocket.send(JSON.stringify({ type: 'get-timers' }));
      };

      websocket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        console.log('Connection attempt to:', window.location.host);
        setConnectionStatus('연결 오류');
      };

      websocket.onclose = () => {
        console.log('WebSocket Disconnected');
        setConnectionStatus('연결 끊김');

        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying connection... Attempt ${retryCount}`);
          setTimeout(connectWebSocket, 3000);
        }
      };

      websocket.onmessage = (event) => {
        console.log('Received message:', event.data);
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init-timers':
              console.log('Initializing timers:', data.timers);
              setTimers(data.timers || []);
              break;
            case 'timer-updated':
              setTimers(prev => prev.map(timer =>
                timer.id === data.timer.id ? data.timer : timer
              ));
              break;
            case 'timer-added':
              setTimers(prev => [...prev, data.timer]);
              break;
            case 'timer-deleted':
              setTimers(prev => prev.filter(timer => timer.id !== data.id));
              break;
            default:
              console.log('Unknown message type:', data.type);
              break;
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      setWs(websocket);

      return websocket;
    }

    const websocket = connectWebSocket();

    return () => {
      websocket.close();
    };
  }, []);

  const startTimer = (id, minutes) => {
    if (ws?.readyState === WebSocket.OPEN) {
      const endTime = new Date(currentTime.getTime() + minutes * 60000);
      ws.send(JSON.stringify({
        type: 'start-timer',
        id,
        minutes,
        endTime: endTime.toISOString()
      }));
    } else {
      console.error('WebSocket is not connected');
      setConnectionStatus('연결 오류 - 새로고침 필요');
    }
  };

  const resetTimer = (id) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'reset-timer',
        id
      }));
    } else {
      console.error('WebSocket is not connected');
      setConnectionStatus('연결 오류 - 새로고침 필요');
    }
  };

  const deleteTimer = (id) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'delete-timer',
        id
      }));
      setTimers(prev => prev.filter(timer => timer.id !== id));
    } else {
      console.error('WebSocket is not connected');
      setConnectionStatus('연결 오류 - 새로고침 필요');
    }
  };

  const addNewRow = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      let newId = 1;
      const usedIds = new Set(timers.map(t => t.id));
      while (usedIds.has(newId)) {
        newId++;
      }

      ws.send(JSON.stringify({
        type: 'add-timer',
        timer: {
          id: newId,
          minutes: '',
          timeLeft: 0,
          isRunning: false,
          endTime: null
        }
      }));
    } else {
      console.error('WebSocket is not connected');
      setConnectionStatus('연결 오류 - 새로고침 필요');
    }
  };

  const getRowClassName = (timer) => {
    if (!timer.isRunning) return '';
    if (timer.timeLeft <= 60) return 'animate-pulse bg-red-300 font-bold';
    if (timer.timeLeft <= 180) return 'animate-pulse bg-yellow-300 font-bold';
    return '';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEndTime = (date) => {
    if (!date) return '--:--:--';
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <>
      <div className={`flex items-center justify-between mb-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        <div className="w-1/3">
          <img src={logo} alt="오로치 로고" className="h-32 w-32 object-contain" />
        </div>
        <div className="w-1/3">
          <h1 className="text-4xl font-bold text-center">오로치 채광 타이머</h1>
        </div>
        <div className="w-1/3">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg mr-4 bg-gray-200 dark:bg-gray-700"
            >
              {darkMode ? '라이트 모드' : '다크 모드'}
            </button>
            <div className="text-2xl font-semibold">
              현재 시간: {currentTime.toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </div>
          </div>
        </div>
      </div>
      <div className={`container mx-auto p-4 ${darkMode ? 'dark bg-gray-800 text-white' : 'bg-white text-black'}`}>
        {/* 나머지 타이머 목록 테이블 */}
      </div>
    </>
  );
}

export default App;

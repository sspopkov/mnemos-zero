import React from 'react';
import ReactDOM from 'react-dom/client';
import { getApiMessages } from './api';

function App() {
  const [messages, setMessages] = React.useState<Array<{ id: number; text: string }>>([]);

  React.useEffect(() => {
    getApiMessages().then((response) => {
      setMessages(response.data);
    });
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Web app</h1>
      <p>Минимальный frontend, который получает данные через OpenAPI → Orval.</p>

      <ul>
        {messages.map((message) => (
          <li key={message.id}>{message.text}</li>
        ))}
      </ul>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

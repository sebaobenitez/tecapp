import { useState } from 'react';
import { Sparkles, Send, Bot, User, AlertTriangle } from 'lucide-react';
import { ia } from '../services/api';

const SUGERENCIAS = [
  '¿Qué productos se vendieron más esta semana?',
  '¿Qué productos tengo en riesgo de quedar sin stock?',
  'Dame un resumen del desempeño del negocio',
  '¿Cuál es mi horario de mayor venta?',
  '¿Qué productos deberían tener un precio mayor?',
];

export default function IAPage() {
  const [mensajes, setMensajes] = useState([]);
  const [pregunta, setPregunta] = useState('');
  const [loading, setLoading] = useState(false);
  const [sinClave, setSinClave] = useState(false);

  const enviar = async (texto) => {
    const q = texto || pregunta.trim();
    if (!q) return;
    setMensajes(m => [...m, { rol: 'user', texto: q }]);
    setPregunta('');
    setLoading(true);
    setSinClave(false);

    try {
      const res = await ia.analizar(q);
      setMensajes(m => [...m, { rol: 'assistant', texto: res.respuesta }]);
    } catch (e) {
      if (e.error?.includes('CLAUDE_API_KEY') || e.error?.includes('no configurada')) {
        setSinClave(true);
        setMensajes(m => [...m, { rol: 'error', texto: e.error }]);
      } else {
        setMensajes(m => [...m, { rol: 'error', texto: e.error || 'Error al conectar con la IA' }]);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} color="#818cf8" /> Asistente IA
          </div>
          <div className="page-subtitle">Hacé preguntas sobre tu negocio · Análisis inteligente con Claude</div>
        </div>
      </div>

      {sinClave && (
        <div className="card" style={{ borderColor: '#f59e0b', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>Clave de API no configurada</div>
            <div style={{ color: '#94a3b8' }}>
              Para usar la IA, abrí el archivo <code style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>backend/.env</code> y agregá tu clave de Anthropic:
              <div style={{ marginTop: 6, background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.82rem', color: '#818cf8' }}>
                CLAUDE_API_KEY=sk-ant-...
              </div>
              Conseguila gratis en <span style={{ color: '#818cf8' }}>console.anthropic.com</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="card" style={{ minHeight: 360, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {mensajes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem 0' }}>
            <Sparkles size={40} color="#4f46e5" style={{ opacity: 0.5 }} />
            <div style={{ color: '#64748b', textAlign: 'center' }}>
              <p style={{ fontWeight: 500 }}>Asistente inteligente para tu negocio</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Analizá ventas, stock y clientes con IA</p>
            </div>
          </div>
        ) : (
          mensajes.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.rol === 'user' ? '#334155' : m.rol === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.rol === 'user' ? <User size={14} /> : <Bot size={14} color={m.rol === 'error' ? '#ef4444' : '#818cf8'} />}
              </div>
              <div style={{
                background: m.rol === 'user' ? '#334155' : m.rol === 'error' ? 'rgba(239,68,68,0.08)' : '#0f172a',
                border: `1px solid ${m.rol === 'error' ? '#ef444433' : '#334155'}`,
                borderRadius: 10, padding: '0.65rem 0.9rem', fontSize: '0.875rem', lineHeight: 1.6,
                color: m.rol === 'error' ? '#f87171' : '#f1f5f9', flex: 1, whiteSpace: 'pre-wrap',
              }}>
                {m.texto}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} color="#818cf8" /></div>
            <div style={{ display: 'flex', gap: '4px', padding: '0.5rem 0' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `pulse 1s ${i * 0.2}s infinite alternate`, opacity: 0.7 }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {mensajes.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {SUGERENCIAS.map(s => (
            <button key={s} onClick={() => enviar(s)} style={{
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 999, padding: '0.35rem 0.85rem', color: '#818cf8', cursor: 'pointer',
              fontSize: '0.8rem', transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input className="input" placeholder="Preguntá algo sobre tu negocio..." value={pregunta} onChange={e => setPregunta(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()} disabled={loading} />
        <button className="btn-primary" onClick={() => enviar()} disabled={loading || !pregunta.trim()} style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>

      <style>{`@keyframes pulse { from { opacity: 0.4 } to { opacity: 1 } }`}</style>
    </div>
  );
}

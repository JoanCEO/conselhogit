import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { XIcon, SpinnerIcon } from './Icons'
import styles from './ReviewModal.module.css'

const GENRES = ['RPG', 'FPS', 'Ação', 'Aventura', 'Estratégia', 'Terror', 'Corrida', 'Esporte', 'Plataforma', 'Puzzle', 'Simulação', 'MOBA', 'MMO', 'Outros']
const TYPES = ['Online', 'Multiplayer', 'História', 'Co-op', 'Competitivo', 'Battle Royale']

export default function ReviewModal({ onClose, existing }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    game_name: existing?.game_name || '',
    game_type: existing?.game_type || '',
    genre: existing?.genre || '',
    rating: existing?.rating || '',
    comment: existing?.comment || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.game_name || !form.game_type || !form.genre || !form.rating || !form.comment) {
      setError('Preencha todos os campos.'); return
    }
    const rating = parseFloat(form.rating)
    if (isNaN(rating) || rating < 0 || rating > 10) {
      setError('Nota deve ser entre 0 e 10.'); return
    }
    setLoading(true); setError('')

    const payload = { ...form, rating, user_id: user.id }
    let res
    if (existing) {
      res = await supabase.from('reviews').update(payload).eq('id', existing.id)
    } else {
      res = await supabase.from('reviews').insert(payload)
    }

    setLoading(false)
    if (res.error) { setError(res.error.message); return }
    onClose(true)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{existing ? 'Editar avaliação' : 'Nova avaliação'}</h2>
          <button className={styles.closeBtn} onClick={() => onClose()}>
            <XIcon size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Nome do jogo</label>
            <input
              type="text" placeholder="Ex: Elden Ring"
              value={form.game_name} onChange={e => set('game_name', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Tipo</label>
              <select value={form.game_type} onChange={e => set('game_type', e.target.value)} className={styles.select}>
                <option value="">Selecionar</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Gênero</label>
              <select value={form.genre} onChange={e => set('genre', e.target.value)} className={styles.select}>
                <option value="">Selecionar</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Nota (0 – 10)</label>
            <input
              type="number" min="0" max="10" step="0.5"
              placeholder="Ex: 8.5"
              value={form.rating} onChange={e => set('rating', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Avaliação</label>
            <textarea
              placeholder="Escreva sua avaliação..."
              value={form.comment} onChange={e => set('comment', e.target.value)}
              className={styles.textarea} rows={5}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <SpinnerIcon size={18} /> : existing ? 'Salvar alterações' : 'Publicar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}

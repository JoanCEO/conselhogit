import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { XIcon, SpinnerIcon } from './Icons'
import styles from './ReviewModal.module.css'

const GENRES = ['RPG', 'FPS', 'Ação', 'Aventura', 'Estratégia', 'Terror', 'Corrida', 'Esporte', 'Plataforma', 'Puzzle', 'Simulação', 'MOBA', 'MMO', 'Outros']
const TYPES = ['Online', 'Multiplayer', 'História', 'Co-op', 'Competitivo', 'Battle Royale']

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY

export default function ReviewModal({ onClose, existing }) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    game_name: existing?.game_name || '',
    game_image: existing?.game_image || '',
    game_type: existing?.game_type || '',
    genre: existing?.genre || '',
    rating: existing?.rating || '',
    comment: existing?.comment || '',
    platinado: existing?.platinado ?? false,
  })

  const [gameSearch, setGameSearch] = useState(existing?.game_name || '')
  const [games, setGames] = useState([])
  const [searchingGames, setSearchingGames] = useState(false)
  const [showGames, setShowGames] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (gameSearch.trim().length < 2 || gameSearch === form.game_name) {
      setGames([])
      setShowGames(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGames(true)

        const response = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameSearch.trim())}&page_size=5`
        )

        if (!response.ok) {
          throw new Error('Erro ao buscar jogos')
        }

        const data = await response.json()

        setGames(data.results || [])
        setShowGames(true)
      } catch (err) {
        console.error('Erro ao buscar jogos:', err)
        setGames([])
        setShowGames(false)
      } finally {
        setSearchingGames(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [gameSearch, form.game_name])

  const selectGame = (game) => {
    set('game_name', game.name)
    set('game_image', game.background_image || '')
    setGameSearch(game.name)
    setGames([])
    setShowGames(false)
  }

  const handleSubmit = async () => {
    if (!form.game_name || !form.game_type || !form.genre || !form.rating || !form.comment) {
      setError('Preencha todos os campos.')
      return
    }

    const rating = parseFloat(form.rating)

    if (isNaN(rating) || rating < 0 || rating > 10) {
      setError('Nota deve ser entre 0 e 10.')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      ...form,
      rating,
      user_id: user.id
    }

    let res

    if (existing) {
      res = await supabase
        .from('reviews')
        .update(payload)
        .eq('id', existing.id)
    } else {
      res = await supabase
        .from('reviews')
        .insert(payload)
    }

    setLoading(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    onClose(true)
  }

  return (
    <div
      className={styles.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>

        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>
            {existing ? 'Editar avaliação' : 'Nova avaliação'}
          </h2>

          <button
            className={styles.closeBtn}
            onClick={() => onClose()}
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className={styles.body}>

          <div className={styles.field}>
            <label>Nome do jogo</label>

            <div className={styles.gameSearch}>
              <input
                type="text"
                placeholder="Ex: Elden Ring"
                value={gameSearch}
                onChange={e => {
                  setGameSearch(e.target.value)
                  set('game_name', '')
                }}
                onFocus={() => {
                  if (games.length > 0) {
                    setShowGames(true)
                  }
                }}
                className={styles.input}
                autoComplete="off"
              />

              {searchingGames && (
                <span className={styles.gameSearchLoading}>
                  Buscando...
                </span>
              )}

              {showGames && games.length > 0 && (
                <div className={styles.gameResults}>
                  {games.map(game => (
                    <button
                      key={game.id}
                      type="button"
                      className={styles.gameResult}
                      onClick={() => selectGame(game)}
                    >
                      {game.background_image ? (
                        <img
                          src={game.background_image}
                          alt=""
                          className={styles.gameImage}
                        />
                      ) : (
                        <div className={styles.gameImagePlaceholder} />
                      )}

                      <div className={styles.gameInfo}>
                        <strong>{game.name}</strong>

                        {game.released && (
                          <span>
                            {game.released.slice(0, 4)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Tipo</label>

              <select
                value={form.game_type}
                onChange={e => set('game_type', e.target.value)}
                className={styles.select}
              >
                <option value="">Selecionar</option>

                {TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Gênero</label>

              <select
                value={form.genre}
                onChange={e => set('genre', e.target.value)}
                className={styles.select}
              >
                <option value="">Selecionar</option>

                {GENRES.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Nota (0 – 10)</label>

            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="Ex: 8.5"
              value={form.rating}
              onChange={e => set('rating', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Platinei este jogo?</label>

            <div className={styles.platinumOptions}>
              <button
                type="button"
                className={`${styles.platinumBtn} ${form.platinado === true ? styles.platinumActive : ''}`}
                onClick={() => set('platinado', true)}
              >
                Sim
              </button>

              <button
                type="button"
                className={`${styles.platinumBtn} ${form.platinado === false ? styles.platinumActive : ''}`}
                onClick={() => set('platinado', false)}
              >
                Não
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Avaliação</label>

            <textarea
              placeholder="Escreva sua avaliação..."
              value={form.comment}
              onChange={e => set('comment', e.target.value)}
              className={styles.textarea}
              rows={5}
            />
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <SpinnerIcon size={18} />
              : existing
                ? 'Salvar alterações'
                : 'Publicar avaliação'}
          </button>

        </div>
      </div>
    </div>
  )
}

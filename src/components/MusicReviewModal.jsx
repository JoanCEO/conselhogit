import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { XIcon, SpinnerIcon } from './Icons'
import styles from './MusicReviewModal.module.css'

const GENRES = [
  'Pop',
  'Rock',
  'Hip Hop',
  'Rap',
  'R&B',
  'Eletrônica',
  'Funk',
  'Sertanejo',
  'MPB',
  'Samba',
  'Pagode',
  'Forró',
  'Reggae',
  'Jazz',
  'Blues',
  'Clássica',
  'Metal',
  'Indie',
  'Punk',
  'K-Pop',
  'J-Pop',
  'Lo-fi',
  'Gospel',
  'Outro'
]

export default function MusicReviewModal({
  onClose,
  existing
}) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    music_name: existing?.music_name || '',
    artist_name: existing?.artist_name || '',
    album_name: existing?.album_name || '',
    music_image: existing?.music_image || '',
    genre: existing?.genre || '',
    rating: existing?.rating || '',
    comment: existing?.comment || ''
  })

  const [musicSearch, setMusicSearch] = useState(
    existing?.music_name || ''
  )

  const [musicResults, setMusicResults] = useState([])
  const [searchingMusic, setSearchingMusic] =
    useState(false)
  const [showResults, setShowResults] =
    useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value
    }))
  }

  useEffect(() => {
    if (
      musicSearch.trim().length < 2 ||
      musicSearch.trim() === form.music_name
    ) {
      setMusicResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingMusic(true)

        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            musicSearch.trim()
          )}&media=music&entity=song&limit=8&country=BR`
        )

        if (!response.ok) {
          throw new Error(
            'Erro ao buscar músicas'
          )
        }

        const data = await response.json()

        setMusicResults(data.results || [])
        setShowResults(true)
      } catch (err) {
        console.error(
          'Erro ao buscar músicas:',
          err
        )

        setMusicResults([])
        setShowResults(false)
      } finally {
        setSearchingMusic(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [musicSearch, form.music_name])

  const selectMusic = music => {
    setForm(current => ({
      ...current,
      music_name:
        music.trackName || '',
      artist_name:
        music.artistName || '',
      album_name:
        music.collectionName || '',
      music_image:
        music.artworkUrl100
          ? music.artworkUrl100.replace(
              '100x100',
              '600x600'
            )
          : ''
    }))

    setMusicSearch(
      music.trackName || ''
    )

    setMusicResults([])
    setShowResults(false)
  }

  const handleSubmit = async () => {
    if (
      !form.music_name ||
      !form.artist_name ||
      !form.genre ||
      !form.rating ||
      !form.comment
    ) {
      setError(
        'Preencha todos os campos.'
      )
      return
    }

    const rating = parseFloat(form.rating)

    if (
      isNaN(rating) ||
      rating < 0 ||
      rating > 10
    ) {
      setError(
        'Nota deve ser entre 0 e 10.'
      )
      return
    }

    if (!user) {
      setError(
        'Você precisa estar logado para publicar.'
      )
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      music_name: form.music_name,
      artist_name: form.artist_name,
      album_name: form.album_name || null,
      music_image: form.music_image || null,
      genre: form.genre,
      rating,
      comment: form.comment,
      user_id: user.id
    }

    let res

    if (existing) {
      res = await supabase
        .from('music_reviews')
        .update(payload)
        .eq('id', existing.id)
    } else {
      res = await supabase
        .from('music_reviews')
        .insert(payload)
    }

    setLoading(false)

    if (res.error) {
      console.error(
        'Erro ao salvar avaliação musical:',
        res.error
      )

      setError(res.error.message)
      return
    }

    onClose(true)
  }

  return (
    <div
      className={styles.overlay}
      onClick={e =>
        e.target === e.currentTarget &&
        onClose()
      }
    >
      <div className={styles.modal}>

        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>
            {existing
              ? 'Editar avaliação musical'
              : 'Nova avaliação musical'}
          </h2>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => onClose()}
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className={styles.body}>

          <div className={styles.field}>
            <label>
              Nome da música
            </label>

            <div
              className={styles.musicSearch}
            >
              <input
                type="text"
                placeholder="Ex: Blinding Lights"
                value={musicSearch}
                onChange={e => {
                  const value =
                    e.target.value

                  setMusicSearch(value)

                  setForm(current => ({
                    ...current,
                    music_name: '',
                    artist_name: '',
                    album_name: '',
                    music_image: ''
                  }))
                }}
                onFocus={() => {
                  if (
                    musicResults.length > 0
                  ) {
                    setShowResults(true)
                  }
                }}
                className={styles.input}
                autoComplete="off"
              />

              {searchingMusic && (
                <span
                  className={
                    styles.musicSearchLoading
                  }
                >
                  Buscando...
                </span>
              )}

              {showResults &&
                musicResults.length > 0 && (
                  <div
                    className={
                      styles.musicResults
                    }
                  >
                    {musicResults.map(
                      music => (
                        <button
                          key={
                            music.trackId
                          }
                          type="button"
                          className={
                            styles.musicResult
                          }
                          onClick={() =>
                            selectMusic(
                              music
                            )
                          }
                        >
                          {music.artworkUrl100 ? (
                            <img
                              src={
                                music.artworkUrl100
                              }
                              alt=""
                              className={
                                styles.musicImage
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles.musicImagePlaceholder
                              }
                            />
                          )}

                          <div
                            className={
                              styles.musicInfo
                            }
                          >
                            <strong>
                              {
                                music.trackName
                              }
                            </strong>

                            <span>
                              {
                                music.artistName
                              }
                            </span>

                            {music.collectionName && (
                              <small>
                                {
                                  music.collectionName
                                }
                              </small>
                            )}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className={styles.field}>
            <label>
              Artista
            </label>

            <input
              type="text"
              placeholder="Artista"
              value={form.artist_name}
              onChange={e =>
                set(
                  'artist_name',
                  e.target.value
                )
              }
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>
              Álbum
            </label>

            <input
              type="text"
              placeholder="Álbum"
              value={form.album_name}
              onChange={e =>
                set(
                  'album_name',
                  e.target.value
                )
              }
              className={styles.input}
            />
          </div>

          {form.music_image && (
            <div
              className={
                styles.selectedMusic
              }
            >
              <img
                src={form.music_image}
                alt=""
                className={
                  styles.selectedMusicImage
                }
              />

              <div
                className={
                  styles.selectedMusicInfo
                }
              >
                <strong>
                  {form.music_name}
                </strong>

                <span>
                  {form.artist_name}
                </span>

                {form.album_name && (
                  <small>
                    {form.album_name}
                  </small>
                )}
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label>
              Gênero musical
            </label>

            <select
              value={form.genre}
              onChange={e =>
                set(
                  'genre',
                  e.target.value
                )
              }
              className={styles.select}
            >
              <option value="">
                Selecionar
              </option>

              {GENRES.map(genre => (
                <option
                  key={genre}
                  value={genre}
                >
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>
              Nota (0 – 10)
            </label>

            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="Ex: 8.5"
              value={form.rating}
              onChange={e =>
                set(
                  'rating',
                  e.target.value
                )
              }
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>
              Avaliação
            </label>

            <textarea
              placeholder="Escreva sua avaliação sobre a música..."
              value={form.comment}
              onChange={e =>
                set(
                  'comment',
                  e.target.value
                )
              }
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
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <SpinnerIcon size={18} />
            ) : existing ? (
              'Salvar alterações'
            ) : (
              'Publicar avaliação'
            )}
          </button>

        </div>
      </div>
    </div>
  )
}
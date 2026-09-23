import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { PlusIcon, SearchIcon, SpinnerIcon } from '../components/Icons'
import MusicReviewModal from '../components/MusicReviewModal'
import styles from './MusicPage.module.css'

const GENRES = [
  'Todos',
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

export default function MusicPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('Todos')

  const [showModal, setShowModal] = useState(false)

  const loadReviews = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      setError('')

      const { data, error } = await supabase
        .from('music_reviews')
        .select('*')
        .order('created_at', {
          ascending: false
        })

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        setReviews([])
        return
      }

      const userIds = [
        ...new Set(
          data
            .map(review => review.user_id)
            .filter(Boolean)
        )
      ]

      let profiles = []

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'id, username, avatar_url'
            )
            .in('id', userIds)

        if (profileError) {
          throw profileError
        }

        profiles = profileData || []
      }

      const profileMap = new Map(
        profiles.map(profile => [
          profile.id,
          profile
        ])
      )

      const reviewsWithProfiles =
        data.map(review => ({
          ...review,
          username:
            profileMap.get(
              review.user_id
            )?.username || 'Usuário',
          avatar_url:
            profileMap.get(
              review.user_id
            )?.avatar_url || ''
        }))

      setReviews(reviewsWithProfiles)
    } catch (err) {
      console.error(
        'Erro ao carregar avaliações musicais:',
        err
      )

      setError(
        'Não foi possível carregar as avaliações musicais.'
      )
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadReviews()

    const channel = supabase
      .channel('music-reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'music_reviews'
        },
        payload => {
          console.log(
            'Nova avaliação musical recebida:',
            payload.new
          )

          loadReviews(false)
        }
      )
      .subscribe(status => {
        console.log(
          'Realtime music_reviews:',
          status
        )
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredReviews = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase()

    return reviews.filter(review => {
      const matchesSearch =
        !normalizedSearch ||
        review.music_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        review.artist_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        review.album_name
          ?.toLowerCase()
          .includes(normalizedSearch)

      const matchesGenre =
        genre === 'Todos' ||
        review.genre === genre

      return (
        matchesSearch &&
        matchesGenre
      )
    })
  }, [reviews, search, genre])

  const handleModalClose = updated => {
    setShowModal(false)

    if (updated) {
      loadReviews(false)
    }
  }

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            O CONSELHO BLAZE
          </span>

          <h1 className={styles.title}>
            Avaliações Musicais
          </h1>

          <p className={styles.subtitle}>
            Descubra o que o Conselho acha
            das músicas que estão na sua
            playlist.
          </p>
        </div>

        {user && (
          <button
            type="button"
            className={styles.createButton}
            onClick={() =>
              setShowModal(true)
            }
          >
            <PlusIcon size={17} />
            Nova avaliação
          </button>
        )}
      </div>

      <div className={styles.filters}>

        <div className={styles.searchBox}>
          <SearchIcon size={17} />

          <input
            type="text"
            placeholder="Buscar por música, artista ou álbum..."
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() =>
                setSearch('')
              }
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.genreFilters}>
          {GENRES.map(item => (
            <button
              key={item}
              type="button"
              className={`${styles.genreButton} ${
                genre === item
                  ? styles.genreActive
                  : ''
              }`}
              onClick={() =>
                setGenre(item)
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resultsHeader}>
        <span>
          {filteredReviews.length}{' '}
          {filteredReviews.length === 1
            ? 'avaliação'
            : 'avaliações'}
        </span>

        {(search || genre !== 'Todos') && (
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => {
              setSearch('')
              setGenre('Todos')
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>
          <SpinnerIcon size={24} />

          <span>
            Carregando avaliações...
          </span>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => loadReviews()}
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <SearchIcon size={22} />
          </div>

          <h2>
            Nenhuma avaliação encontrada
          </h2>

          <p>
            {search || genre !== 'Todos'
              ? 'Tente alterar sua busca ou os filtros.'
              : 'Ainda não existem avaliações musicais. Seja o primeiro a publicar uma.'}
          </p>

          {user && (
            <button
              type="button"
              className={styles.emptyButton}
              onClick={() =>
                setShowModal(true)
              }
            >
              <PlusIcon size={16} />
              Criar avaliação
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredReviews.map(review => (
            <article
              key={review.id}
              className={styles.card}
              onClick={() =>
                navigate(`/musica/${review.id}`)
              }
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (
                  e.key === 'Enter' ||
                  e.key === ' '
                ) {
                  navigate(
                    `/musica/${review.id}`
                  )
                }
              }}
            >
              <div
                className={styles.coverWrapper}
              >
                {review.music_image ? (
                  <img
                    src={review.music_image}
                    alt=""
                    className={styles.cover}
                  />
                ) : (
                  <div
                    className={
                      styles.coverPlaceholder
                    }
                  >
                    <span>
                      {(
                        review.music_name ||
                        '?'
                      )[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.cardBody}>

                <div className={styles.cardTop}>
                  <span
                    className={styles.genre}
                  >
                    {review.genre}
                  </span>

                  <strong
                    className={styles.rating}
                  >
                    {Number(
                      review.rating
                    ).toFixed(1)}
                  </strong>
                </div>

                <h2
                  className={styles.musicName}
                  title={review.music_name}
                >
                  {review.music_name}
                </h2>

                <p
                  className={styles.artist}
                  title={review.artist_name}
                >
                  {review.artist_name}
                </p>

                {review.album_name && (
                  <p
                    className={styles.album}
                    title={review.album_name}
                  >
                    {review.album_name}
                  </p>
                )}

                <p className={styles.comment}>
                  {review.comment}
                </p>

                <div
                  className={styles.footer}
                >
                  <div
                    className={
                      styles.author
                    }
                  >
                    <div
                      className={
                        styles.avatar
                      }
                    >
                      {review.avatar_url ? (
                        <img
                          src={
                            review.avatar_url
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          {(
                            review.username ||
                            '?'
                          )[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.authorInfo
                      }
                    >
                      <strong>
                        {review.username}
                      </strong>

                      <span>
                        {new Date(
                          review.created_at
                        ).toLocaleDateString(
                          'pt-BR'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </article>
          ))}
        </div>
      )}

      {user && (
        <button
          type="button"
          className={
            styles.mobileCreateButton
          }
          onClick={() =>
            setShowModal(true)
          }
          aria-label="Nova avaliação musical"
        >
          <PlusIcon size={22} />
        </button>
      )}

      {showModal && (
        <MusicReviewModal
          onClose={handleModalClose}
        />
      )}

    </div>
  )
}
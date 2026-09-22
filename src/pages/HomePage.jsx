import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ReviewCard from '../components/ReviewCard'
import ReviewModal from '../components/ReviewModal'
import { SearchIcon, SpinnerIcon, PlusIcon } from '../components/Icons'
import styles from './HomePage.module.css'

const FILTERS = [
  'Todos',
  'Online',
  'Multiplayer',
  'História',
  'Co-op',
  'Competitivo',
  'Battle Royale',
  'RPG',
  'FPS',
  'Ação',
  'Aventura',
  'Estratégia',
  'Terror',
  'Corrida'
]

export default function HomePage() {
  const [reviews, setReviews] = useState([])
  const [users, setUsers] = useState([])
  const [reactions, setReactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)

  const GAME_TYPES = [
    'Online',
    'Multiplayer',
    'História',
    'Co-op',
    'Competitivo',
    'Battle Royale'
  ]

  const GENRES = [
    'RPG',
    'FPS',
    'Ação',
    'Aventura',
    'Estratégia',
    'Terror',
    'Corrida'
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)

    // =========================
    // BUSCAR AVALIAÇÕES
    // =========================

    let q = supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id(username, full_name, avatar_url),
        comments(id),
        reactions(id)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'Todos') {
      if (GAME_TYPES.includes(filter)) {
        q = q.eq('game_type', filter)
      } else if (GENRES.includes(filter)) {
        q = q.eq('genre', filter)
      }
    }

    const { data, error } = await q

    if (error) {
      console.error('Erro ao buscar avaliações:', error)
      setReviews([])
    }

    const mapped = (data || []).map(r => ({
      ...r,
      username: r.profiles?.username,
      full_name: r.profiles?.full_name,
      avatar_url: r.profiles?.avatar_url,
      comment_count: r.comments?.length || 0,
    }))

    const searchTerm = search.trim().toLowerCase()

    const filteredReviews = searchTerm
      ? mapped.filter(r =>
          r.game_name?.toLowerCase().includes(searchTerm) ||
          r.username?.toLowerCase().includes(searchTerm) ||
          r.full_name?.toLowerCase().includes(searchTerm)
        )
      : mapped

    setReviews(filteredReviews)

    // =========================
    // BUSCAR USUÁRIOS
    // =========================

    if (searchTerm) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(
          `username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`
        )
        .limit(10)

      if (profileError) {
        console.error('Erro ao buscar usuários:', profileError)
        setUsers([])
      } else {
        setUsers(profileData || [])
      }
    } else {
      setUsers([])
    }

    // =========================
    // BUSCAR REAÇÕES
    // =========================

    const ids = (data || []).map(r => r.id)

    if (ids.length) {
      const { data: reacts } = await supabase
        .from('reactions')
        .select('*')
        .in('review_id', ids)

      setReactions(reacts || [])
    } else {
      setReactions([])
    }

    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        fetchData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        fetchData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        fetchData
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchData])

  return (
    <div>

      {/* PESQUISA */}

      <div className={styles.searchBar}>
        <SearchIcon size={18} />

        <input
          type="text"
          placeholder="Buscar por jogo ou usuário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* USUÁRIOS */}

      {search.trim() && users.length > 0 && (
        <div className={styles.userResults}>

          <div className={styles.resultsTitle}>
            Usuários
          </div>

          {users.map(user => (
            <a
              key={user.id}
              href={`/profile/${user.id}`}
              className={styles.userCard}
            >
              <div className={styles.userAvatar}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                  />
                ) : (
                  <span>
                    {(user.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div className={styles.userInfo}>
                <strong>
                  {user.username || 'Usuário'}
                </strong>

                {user.full_name && (
                  <span>
                    {user.full_name}
                  </span>
                )}
              </div>
            </a>
          ))}

        </div>
      )}

      {/* FILTROS */}

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${
              filter === f ? styles.active : ''
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* AVALIAÇÕES */}

      {loading ? (
        <div className={styles.loading}>
          <SpinnerIcon size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma avaliação encontrada.</p>
          <span>
            Seja o primeiro a avaliar um jogo.
          </span>
        </div>
      ) : (
        <div className={styles.grid}>
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              reactions={reactions.filter(
                rx => rx.review_id === r.id
              )}
              onReactionChange={fetchData}
            />
          ))}
        </div>
      )}

      {/* BOTÃO MOBILE - NOVA AVALIAÇÃO */}

      <button
        type="button"
        className={styles.mobileCreateButton}
        onClick={() => setShowReviewModal(true)}
        aria-label="Nova avaliação"
        title="Nova avaliação"
      >
        <PlusIcon size={22} />
      </button>

      {/* MODAL DE NOVA AVALIAÇÃO */}

      {showReviewModal && (
        <ReviewModal
          onClose={created => {
            setShowReviewModal(false)

            if (created) {
              fetchData()
            }
          }}
        />
      )}

    </div>
  )
}
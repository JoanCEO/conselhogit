import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ReviewCard from '../components/ReviewCard'
import { SearchIcon, SpinnerIcon } from '../components/Icons'
import styles from './HomePage.module.css'

const FILTERS = ['Todos', 'Online', 'Multiplayer', 'História', 'Co-op', 'Competitivo', 'Battle Royale', 'RPG', 'FPS', 'Ação', 'Aventura', 'Estratégia', 'Terror', 'Corrida']

export default function HomePage() {
  const [reviews, setReviews] = useState([])
  const [reactions, setReactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')

  const GAME_TYPES = ['Online', 'Multiplayer', 'História', 'Co-op', 'Competitivo', 'Battle Royale']
  const GENRES = ['RPG', 'FPS', 'Ação', 'Aventura', 'Estratégia', 'Terror', 'Corrida']

  const fetchData = useCallback(async () => {
    let q = supabase
      .from('reviews')
      .select(`*, profiles:user_id(username, full_name, avatar_url), comments(id), reactions(id)`)
      .order('created_at', { ascending: false })

    if (filter !== 'Todos') {
      if (GAME_TYPES.includes(filter)) q = q.eq('game_type', filter)
      else if (GENRES.includes(filter)) q = q.eq('genre', filter)
    }
    if (search) q = q.ilike('game_name', `%${search}%`)

    const { data } = await q
    const mapped = (data || []).map(r => ({
      ...r,
      username: r.profiles?.username,
      full_name: r.profiles?.full_name,
      avatar_url: r.profiles?.avatar_url,
      comment_count: r.comments?.length || 0,
    }))
    setReviews(mapped)

    const ids = (data || []).map(r => r.id)
    if (ids.length) {
      const { data: reacts } = await supabase.from('reactions').select('*').in('review_id', ids)
      setReactions(reacts || [])
    } else setReactions([])
    setLoading(false)
  }, [filter, search])

  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  useEffect(() => {
    const channel = supabase.channel('realtime-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  return (
    <div>
      <div className={styles.searchBar}>
        <SearchIcon size={18} />
        <input
          type="text"
          placeholder="Buscar por jogo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}><SpinnerIcon size={28} /></div>
      ) : reviews.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma avaliação encontrada.</p>
          <span>Seja o primeiro a avaliar um jogo.</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              reactions={reactions.filter(rx => rx.review_id === r.id)}
              onReactionChange={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  )
}
